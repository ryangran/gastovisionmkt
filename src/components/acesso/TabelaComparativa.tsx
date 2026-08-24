import { Check, Minus } from "lucide-react";

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
 * mudasse, e o pior tipo de erro aqui é prometer o que o sistema não entrega.
 */
export const TabelaComparativa = () => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] border-collapse text-sm">
      <caption className="sr-only">Comparação entre os planos da Vetrex</caption>
      <thead>
        <tr>
          <th scope="col" className="w-[38%] pb-4 pr-4 text-left align-bottom">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              O que está incluído
            </span>
          </th>
          {PLANOS.map((plano) => (
            <th
              key={plano.id}
              scope="col"
              className={cn(
                "border-b-2 px-3 pb-4 text-center align-bottom",
                plano.destaque ? "border-primary" : "border-border",
              )}
            >
              <span
                className={cn(
                  "block font-display text-sm font-semibold",
                  plano.destaque ? "text-primary" : "text-foreground",
                )}
              >
                {plano.nome.replace("Vetrex ", "")}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {precoBR(plano.preco)}
                <span className="block">{plano.periodo}</span>
              </span>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {RECURSOS_COMPARATIVO.map((recurso) => (
          <tr key={recurso} className="border-b border-border">
            <th scope="row" className="py-3 pr-4 text-left font-normal text-foreground">
              {NOME_RECURSO[recurso]}
            </th>
            {PLANOS.map((plano) => {
              const tem = planoLibera(plano.id, recurso);
              return (
                <td key={plano.id} className="px-3 py-3 text-center">
                  {tem ? (
                    <>
                      <Check
                        aria-hidden
                        className="mx-auto h-4 w-4 text-primary"
                        strokeWidth={2.5}
                      />
                      <span className="sr-only">Incluído</span>
                    </>
                  ) : (
                    <>
                      <Minus aria-hidden className="mx-auto h-4 w-4 text-muted-foreground/40" />
                      <span className="sr-only">Não incluído</span>
                    </>
                  )}
                </td>
              );
            })}
          </tr>
        ))}

        {/* O bônus não é uma área do sistema, então vive fora da matriz. */}
        <tr className="border-b border-border">
          <th scope="row" className="py-3 pr-4 text-left font-normal text-foreground">
            Diagnóstico em call, gratuito
          </th>
          {PLANOS.map((plano) => (
            <td key={plano.id} className="px-3 py-3 text-center">
              {plano.bonus ? (
                <>
                  <Check aria-hidden className="mx-auto h-4 w-4 text-primary" strokeWidth={2.5} />
                  <span className="sr-only">Incluído</span>
                </>
              ) : (
                <>
                  <Minus aria-hidden className="mx-auto h-4 w-4 text-muted-foreground/40" />
                  <span className="sr-only">Não incluído</span>
                </>
              )}
            </td>
          ))}
        </tr>

        <tr>
          <th scope="row" className="py-3 pr-4 text-left font-normal text-foreground">
            Cobrança
          </th>
          {PLANOS.map((plano) => (
            <td key={plano.id} className="px-3 py-3 text-center text-xs text-muted-foreground">
              {plano.periodo === "pagamento único" ? "Uma vez só" : "Mensal"}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);
