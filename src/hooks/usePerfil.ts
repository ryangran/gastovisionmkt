import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AnexoSimples, RegimeTributario } from "@/lib/perfil/regimes";

export interface Perfil {
  nome: string;
  nomeLoja: string;
  telefone: string;
  fotoUrl: string | null;
  regime: RegimeTributario;
  anexo: AnexoSimples | null;
  rbt12: number | null;
  impostoPercent: number;
}

export const PERFIL_VAZIO: Perfil = {
  nome: "",
  nomeLoja: "",
  telefone: "",
  fotoUrl: null,
  regime: "nao_informado",
  anexo: null,
  rbt12: null,
  impostoPercent: 0,
};

const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function daLinha(l: any): Perfil {
  return {
    nome: String(l.nome ?? ""),
    nomeLoja: String(l.nome_loja ?? ""),
    telefone: String(l.telefone ?? ""),
    fotoUrl: l.foto_url ? String(l.foto_url) : null,
    regime: (l.regime_tributario ?? "nao_informado") as RegimeTributario,
    anexo: l.simples_anexo ? (String(l.simples_anexo) as AnexoSimples) : null,
    rbt12: l.simples_rbt12 === null || l.simples_rbt12 === undefined
      ? null
      : Number(l.simples_rbt12),
    impostoPercent: Number(l.imposto_percent) || 0,
  };
}

interface EstadoPerfil {
  perfil: Perfil | null;
  carregando: boolean;
  salvar: (perfil: Perfil) => Promise<boolean>;
  enviarFoto: (arquivo: File) => Promise<string | null>;
}

export function usePerfil(): EstadoPerfil {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
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
      .from("perfis")
      .select("*")
      .eq("user_email", session.user.email)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar o perfil:", error);
    } else if (data) {
      setPerfil(daLinha(data));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  const enviarFoto = async (arquivo: File): Promise<string | null> => {
    if (!arquivo.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return null;
    }
    if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
      toast.error("A foto precisa ter até 2 MB.");
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("Usuário não autenticado.");
      return null;
    }

    // A policy do bucket exige o id do usuário como primeira pasta.
    const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
    const caminho = `${session.user.id}/avatar.${extensao}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

    if (error) {
      console.error("Erro ao enviar a foto:", error);
      toast.error("Não foi possível enviar a foto.");
      return null;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(caminho);
    // A query string força o navegador a buscar de novo depois da troca.
    return `${data.publicUrl}?v=${Date.now()}`;
  };

  const salvar = async (dados: Perfil): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      toast.error("Usuário não autenticado.");
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("perfis").upsert(
      {
        user_email: session.user.email,
        nome: dados.nome.trim(),
        nome_loja: dados.nomeLoja.trim(),
        telefone: dados.telefone.trim(),
        foto_url: dados.fotoUrl,
        regime_tributario: dados.regime,
        simples_anexo: dados.regime === "simples" ? dados.anexo : null,
        simples_rbt12: dados.regime === "simples" ? dados.rbt12 : null,
        imposto_percent: dados.impostoPercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_email" },
    );

    if (error) {
      console.error("Erro ao salvar o perfil:", error);
      toast.error("Erro ao salvar o perfil.");
      return false;
    }

    setPerfil(dados);
    toast.success("Perfil salvo.");
    return true;
  };

  return { perfil, carregando, salvar, enviarFoto };
}
