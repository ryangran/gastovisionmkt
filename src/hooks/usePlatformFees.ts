import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TAXAS_PADRAO } from "@/lib/pricing";
import type { PlatformKey } from "@/lib/pricing/types";
import type { TaxasPorPlataforma } from "@/lib/pricing/recalcular";

export interface VersaoTaxa {
  id: string;
  platform: PlatformKey;
  version: string;
  created_at: string;
  created_by: string | null;
}

interface EstadoTaxas {
  /** Só as plataformas com versão ativa no banco. Vazio = tudo pelo código. */
  taxas: TaxasPorPlataforma;
  versoes: Partial<Record<PlatformKey, VersaoTaxa>>;
  carregando: boolean;
  recarregar: () => void;
}

/**
 * Lê as taxas ativas do banco. O que não estiver lá cai para a tabela do
 * código: uma falha de rede não pode fazer o app calcular preço errado.
 */
export function usePlatformFees(): EstadoTaxas {
  const [taxas, setTaxas] = useState<TaxasPorPlataforma>({});
  const [versoes, setVersoes] = useState<Partial<Record<PlatformKey, VersaoTaxa>>>({});
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    setCarregando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("platform_fees")
      .select("id, platform, version, config, created_at, created_by")
      .eq("active", true);

    if (error) {
      console.error("Erro ao carregar taxas; usando as tabelas do código:", error);
      setTaxas({});
      setVersoes({});
    } else {
      const novasTaxas: TaxasPorPlataforma = {};
      const novasVersoes: Partial<Record<PlatformKey, VersaoTaxa>> = {};
      for (const linha of (data ?? []) as Array<Record<string, unknown>>) {
        const chave = linha.platform as PlatformKey;
        if (!(chave in TAXAS_PADRAO)) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (novasTaxas as any)[chave] = linha.config;
        novasVersoes[chave] = {
          id: String(linha.id),
          platform: chave,
          version: String(linha.version),
          created_at: String(linha.created_at),
          created_by: linha.created_by ? String(linha.created_by) : null,
        };
      }
      setTaxas(novasTaxas);
      setVersoes(novasVersoes);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  return { taxas, versoes, carregando, recarregar: () => void buscar() };
}
