import { motion } from "framer-motion";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { CartaoPlano } from "@/components/acesso/CartaoPlano";
import { useAcesso } from "@/components/layout/AcessoProvider";
import { PLANOS } from "@/lib/acesso/planos";

const PERGUNTAS = [
  {
    q: "O que eu consigo fazer sem pagar nada?",
    a: "Dois cálculos por dia, em qualquer um dos seis marketplaces. Dá para ver quanto sobra de um produto e conferir se o seu preço está de pé. O que não dá é salvar produto, comparar plataformas lado a lado, usar a precificação reversa, o painel ou o RPA.",
  },
  {
    q: "Os cálculos grátis voltam quando?",
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

const Planos = () => {
  const { ilimitado, restantes, limite, carregando } = useAcesso();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        {!carregando && ilimitado ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Seu acesso está liberado
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {carregando
              ? "Conferindo seu acesso"
              : `${restantes} de ${limite} cálculos grátis hoje`}
          </span>
        )}

        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {ilimitado ? "Você já tem tudo liberado" : "Destrave a plataforma inteira"}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {ilimitado
            ? "Seu plano está ativo e todas as ferramentas estão disponíveis. Esta página fica aqui caso você queira trocar de plano."
            : "A calculadora grátis mostra quanto sobra em um produto. O plano mostra em qual marketplace vale a pena vender ele, por quanto anunciar e quais dos seus produtos estão dando prejuízo agora."}
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

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-primary" />
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
