import { AlertTriangle, Crown, TrendingUp, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { ORDEM_PLANOS, planoPorId, precoBR } from "@/lib/acesso/planos";
import {
  distribuicao,
  estaAtiva,
  receitaRecorrente,
  situacao,
  type AssinaturaBruta,
} from "@/lib/acesso/planoAdmin";

/**
 * Faixa de indicadores do topo do painel.
 *
 * Antes eram seis cartões idênticos lado a lado, sem hierarquia: "Total" tinha
 * o mesmo peso visual que "Essencial". Aqui os quatro números que mudam
 * decisão ficam em destaque e a composição da carteira vira uma barra, que
 * responde "quanto de cada plano" mais rápido que três contadores.
 */

interface Conta extends AssinaturaBruta {
  user_id: string;
}

interface ResumoAssinaturasProps {
  contas: Conta[];
}

/** Cor de cada faixa da barra. Ordem do mais barato ao mais completo. */
const COR_PLANO: Record<string, string> = {
  essencial: "bg-slate-500",
  plus: "bg-sky-500",
  deluxe: "bg-primary",
};

const Indicador = ({
  rotulo,
  valor,
  apoio,
  icone: Icone,
  tom,
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  icone: typeof Users;
  tom?: string;
}) => (
  <div className="rounded-xl border border-border bg-card/60 p-4">
    <div className="flex items-center gap-2">
      <Icone className={cn("h-3.5 w-3.5", tom ?? "text-muted-foreground")} />
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</span>
    </div>
    <p className={cn("mt-2 font-display text-2xl font-bold tabular-nums", tom ?? "text-foreground")}>
      {valor}
    </p>
    {apoio ? <p className="mt-0.5 text-xs text-muted-foreground">{apoio}</p> : null}
  </div>
);

export const ResumoAssinaturas = ({ contas }: ResumoAssinaturasProps) => {
  const ativos = contas.filter(estaAtiva);
  const porPlano = distribuicao(contas);
  const mrr = receitaRecorrente(contas);
  const expirando = contas.filter((c) => situacao(c) === "expirando").length;
  const expirados = contas.filter((c) => situacao(c) === "expirado").length;
  const totalBarra = ORDEM_PLANOS.reduce((soma, p) => soma + porPlano[p], 0);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Contas"
          valor={String(contas.length)}
          apoio={`${ativos.length} com plano vigente`}
          icone={Users}
        />
        <Indicador
          rotulo="Receita recorrente"
          valor={precoBR(mrr)}
          apoio="Mensais vigentes, sem o Deluxe"
          icone={TrendingUp}
          tom="text-emerald-400"
        />
        <Indicador
          rotulo="Deluxe"
          valor={String(porPlano.deluxe)}
          apoio="Vitalícios, sem renovação"
          icone={Crown}
          tom="text-amber-400"
        />
        <Indicador
          rotulo="Precisa de atenção"
          valor={String(expirando + expirados)}
          apoio={`${expirando} vencendo, ${expirados} vencidos`}
          icone={AlertTriangle}
          tom={expirando + expirados > 0 ? "text-primary" : undefined}
        />
      </div>

      {/* Composição da carteira */}
      {totalBarra > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Composição da carteira
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {totalBarra} {totalBarra === 1 ? "assinante" : "assinantes"}
            </span>
          </div>

          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
            {ORDEM_PLANOS.map((id) =>
              porPlano[id] > 0 ? (
                <div
                  key={id}
                  className={COR_PLANO[id]}
                  style={{ width: `${(porPlano[id] / totalBarra) * 100}%` }}
                  title={`${planoPorId(id).nome}: ${porPlano[id]}`}
                />
              ) : null,
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {ORDEM_PLANOS.map((id) => (
              <span key={id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full", COR_PLANO[id])} />
                {planoPorId(id).nome.replace("Vetrex ", "")}
                <span className="font-medium tabular-nums text-foreground">{porPlano[id]}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
