import { createContext, useContext, type ReactNode } from "react";
import { usePlatformFees } from "@/hooks/usePlatformFees";
import type { TaxasPorPlataforma } from "@/lib/pricing/recalcular";

const TaxasContext = createContext<TaxasPorPlataforma>({});

/**
 * Uma única leitura das taxas ativas para o app inteiro. Sem isto, cada
 * calculadora buscaria por conta própria e duas telas poderiam mostrar
 * versões diferentes da mesma taxa.
 */
export const TaxasProvider = ({ children }: { children: ReactNode }) => {
  const { taxas } = usePlatformFees();
  return <TaxasContext.Provider value={taxas}>{children}</TaxasContext.Provider>;
};

/** Taxas ativas do banco. O que não estiver aqui usa a tabela do código. */
export function useTaxas(): TaxasPorPlataforma {
  return useContext(TaxasContext);
}
