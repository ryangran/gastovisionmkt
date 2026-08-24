import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { planoDaCompra, validadeEmIso } from "./planoDaCompra.ts";

/**
 * Senha aleatória de verdade, tirada do gerador criptográfico do runtime.
 *
 * Antes havia uma constante "Gasto123" aqui. Como o repositório é público,
 * qualquer pessoa sabia a senha inicial de toda conta criada, e bastava o
 * email de um cliente para entrar na conta dele. Nenhuma regra de RLS protege
 * contra alguém que entra como a própria pessoa.
 */
function senhaAleatoria(tamanho = 20): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * Confere o segredo combinado com a Cakto.
 *
 * Sem isso, qualquer pessoa que descubra a URL desta função consegue mandar um
 * payload forjado e se dar um Deluxe vitalício. A função cria usuário e grava
 * compra sem nenhuma autenticação.
 *
 * É opcional de propósito: enquanto CAKTO_WEBHOOK_SECRET não estiver
 * configurado, a função segue aceitando tudo e apenas avisa no log. Exigir o
 * segredo de imediato faria toda compra real ser recusada até alguém lembrar
 * de preencher a variável — o remédio seria pior que a doença.
 *
 * Para ativar: defina CAKTO_WEBHOOK_SECRET nos secrets da Edge Function e
 * acrescente ?secret=VALOR na URL do webhook dentro do painel da Cakto, ou
 * mande o mesmo valor no cabeçalho x-webhook-secret.
 */
function segredoConfere(req: Request): boolean {
  const esperado = Deno.env.get("CAKTO_WEBHOOK_SECRET");
  if (!esperado) {
    console.warn(
      "CAKTO_WEBHOOK_SECRET não configurado: o webhook está aberto a qualquer origem.",
    );
    return true;
  }

  const url = new URL(req.url);
  const recebido = req.headers.get("x-webhook-secret") ?? url.searchParams.get("secret") ?? "";

  // Comparação de tempo constante, para não vazar o segredo pelo tempo de
  // resposta a quem for tentando caractere por caractere.
  if (recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i += 1) {
    diferenca |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diferenca === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!segredoConfere(req)) {
    console.error("Webhook recusado: segredo inválido.");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    console.log("Cakto webhook received:", JSON.stringify(body));

    const b = body as Record<string, unknown>;
    // Cakto wraps all purchase data inside a "data" key
    const data = (b?.data ?? {}) as Record<string, unknown>;
    const customer = (data?.customer ?? {}) as Record<string, unknown>;

    const email = String(customer?.email ?? "").toLowerCase().trim();
    const transactionId = String(data?.id ?? "unknown");
    const status = String(data?.status ?? "").toLowerCase();

    if (!email) {
      console.error("No email in payload");
      return new Response(
        JSON.stringify({ error: "Email not found in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["approved", "completed", "paid"].includes(status)) {
      console.log(`Transaction ${transactionId} status "${status}" — skipping`);
      return new Response(
        JSON.stringify({ message: "Transaction not approved, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Evitar processar a mesma transação duas vezes
    if (transactionId !== "unknown") {
      const { data: existing } = await supabase
        .from("purchases")
        .select("id")
        .eq("transaction_id", transactionId)
        .maybeSingle();

      if (existing) {
        console.log(`Transaction ${transactionId} already processed — skipping`);
        return new Response(
          JSON.stringify({ message: "Already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { plano: planType, origem } = planoDaCompra(data);
    console.log(`Plano identificado: ${planType} (por ${origem}) para ${email}`);
    if (origem === "padrao") {
      // Nenhum sinal bateu. Registra como Essencial e grita no log, porque a
      // pessoa pagou por algo que não conseguimos identificar e alguém precisa
      // olhar antes de ela reclamar.
      console.error(
        `ATENÇÃO: compra sem plano reconhecido para ${email}. Payload: ${JSON.stringify(data)}`,
      );
    }

    // Tentar criar usuário; se já existe, continuar normalmente
    let isNewUser = false;
    const password = senhaAleatoria();

    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const msg = createError.message ?? "";
      if (
        createError.status === 422 ||
        msg.includes("already been registered") ||
        msg.includes("already exists")
      ) {
        console.log(`User ${email} already exists — updating plan only`);
      } else {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      isNewUser = true;
      console.log(`New user created: ${email}`);

      // A senha gerada acima é aleatória e ninguém a conhece, nem quem comprou.
      // Este email é a única porta de entrada dela: o link leva para /auth, que
      // detecta a recuperação e pede a senha nova. Se o envio falhar, ainda
      // resta o "Esqueci minha senha" na tela de login.
      const site = Deno.env.get("SITE_URL") ?? "https://vetrex.lovable.app";
      const { error: linkError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${site}/auth`,
      });
      if (linkError) {
        console.error("Falha ao enviar o link de senha para", email, linkError);
      }
    }

    // Registrar compra
    const expiresAt = validadeEmIso(planType);

    const { error: purchaseError } = await supabase.from("purchases").insert({
      user_email: email,
      transaction_id: transactionId,
      status: "approved",
      plan_type: planType,
      expires_at: expiresAt,
    });

    if (purchaseError) {
      console.error("Error inserting purchase:", purchaseError);
      return new Response(
        JSON.stringify({ error: "Failed to save purchase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `Purchase recorded — email: ${email}, plan: ${planType}, tx: ${transactionId}, expires: ${expiresAt ?? "never"}`
    );

    return new Response(
      JSON.stringify({ success: true, plan_type: planType, new_user: isNewUser }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
