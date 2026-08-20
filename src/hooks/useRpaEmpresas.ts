import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EmpresaRpa } from "@/lib/rpa/pdf";

export type SlotEmpresa = 1 | 2;

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

interface EstadoEmpresas {
  empresas: Record<SlotEmpresa, EmpresaRpa | null>;
  carregando: boolean;
  salvar: (slot: SlotEmpresa, empresa: EmpresaRpa) => Promise<boolean>;
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

export function useRpaEmpresas(): EstadoEmpresas {
  const [empresas, setEmpresas] = useState<Record<SlotEmpresa, EmpresaRpa | null>>({
    1: null,
    2: null,
  });
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
      .eq("user_email", session.user.email);

    if (error) {
      console.error("Erro ao carregar dados da empresa:", error);
    } else {
      const novas: Record<SlotEmpresa, EmpresaRpa | null> = { 1: null, 2: null };
      for (const linha of (data ?? []) as Array<Record<string, unknown>>) {
        const slot = Number(linha.slot) === 2 ? 2 : 1;
        novas[slot] = daLinha(linha);
      }
      setEmpresas(novas);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  const salvar = async (slot: SlotEmpresa, empresa: EmpresaRpa): Promise<boolean> => {
    if (!empresa.razaoSocial.trim() || !empresa.cnpj.trim()) {
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
        slot,
        razao_social: empresa.razaoSocial.trim(),
        cnpj: empresa.cnpj.trim(),
        endereco: empresa.endereco.trim(),
        municipio: empresa.municipio.trim(),
        uf: empresa.uf.trim().toUpperCase(),
        cep: empresa.cep.trim(),
        inscricao_estadual: empresa.inscricaoEstadual.trim(),
        descricao_servico: empresa.descricaoServico.trim(),
        reter_inss: empresa.reterInss,
        reter_irrf: empresa.reterIrrf,
        reter_iss: empresa.reterIss,
        iss_percent: empresa.issPercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_email,slot" },
    );

    if (error) {
      console.error("Erro ao salvar dados da empresa:", error);
      toast.error("Erro ao salvar os dados da empresa.");
      return false;
    }

    setEmpresas((prev) => ({ ...prev, [slot]: empresa }));
    toast.success(`Dados da Empresa ${slot} salvos.`);
    return true;
  };

  return { empresas, carregando, salvar };
}
