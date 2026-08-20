import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./AppSidebar";
import { TaxasProvider } from "./TaxasProvider";
import { PerfilProvider } from "./PerfilProvider";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoHorizontalLight from "@/assets/logo-horizontal-light.png";

export const AppShell = () => {
  const [drawerAberto, setDrawerAberto] = useState(false);

  return (
    <TaxasProvider>
    <PerfilProvider>
    <div className="flex min-h-screen bg-background">
      {/* Desktop: sidebar fixa */}
      <aside className="hidden md:block sticky top-0 h-screen shrink-0">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
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
    </PerfilProvider>
    </TaxasProvider>
  );
};
