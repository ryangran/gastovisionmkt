import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { planoLibera, type PlanoId, type Recurso } from "@/lib/acesso/planos";

export interface Acesso {
  carregando: boolean;
  autenticado: boolean;
  /** Tem algum plano ativo. Libera a calculadora sem orçamento diário. */
  ilimitado: boolean;
  /** Qual plano. Null quando não assinou. Admin conta como deluxe. */
  plano: PlanoId | null;
  usados: number;
  limite: number;
  restantes: number;
}

export const ACESSO_INICIAL: Acesso = {
  carregando: true,
  autenticado: false,
  ilimitado: false,
  plano: null,
  usados: 0,
  limite: 2,
  restantes: 0,
};

interface ContextoAcesso extends Acesso {
  /**
   * Gasta uma interação e devolve se pode seguir. Quem tem plano nunca gasta
   * nada, então devolve true sem tocar no banco.
   */
  consumir: (plataforma: string) => Promise<boolean>;
  /** Reconsulta o saldo, já com o orçamento da plataforma aberta. */
  recarregar: (plataforma?: string) => Promise<void>;
  /** Se o plano atual libera a área. Fonte única para rota e barra lateral. */
  podeUsar: (recurso: Recurso) => boolean;
}

const AcessoContext = createContext<ContextoAcesso>({
  ...ACESSO_INICIAL,
  consumir: async () => false,
  recarregar: async () => undefined,
  podeUsar: () => false,
});

/** Menor orçamento existente, usado antes de saber qual aba está aberta. */
const PLATAFORMA_PADRAO = "shopee";

/** Formato devolvido pelas funções status_acesso e consumir_uso_calculadora. */
interface RespostaRpc {
  autenticado?: boolean;
  ilimitado?: boolean;
  permitido?: boolean;
  plano?: PlanoId | null;
  usados?: number;
  limite?: number;
  restantes?: number;
}

function daResposta(r: RespostaRpc | null): Acesso {
  if (!r?.autenticado) {
    return { ...ACESSO_INICIAL, carregando: false };
  }
  const limite = r.limite ?? ACESSO_INICIAL.limite;
  const usados = r.usados ?? 0;
  return {
    carregando: false,
    autenticado: true,
    ilimitado: Boolean(r.ilimitado),
    // consumir_interacao_calculadora não devolve `plano`. Quando vier ausente,
    // deduz do ilimitado em vez de zerar o plano e derrubar o acesso da pessoa
    // no meio de um cálculo.
    plano: r.plano ?? (r.ilimitado ? "deluxe" : null),
    usados,
    limite,
    restantes: r.restantes ?? Math.max(limite - usados, 0),
  };
}

/**
 * Uma única fonte sobre o que a pessoa pode fazer, para a barra lateral, as
 * páginas bloqueadas e a calculadora não discordarem entre si.
 *
 * A contagem vem sempre do banco. Guardar no navegador seria mais rápido e
 * duraria até a primeira aba anônima.
 */
export const AcessoProvider = ({ children }: { children: ReactNode }) => {
  const [acesso, setAcesso] = useState<Acesso>(ACESSO_INICIAL);

  const recarregar = useCallback(async (plataforma = PLATAFORMA_PADRAO) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAcesso({ ...ACESSO_INICIAL, carregando: false });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("status_acesso", {
      _plataforma: plataforma,
    });
    if (error) {
      console.error("Erro ao consultar o acesso:", error);
      // Na dúvida trata como livre e sem uso sobrando: liberar por engano
      // custa mais caro que pedir para a pessoa recarregar a página.
      setAcesso({ ...ACESSO_INICIAL, carregando: false, autenticado: true });
      return;
    }
    setAcesso(daResposta(data as RespostaRpc));
  }, []);

  useEffect(() => {
    void recarregar();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Fora do callback, que é o que o Supabase pede para não travar.
      setTimeout(() => void recarregar(), 0);
    });
    return () => subscription.unsubscribe();
  }, [recarregar]);

  const consumir = useCallback(async (plataforma: string) => {
    if (acesso.ilimitado) return true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("consumir_interacao_calculadora", {
      _plataforma: plataforma,
    });
    if (error) {
      console.error("Erro ao consumir uma interação:", error);
      return false;
    }

    const r = data as RespostaRpc;
    setAcesso(daResposta(r));
    return Boolean(r?.permitido);
  }, [acesso.ilimitado]);

  const podeUsar = useCallback(
    (recurso: Recurso) => planoLibera(acesso.plano, recurso),
    [acesso.plano],
  );

  return (
    <AcessoContext.Provider value={{ ...acesso, consumir, recarregar, podeUsar }}>
      {children}
    </AcessoContext.Provider>
  );
};

export function useAcesso(): ContextoAcesso {
  return useContext(AcessoContext);
}
