import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./AppSidebar";
import { TaxasProvider } from "./TaxasProvider";
import { PerfilProvider } from "./PerfilProvider";
import { AcessoProvider } from "./AcessoProvider";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoHorizontalLight from "@/assets/logo-horizontal-light.png";

export const AppShell = () => {
  const [drawerAberto, setDrawerAberto] = useState(false);

  return (
    <TaxasProvider>
    <PerfilProvider>
    <AcessoProvider>
    <div className="relative flex min-h-screen bg-background">
      {/* Degradê vermelho da marca, em todas as abas do app.
          Fica aqui no AppShell para qualquer página nova já nascer com ele. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-primary/[0.06]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(1100px 700px at 85% 12%, hsl(var(--primary) / 0.08), transparent 65%), radial-gradient(900px 600px at 10% 78%, hsl(var(--primary) / 0.06), transparent 65%)",
        }}
      />

      {/* Desktop: sidebar fixa */}
      <aside className="relative z-10 hidden md:block sticky top-0 h-screen shrink-0">
        <AppSidebar />
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Mobile: barra com o menu em drawer */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Navegação</SheetTitle>
              <AppSidebar onNavegar={() => setDrawerAberto(false)} />
            </SheetContent>
          </Sheet>

          <img src={logoHorizontal} alt="Vetrex" className="h-6 w-auto hidden dark:block" />
          <img src={logoHorizontalLight} alt="Vetrex" className="h-6 w-auto block dark:hidden" />
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
    </AcessoProvider>
    </PerfilProvider>
    </TaxasProvider>
  );
};
