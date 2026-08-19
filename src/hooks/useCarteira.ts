import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { agregarCarteira, type ProdutoSalvo, type ResumoCarteira } from "@/lib/carteira";

interface EstadoCarteira {
  produtos: ProdutoSalvo[];
  resumo: ResumoCarteira;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
}

const RESUMO_VAZIO = agregarCarteira([]);

export function useCarteira(): EstadoCarteira {
  const [produtos, setProdutos] = useState<ProdutoSalvo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setProdutos([]);
      setCarregando(false);
      setErro("Sessão expirada. Entre novamente para ver sua carteira.");
      return;
    }

    // select("*") em vez de nomear colunas: linhas antigas podem não ter todas
    // as colunas novas, e agregarCarteira já trata campo ausente.
    const { data, error } = await supabase
      .from("saved_calculations")
      .select("*")
      .eq("user_email", session.user.email)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar carteira:", error);
      setErro("Não foi possível carregar seus produtos.");
      setProdutos([]);
    } else {
      setProdutos((data ?? []) as unknown as ProdutoSalvo[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  return {
    produtos,
    resumo: produtos.length ? agregarCarteira(produtos) : RESUMO_VAZIO,
    carregando,
    erro,
    recarregar: () => void buscar(),
  };
}
