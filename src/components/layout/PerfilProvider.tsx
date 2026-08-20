import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePerfil, type Perfil } from "@/hooks/usePerfil";
import { impostoParaPreencher } from "@/lib/perfil/impostoPadrao";

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
 * Só age uma vez por montagem: quem já digitou um imposto para aquele produto
 * não pode ver o número mudar sozinho enquanto trabalha. A regra do que
 * preencher vive em impostoParaPreencher, que é testada.
 */
export function useImpostoDoPerfil(
  valorAtual: string,
  definir: (valor: string) => void,
): void {
  const { perfil, carregando } = usePerfilAtual();
  const jaAplicou = useRef(false);

  useEffect(() => {
    if (jaAplicou.current || carregando) return;

    const valor = impostoParaPreencher(valorAtual, perfil);
    if (valor === null) {
      // Sem nada a preencher: se o perfil já chegou, não tenta de novo.
      if (perfil) jaAplicou.current = true;
      return;
    }

    jaAplicou.current = true;
    definir(valor);
  }, [perfil, carregando, valorAtual, definir]);
}
