import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  GitCompareArrows,
  Megaphone,
  Bookmark,
  Receipt,
  UserRound,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoHorizontalLight from "@/assets/logo-horizontal-light.png";

interface ItemNav {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface GrupoNav {
  titulo: string;
  itens: ItemNav[];
}

const GRUPOS: GrupoNav[] = [
  {
    titulo: "Visão geral",
    itens: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    titulo: "Precificar",
    itens: [
      { to: "/calculadora", label: "Calculadora", icon: Calculator },
      { to: "/comparador", label: "Comparador", icon: GitCompareArrows },
      { to: "/ads", label: "Calculadora de Ads", icon: Megaphone },
    ],
  },
  {
    titulo: "Carteira",
    itens: [{ to: "/produtos-salvos", label: "Produtos salvos", icon: Bookmark }],
  },
  {
    titulo: "Afiliados",
    itens: [{ to: "/rpa-afiliados", label: "RPA de afiliados", icon: Receipt }],
  },
  {
    titulo: "Conta",
    itens: [{ to: "/perfil", label: "Meu perfil", icon: UserRound }],
  },
];

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;

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
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-6">
            <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {grupo.titulo}
            </p>
            <ul>
              {grupo.itens.map(({ to, label, icon: Icone }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavegar}
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
                        <Icone className="h-4 w-4 shrink-0" />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
};
