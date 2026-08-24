import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  NOME_RECURSO,
  PLANOS,
  RECURSOS_COMPARATIVO,
  planoLibera,
  precoBR,
} from "@/lib/acesso/planos";

/**
 * Tabela comparativa dos três planos.
 *
 * As células saem de `planoLibera`, a mesma função que as rotas usam. Uma
 * tabela escrita à mão desencontraria da regra real no primeiro plano que
 * mudasse, e o pior erro aqui é prometer o que o sistema não entrega.
 *
 * Verde para incluído e cinza para ausente, e não o vermelho do exemplo:
 * `--destructive` é idêntico a `--primary` neste tema, então um X vermelho
 * teria exatamente a cor da marca e da coluna em destaque. O que deveria
 * significar "não tem" acabaria lendo como ênfase.
 */

const Marca = ({ tem }: { tem: boolean }) =>
  tem ? (
    <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
      <Check aria-hidden className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
      <span className="sr-only">Incluído</span>
    </span>
  ) : (
    <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-muted">
      <X aria-hidden className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={3} />
      <span className="sr-only">Não incluído</span>
    </span>
  );

interface TabelaComparativaProps {
  /** Realça a coluna do plano que libera a tela onde a tabela aparece. */
  destacar?: string;
}

export const TabelaComparativa = ({ destacar }: TabelaComparativaProps) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] border-collapse text-sm">
      <caption className="sr-only">Comparação entre os planos da Vetrex</caption>
      <thead>
        <tr>
          <th scope="col" className="w-[40%] pb-4 pr-4 text-left align-bottom">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Benefícios
            </span>
          </th>
          {PLANOS.map((plano) => {
            const realce = destacar ? plano.id === destacar : plano.destaque;
            return (
              <th
                key={plano.id}
                scope="col"
                className={cn(
                  "border-b-2 px-3 pb-4 text-center align-bottom",
                  realce ? "border-primary" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "block font-display text-sm font-semibold",
                    realce ? "text-primary" : "text-foreground",
                  )}
                >
                  {plano.nome.replace("Vetrex ", "")}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {precoBR(plano.preco)}
                  <span className="block">{plano.periodo}</span>
                </span>
              </th>
            );
          })}
        </tr>
      </thead>

      <tbody>
        {RECURSOS_COMPARATIVO.map((recurso, i) => (
          <tr
            key={recurso}
            className={cn("border-b border-border", i % 2 === 1 && "bg-muted/20")}
          >
            <th scope="row" className="py-3 pr-4 text-left font-normal text-foreground">
              {NOME_RECURSO[recurso]}
            </th>
            {PLANOS.map((plano) => (
              <td key={plano.id} className="px-3 py-3">
                <Marca tem={planoLibera(plano.id, recurso)} />
              </td>
            ))}
          </tr>
        ))}

        {/* O bônus não é uma área do sistema, então vive fora da matriz. */}
        <tr
          className={cn(
            "border-b border-border",
            RECURSOS_COMPARATIVO.length % 2 === 1 && "bg-muted/20",
          )}
        >
          <th scope="row" className="py-3 pr-4 text-left font-normal text-foreground">
            Diagnóstico em call, gratuito
          </th>
          {PLANOS.map((plano) => (
            <td key={plano.id} className="px-3 py-3">
              <Marca tem={Boolean(plano.bonus)} />
            </td>
          ))}
        </tr>

        <tr>
          <th scope="row" className="py-3 pr-4 text-left font-normal text-foreground">
            Cobrança
          </th>
          {PLANOS.map((plano) => (
            <td
              key={plano.id}
              className="px-3 py-3 text-center text-xs font-medium text-muted-foreground"
            >
              {plano.periodo === "pagamento único" ? "Uma vez só" : "Mensal"}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);
