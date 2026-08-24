import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calculator, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartaoPlano } from "@/components/acesso/CartaoPlano";
import { ORDEM_PLANOS, PLANOS, type Plano } from "@/lib/acesso/planos";

interface BloqueioPlanoProps {
  titulo: string;
  /** O que a ferramenta resolve. Vale mais que dizer que está bloqueada. */
  descricao: string;
  /** Três frases curtas do que a pessoa veria aqui dentro. */
  amostra?: readonly string[];
  /** O plano mais barato que libera esta área. */
  planoNecessario?: Plano;
}

/** Tela de quem ainda não assinou, no lugar de uma ferramenta paga. */
export const BloqueioPlano = ({
  titulo,
  descricao,
  amostra,
  planoNecessario,
}: BloqueioPlanoProps) => {
  // Mostra do plano que resolve para cima. Oferecer um plano que não libera
  // esta tela seria vender a coisa errada para quem chegou aqui.
  const suficientes = planoNecessario
    ? PLANOS.filter(
        (p) =>
          ORDEM_PLANOS.indexOf(p.id) >= ORDEM_PLANOS.indexOf(planoNecessario.id),
      )
    : PLANOS;

  return (
  <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
        <Lock className="h-6 w-6 text-primary" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold text-foreground sm:text-3xl">
        {titulo}
      </h1>
      {planoNecessario && (
        <p className="mt-3 text-sm font-medium text-primary">
          Disponível a partir do {planoNecessario.nome}
        </p>
      )}
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        {descricao}
      </p>

      {amostra && amostra.length > 0 && (
        <ul className="mx-auto mt-7 max-w-md space-y-2.5 text-left">
          {amostra.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </motion.div>

    <div
      className={
        suficientes.length > 1
          ? "mt-10 grid gap-5 md:grid-cols-2"
          : "mx-auto mt-10 grid max-w-md gap-5"
      }
    >
      {suficientes.map((plano) => (
        <CartaoPlano key={plano.id} plano={plano} compacto />
      ))}
    </div>

    <div className="mt-8 flex flex-col items-center gap-3">
      <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
        <Link to="/planos">
          Ver a comparação completa
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/calculadora">
          <Calculator className="h-4 w-4" />
          Voltar para a calculadora grátis
        </Link>
      </Button>
    </div>
  </div>
  );
};
