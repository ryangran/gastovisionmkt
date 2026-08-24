import { ArrowRight, Check, Gift, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  assinaturaPeloWhatsApp,
  linkAssinatura,
  precoBR,
  type Plano,
} from "@/lib/acesso/planos";
import { linkWhatsApp } from "@/lib/contato";
import { mensagemAssinatura } from "@/lib/acesso/planos";

interface CartaoPlanoProps {
  plano: Plano;
  /** Versão enxuta, para caber dentro de diálogo. */
  compacto?: boolean;
}

export const CartaoPlano = ({ plano, compacto }: CartaoPlanoProps) => {
  const noWhatsApp = assinaturaPeloWhatsApp(plano);
  const itens = compacto ? plano.itens.slice(0, 4) : plano.itens;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6",
        plano.destaque ? "border-primary bg-card" : "border-border bg-card/60",
      )}
    >
      {plano.destaque && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Mais escolhido
        </span>
      )}

      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {plano.nome}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        {plano.precoDe && (
          <span className="text-sm text-muted-foreground line-through">
            {precoBR(plano.precoDe)}
          </span>
        )}
        <span className="font-display text-4xl font-bold text-foreground">
          {precoBR(plano.preco)}
        </span>
      </div>
      <p className="mt-1 text-sm text-primary">{plano.periodo}</p>
      <p className="mt-3 text-sm text-muted-foreground">{plano.chamada}</p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {itens.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
            {item}
          </li>
        ))}
        {compacto && plano.itens.length > itens.length && (
          <li className="pl-6 text-sm text-muted-foreground">
            e mais {plano.itens.length - itens.length} itens
          </li>
        )}
      </ul>

      {/* Bônus fora da lista de propósito: é brinde, não funcionalidade, e
          misturado nos bullets some no meio dos outros. */}
      {plano.bonus && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium text-foreground">
          <Gift className="h-4 w-4 shrink-0 text-primary" />
          {plano.bonus}
        </p>
      )}

      <Button
        asChild
        size="lg"
        variant={plano.destaque ? "default" : "outline"}
        className="mt-6 w-full gap-2"
      >
        <a href={linkAssinatura(plano)} target="_blank" rel="noreferrer">
          {noWhatsApp && <MessageCircle className="h-4 w-4" />}
          {/* Sem o prefixo: "Assinar Vetrex Essencial" repete a marca que já
              está no topo do cartão. */}
          Assinar {plano.nome.replace("Vetrex ", "")}
          {!noWhatsApp && <ArrowRight className="h-4 w-4" />}
        </a>
      </Button>

      {/* Quando o checkout já existe, a conversa continua sendo uma saída para
          quem tem dúvida antes de pagar. */}
      {!noWhatsApp && (
        <a
          href={linkWhatsApp(mensagemAssinatura(plano))}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Prefiro falar antes no WhatsApp
        </a>
      )}
    </div>
  );
};
