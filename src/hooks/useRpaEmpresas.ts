import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EmpresaRpa } from "@/lib/rpa/pdf";

/**
 * A tabela guarda um `slot` por questão de histórico; o sistema usa sempre o 1.
 * Cada usuário tem uma empresa, garantida pelo índice único (user_email, slot).
 */
const SLOT = 1;

export const EMPRESA_VAZIA: EmpresaRpa = {
  razaoSocial: "",
  cnpj: "",
  endereco: "",
  municipio: "",
  uf: "",
  cep: "",
  inscricaoEstadual: "",
  descricaoServico:
    "Comissão de divulgação/afiliação - Programa de Afiliados do Vendedor (Shopee)",
  reterInss: true,
  reterIrrf: true,
  reterIss: false,
  issPercent: 0,
};

interface EstadoEmpresa {
  empresa: EmpresaRpa | null;
  carregando: boolean;
  salvar: (empresa: EmpresaRpa) => Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function daLinha(l: any): EmpresaRpa {
  return {
    razaoSocial: String(l.razao_social ?? ""),
    cnpj: String(l.cnpj ?? ""),
    endereco: String(l.endereco ?? ""),
    municipio: String(l.municipio ?? ""),
    uf: String(l.uf ?? ""),
    cep: String(l.cep ?? ""),
    inscricaoEstadual: String(l.inscricao_estadual ?? ""),
    descricaoServico: String(l.descricao_servico ?? ""),
    reterInss: Boolean(l.reter_inss),
    reterIrrf: Boolean(l.reter_irrf),
    reterIss: Boolean(l.reter_iss),
    issPercent: Number(l.iss_percent) || 0,
  };
}

export function useRpaEmpresa(): EstadoEmpresa {
  const [empresa, setEmpresa] = useState<EmpresaRpa | null>(null);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setCarregando(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("rpa_empresas")
      .select("*")
      .eq("user_email", session.user.email)
      .eq("slot", SLOT)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    } else if (data) {
      setEmpresa(daLinha(data));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  const salvar = async (dados: EmpresaRpa): Promise<boolean> => {
    if (!dados.razaoSocial.trim() || !dados.cnpj.trim()) {
      toast.error("Razão social e CNPJ são obrigatórios.");
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      toast.error("Usuário não autenticado.");
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("rpa_empresas").upsert(
      {
        user_email: session.user.email,
        slot: SLOT,
        razao_social: dados.razaoSocial.trim(),
        cnpj: dados.cnpj.trim(),
        endereco: dados.endereco.trim(),
        municipio: dados.municipio.trim(),
        uf: dados.uf.trim().toUpperCase(),
        cep: dados.cep.trim(),
        inscricao_estadual: dados.inscricaoEstadual.trim(),
        descricao_servico: dados.descricaoServico.trim(),
        reter_inss: dados.reterInss,
        reter_irrf: dados.reterIrrf,
        reter_iss: dados.reterIss,
        iss_percent: dados.issPercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_email,slot" },
    );

    if (error) {
      console.error("Erro ao salvar dados da empresa:", error);
      toast.error("Erro ao salvar os dados da empresa.");
      return false;
    }

    setEmpresa(dados);
    toast.success("Dados da empresa salvos.");
    return true;
  };

  return { empresa, carregando, salvar };
}
