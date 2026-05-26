import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONTHLY_CHECKOUT_IDENTIFIERS = ["vgi2b7q", "n9b89by", "32i2hyh"];
const LIFETIME_CHECKOUT_IDENTIFIERS = ["6m7kaiz"];

function identifyPlanType(data: Record<string, unknown>): "monthly" | "lifetime" {
  const offer = (data?.offer ?? {}) as Record<string, unknown>;
  const offerId = String(offer?.id ?? "");
  const offerName = String(offer?.name ?? "").toLowerCase();
  const checkoutUrl = String(data?.checkoutUrl ?? "");

  const allText = `${checkoutUrl} ${offerName} ${offerId}`.toLowerCase();

  if (LIFETIME_CHECKOUT_IDENTIFIERS.some((id) => allText.includes(id))) {
    return "lifetime";
  }
  if (
    offerName.includes("vitalício") ||
    offerName.includes("vitalicio") ||
    offerName.includes("lifetime")
  ) {
    return "lifetime";
  }

  if (MONTHLY_CHECKOUT_IDENTIFIERS.some((id) => allText.includes(id))) {
    return "monthly";
  }

  return "monthly";
}



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const planType = identifyPlanType(data);
    console.log(`Plan identified: ${planType} for ${email}`);

    // Tentar criar usuário; se já existe, continuar normalmente
    let isNewUser = false;
    const password = "Gasto123";

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
    }

    // Registrar compra
    const expiresAt =
      planType === "monthly"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

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
