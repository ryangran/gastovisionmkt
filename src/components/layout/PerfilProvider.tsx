import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePerfil, type Perfil } from "@/hooks/usePerfil";

interface ContextoPerfil {
  perfil: Perfil | null;
  carregando: boolean;
}

const PerfilContext = createContext<ContextoPerfil>({ perfil: null, carregando: true });

/** Uma única leitura do perfil para o app inteiro. */
export const PerfilProvider = ({ children }: { children: ReactNode }) => {
  const { perfil, carregando } = usePerfil();
  return (
    <PerfilContext.Provider value={{ perfil, carregando }}>{children}</PerfilContext.Provider>
  );
};

export function usePerfilAtual(): ContextoPerfil {
  return useContext(PerfilContext);
}

/**
 * Preenche o campo de imposto da calculadora com o percentual do perfil.
 *
 * Só age uma vez e só se o campo estiver vazio: quem já digitou um imposto para
 * aquele produto não pode ver o número mudar sozinho enquanto trabalha. Campo
 * com "0" também é resposta — é o caso do MEI — e por isso não é considerado
 * vazio.
 */
export function useImpostoDoPerfil(
  valorAtual: string,
  definir: (valor: string) => void,
): void {
  const { perfil, carregando } = usePerfilAtual();
  const jaAplicou = useRef(false);

  useEffect(() => {
    if (jaAplicou.current || carregando || !perfil) return;
    if (valorAtual !== "") {
      // Já havia valor: nada a preencher, e não tentamos de novo.
      jaAplicou.current = true;
      return;
    }
    if (perfil.regime === "nao_informado") return;

    jaAplicou.current = true;
    definir(String(perfil.impostoPercent).replace(".", ","));
  }, [perfil, carregando, valorAtual, definir]);
}
