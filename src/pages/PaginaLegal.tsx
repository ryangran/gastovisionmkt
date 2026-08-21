import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConteudoLegal } from "@/components/legal/ConteudoLegal";
import { DOCUMENTOS_LEGAIS, DOCUMENTOS_POR_ID, ROTA_LEGAL } from "@/lib/legal/documentos";
import type { DocumentoId } from "@/lib/legal/documentos";
import logo from "@/assets/logo.png";
import logoLight from "@/assets/logo-light.png";

interface PaginaLegalProps {
  documento: DocumentoId;
}

/** Renderiza qualquer documento legal em rota pública. */
const PaginaLegal = ({ documento }: PaginaLegalProps) => {
  const navigate = useNavigate();
  const doc = DOCUMENTOS_POR_ID[documento];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${doc.titulo} — Vetrex`;
  }, [doc.titulo]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center">
            <img src={logo} alt="Vetrex" className="hidden h-7 w-auto dark:block" />
            <img src={logoLight} alt="Vetrex" className="block h-7 w-auto dark:hidden" />
          </Link>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <ConteudoLegal documento={doc} />
      </main>

      <footer className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-8 text-center">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {DOCUMENTOS_LEGAIS.map((outro) => (
              <Link
                key={outro.id}
                to={ROTA_LEGAL[outro.id]}
                className={
                  outro.id === doc.id
                    ? "text-xs font-medium text-foreground"
                    : "text-xs text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {outro.titulo}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Vetrex. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PaginaLegal;
