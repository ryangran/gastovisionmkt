import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  GitCompareArrows,
  Megaphone,
  Bookmark,
  Receipt,
  Store,
  UserRound,
  Shield,
  GraduationCap,
  Lock,
  CreditCard,
  LogOut,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAcesso } from "./AcessoProvider";
import type { Recurso } from "@/lib/acesso/planos";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoHorizontalLight from "@/assets/logo-horizontal-light.png";

interface ItemNav {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Área que o item abre. Sem isto, o item é livre para todo mundo. */
  recurso?: Recurso;
}

interface GrupoNav {
  titulo: string;
  itens: ItemNav[];
}

const GRUPOS: GrupoNav[] = [
  {
    titulo: "Visão geral",
    itens: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, recurso: "dashboard" }],
  },
  {
    titulo: "Precificar",
    itens: [
      { to: "/calculadora", label: "Calculadora", icon: Calculator },
      { to: "/comparador", label: "Comparador", icon: GitCompareArrows, recurso: "comparador" },
      { to: "/ads", label: "Calculadora de Ads", icon: Megaphone, recurso: "ads" },
    ],
  },
  {
    titulo: "Carteira",
    itens: [{ to: "/produtos-salvos", label: "Produtos salvos", icon: Bookmark, recurso: "produtosSalvos" }],
  },
  {
    titulo: "Afiliados",
    itens: [{ to: "/rpa-afiliados", label: "RPA de afiliados", icon: Receipt, recurso: "rpa" }],
  },
  {
    titulo: "Fornecedores",
    itens: [{ to: "/fornecedores", label: "Fornecedores", icon: Store, recurso: "fornecedores" }],
  },
  {
    titulo: "Conta",
    itens: [{ to: "/perfil", label: "Meu perfil", icon: UserRound }],
  },
  {
    titulo: "Mentoria",
    itens: [{ to: "/mentoria", label: "Diagnóstico gratuito", icon: GraduationCap }],
  },
  {
    titulo: "Assinatura",
    itens: [{ to: "/planos", label: "Planos", icon: CreditCard }],
  },
];

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;

/** Grupos que a pessoa fechou. localStorage e não sessionStorage: é preferência
 *  de interface, e teria que ser refeita a cada aba nova. */
const CHAVE_GRUPOS = "vetrex:menu-grupos-fechados";

function useGruposFechados() {
  const [fechados, setFechados] = useState<Record<string, boolean>>(() => {
    try {
      const bruto = localStorage.getItem(CHAVE_GRUPOS);
      return bruto ? (JSON.parse(bruto) as Record<string, boolean>) : {};
    } catch {
      // Navegador com dados de site bloqueados. Menu todo aberto é o certo aqui.
      return {};
    }
  });

  const alternar = useCallback((titulo: string) => {
    setFechados((atual) => {
      const proximo = { ...atual, [titulo]: !atual[titulo] };
      try {
        localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(proximo));
      } catch {
        // Cota cheia ou dados de site bloqueados. A preferência vale só nesta
        // sessão, mas o menu continua respondendo ao clique.
      }
      return proximo;
    });
  }, []);

  return { fechados, alternar };
}

/** Mostra o item de admin só para quem tem o papel — o RPC é a fonte de verdade. */
function useEhAdmin(): boolean {
  const [ehAdmin, setEhAdmin] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (error) console.error("Erro ao verificar papel de admin:", error);
      if (ativo) setEhAdmin(Boolean(data) || session.user.email === ADMIN_EMAIL);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return ehAdmin;
}

interface AppSidebarProps {
  /** Fecha o drawer no mobile depois de navegar. */
  onNavegar?: () => void;
}

export const AppSidebar = ({ onNavegar }: AppSidebarProps) => {
  const ehAdmin = useEhAdmin();
  const navegar = useNavigate();
  const { fechados, alternar } = useGruposFechados();
  const { podeUsar, carregando } = useAcesso();

  // Enquanto carrega não mostra cadeado: piscar cadeado na cara de quem já
  // paga é pior que demorar meio segundo para mostrar na de quem não paga.
  const travado = (item: ItemNav) =>
    Boolean(item.recurso) && !carregando && !podeUsar(item.recurso as Recurso);

  const grupos = ehAdmin
    ? [...GRUPOS, { titulo: "Administração", itens: [{ to: "/admin-panel", label: "Painel admin", icon: Shield }] }]
    : GRUPOS;

  return (
    <nav className="flex h-full w-60 flex-col border-r border-border bg-card">
      <div className="px-5 py-6">
        <NavLink to="/dashboard" onClick={onNavegar} aria-label="Vetrex">
          <img src={logoHorizontal} alt="Vetrex" className="h-7 w-auto hidden dark:block" />
          <img src={logoHorizontalLight} alt="Vetrex" className="h-7 w-auto block dark:hidden" />
        </NavLink>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {grupos.map((grupo) => {
          const fechado = Boolean(fechados[grupo.titulo]);
          const idLista = `grupo-${grupo.titulo.replace(/\s+/g, "-").toLowerCase()}`;
          return (
          <div key={grupo.titulo} className={cn(fechado ? "mb-2" : "mb-6")}>
            <button
              type="button"
              onClick={() => alternar(grupo.titulo)}
              aria-expanded={!fechado}
              aria-controls={idLista}
              className="flex w-full items-center justify-between px-5 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {grupo.titulo}
              <ChevronDown
                aria-hidden
                className={cn("h-3.5 w-3.5 transition-transform", fechado && "-rotate-90")}
              />
            </button>
            <ul id={idLista} className={cn(fechado && "hidden")}>
              {grupo.itens.map((item) => {
                const { to, label, icon: Icone } = item;
                const comCadeado = travado(item);
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={onNavegar}
                      title={comCadeado ? "Disponível nos planos" : undefined}
                      className={({ isActive }) =>
                        cn(
                          "relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                          isActive
                            ? "text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary"
                            />
                          )}
                          <Icone className={cn("h-4 w-4 shrink-0", comCadeado && "opacity-50")} />
                          <span className={cn("min-w-0 truncate", comCadeado && "opacity-60")}>
                            {label}
                          </span>
                          {/* O item continua clicável de propósito: a tela de
                              dentro é que vende o plano. Cadeado que não abre
                              nada só irrita. */}
                          {comCadeado && (
                            <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </div>

      {/* Sair fica no rodapé, separado da navegação, porque não é um destino:
          é a única ação destrutiva daqui e não deve ser clicada por engano. */}
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={async () => {
            onNavegar?.();
            await supabase.auth.signOut();
            navegar("/");
          }}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </nav>
  );
};
