import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface CustoExtra {
  id: string;
  nome: string;
  valor: number;
}

interface EstadoCustosExtras {
  custos: CustoExtra[];
  carregando: boolean;
  criar: (nome: string, valor: number) => Promise<boolean>;
  remover: (id: string) => Promise<void>;
}

/** Embalagens, etiquetas e afins que o lojista salva para reaproveitar. */
export function useCustosExtras(): EstadoCustosExtras {
  const [custos, setCustos] = useState<CustoExtra[]>([]);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    setCarregando(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setCustos([]);
      setCarregando(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("custos_extras")
      .select("id, nome, valor")
      .eq("user_email", session.user.email)
      .order("nome");

    if (error) {
      console.error("Erro ao carregar custos adicionais:", error);
      setCustos([]);
    } else {
      setCustos(
        ((data ?? []) as Array<Record<string, unknown>>).map((l) => ({
          id: String(l.id),
          nome: String(l.nome),
          valor: Number(l.valor) || 0,
        })),
      );
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  const criar = async (nome: string, valor: number): Promise<boolean> => {
    if (!nome.trim()) {
      toast.error("Dê um nome ao custo, como “Caixa 20x15”.");
      return false;
    }
    if (!Number.isFinite(valor) || valor < 0) {
      toast.error("O valor precisa ser igual ou maior que zero.");
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      toast.error("Usuário não autenticado.");
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("custos_extras").insert({
      user_email: session.user.email,
      nome: nome.trim(),
      valor,
    });

    if (error) {
      console.error("Erro ao salvar custo adicional:", error);
      toast.error("Erro ao salvar o custo.");
      return false;
    }
    await buscar();
    return true;
  };

  const remover = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("custos_extras").delete().eq("id", id);
    if (error) {
      console.error("Erro ao remover custo adicional:", error);
      toast.error("Erro ao remover o custo.");
      return;
    }
    setCustos((prev) => prev.filter((c) => c.id !== id));
  };

  return { custos, carregando, criar, remover };
}
