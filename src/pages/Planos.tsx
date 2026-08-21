import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Infinity as InfinityIcon, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { CartaoPlano } from "@/components/acesso/CartaoPlano";
import { useAcesso } from "@/components/layout/AcessoProvider";
import { PLANOS } from "@/lib/acesso/planos";
import { supabase } from "@/integrations/supabase/client";

const PERGUNTAS = [
  {
    q: "O que eu consigo fazer sem pagar nada?",
    a: "Mexer na calculadora um tanto por dia, em qualquer um dos seis marketplaces, o suficiente para preencher o formulário duas vezes. Dá para ver quanto sobra de um produto e conferir se o seu preço está de pé. O que não dá é salvar produto, comparar plataformas lado a lado, usar a precificação reversa, o painel ou o RPA.",
  },
  {
    q: "As alterações grátis voltam quando?",
    a: "Todo dia, na virada da meia-noite no horário de Brasília.",
  },
  {
    q: "Qual a diferença entre o mensal e o vitalício?",
    a: "As ferramentas são as mesmas. No mensal você paga enquanto usar. No vitalício paga uma vez e continua recebendo as atualizações, incluindo as tabelas de taxa quando um marketplace muda a regra.",
  },
  {
    q: "As taxas ficam desatualizadas?",
    a: "Elas vivem no sistema, não numa planilha sua. Quando um marketplace muda uma regra, seus produtos salvos são recalculados e você recebe o aviso com a margem de antes e a de depois.",
  },
  {
    q: "Posso cancelar o mensal quando quiser?",
    a: "Pode. Sem multa e sem fidelidade. O acesso segue até o fim do período que você já pagou.",
  },
];

interface Assinatura {
  tipo: string;
  expiraEm: string | null;
}

/** Busca o plano em vigor, só para quem já tem acesso liberado. */
function useAssinatura(ativo: boolean) {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!ativo) {
      setCarregando(false);
      return;
    }
    let vivo = true;
    (async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("plan_type, expires_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!vivo) return;
      if (error) console.error("Erro ao buscar a assinatura:", error);

      const agora = Date.now();
      const valida = (data ?? []).find(
        (p) => p.plan_type === "lifetime" || (p.expires_at && new Date(p.expires_at).getTime() > agora),
      );
      // Sem compra e com acesso liberado quer dizer admin.
      setAssinatura(valida ? { tipo: valida.plan_type, expiraEm: valida.expires_at } : null);
      setCarregando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [ativo]);

  return { assinatura, carregando };
}

const dataBR = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const diasAte = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

/** Tela de quem já paga: confirma o acesso e sai da frente. */
const PlanoAtivo = () => {
  const { assinatura, carregando } = useAssinatura(true);

  if (carregando) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const vitalicio = assinatura?.tipo === "lifetime";
  const nome = !assinatura ? "Acesso de administrador" : vitalicio ? "Vitalício" : "Mensal";
  const dias = assinatura?.expiraEm ? diasAte(assinatura.expiraEm) : null;
  const acabando = dias !== null && dias <= 7;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-primary/30 bg-card p-8 text-center"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </span>

        <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">
          Seu plano está ativo
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Todas as ferramentas estão liberadas na sua conta.
        </p>

        <div className="mt-7 space-y-3 border-t border-border pt-6 text-left">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Plano</span>
            <span className="text-sm font-medium text-foreground">{nome}</span>
          </div>

          {vitalicio && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Validade</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                <InfinityIcon className="h-4 w-4 text-primary" />
                Sem prazo
              </span>
            </div>
          )}

          {assinatura?.expiraEm && !vitalicio && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Renova em</span>
              <span
                className={
                  "text-sm font-medium " + (acabando ? "text-primary" : "text-foreground")
                }
              >
                {dataBR(assinatura.expiraEm)}
                {dias !== null && dias > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({dias} {dias === 1 ? "dia" : "dias"})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Planos = () => {
  const { ilimitado, restantes, limite, carregando } = useAcesso();

  if (carregando) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Quem já paga não precisa ver preço nem argumento de venda de novo.
  if (ilimitado) return <PlanoAtivo />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {restantes} de {limite} alterações grátis hoje
        </span>

        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          Destrave a plataforma inteira
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          A calculadora grátis mostra quanto sobra em um produto. O plano mostra em qual
          marketplace vale a pena vender ele, por quanto anunciar e quais dos seus produtos estão
          dando prejuízo agora.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-12 grid gap-6 md:grid-cols-2"
      >
        {PLANOS.map((plano) => (
          <CartaoPlano key={plano.id} plano={plano} />
        ))}
      </motion.div>

      <div className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <Check className="h-4 w-4 shrink-0 text-primary" />
        Garantia de 7 dias. Se não achar dinheiro que estava escapando, devolvemos.
      </div>

      <section className="mt-16">
        <h2 className="font-display text-xl font-semibold text-foreground">Dúvidas comuns</h2>
        <dl className="mt-6 space-y-6">
          {PERGUNTAS.map(({ q, a }) => (
            <div key={q} className="border-l-2 border-border pl-4">
              <dt className="text-sm font-semibold text-foreground">{q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
};

export default Planos;
