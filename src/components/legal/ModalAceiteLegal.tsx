import { useCallback, useEffect, useState } from "react";
import { ArrowDown, Check, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConteudoLegal } from "@/components/legal/ConteudoLegal";
import { DOCUMENTOS_LEGAIS } from "@/lib/legal/documentos";
import { cn } from "@/lib/utils";

/**
 * Trava do cadastro: a pessoa só consegue concordar depois de rolar os três
 * documentos até o fim.
 *
 * Sobra de pixel aceita como "chegou ao fim". Sem isso, zoom do navegador e
 * arredondamento de subpixel deixam uma fresta de 1px que nunca fecha, e o
 * botão jamais habilita.
 */
const MARGEM_FIM = 8;

interface ModalAceiteLegalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado quando a pessoa rolou tudo e marcou a concordância. */
  onAceitar: () => void;
  carregando?: boolean;
}

export const ModalAceiteLegal = ({
  open,
  onOpenChange,
  onAceitar,
  carregando = false,
}: ModalAceiteLegalProps) => {
  // Elemento em estado, não em ref: o DialogContent só monta ao abrir, e um
  // ref puro não avisaria o efeito que instala o observador.
  const [areaRolagem, setAreaRolagem] = useState<HTMLDivElement | null>(null);
  const [leuTudo, setLeuTudo] = useState(false);
  const [concordou, setConcordou] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const avaliarRolagem = useCallback((el: HTMLDivElement) => {
    const total = el.scrollHeight;
    const visivel = el.clientHeight;
    const lido = el.scrollTop + visivel;

    // Conteúdo que cabe inteiro na tela nunca dispara rolagem. Sem este caso,
    // em monitor grande a trava não abriria e o cadastro ficaria impossível.
    if (total <= visivel + MARGEM_FIM) {
      setProgresso(1);
      setLeuTudo(true);
      return;
    }

    setProgresso(Math.min(1, Math.max(0, lido / total)));
    // Não volta a travar ao rolar para cima: já leu, já leu.
    if (lido >= total - MARGEM_FIM) setLeuTudo(true);
  }, []);

  // Zera a cada abertura, senão quem cancelou e voltou entraria já liberado.
  useEffect(() => {
    if (!open) return;
    setLeuTudo(false);
    setConcordou(false);
    setProgresso(0);
  }, [open]);

  // Mede no mount e a cada mudança de tamanho: girar o celular ou abrir o
  // teclado virtual muda clientHeight e com ele a conta do fim.
  useEffect(() => {
    if (!areaRolagem) return;

    areaRolagem.scrollTop = 0;
    avaliarRolagem(areaRolagem);

    const observer = new ResizeObserver(() => avaliarRolagem(areaRolagem));
    observer.observe(areaRolagem);
    if (areaRolagem.firstElementChild) observer.observe(areaRolagem.firstElementChild);

    return () => observer.disconnect();
  }, [areaRolagem, avaliarRolagem]);

  const irParaOFim = () => {
    if (!areaRolagem) return;
    areaRolagem.scrollTo({ top: areaRolagem.scrollHeight, behavior: "smooth" });
    // Rede de segurança caso a rolagem suave seja interrompida e o último
    // evento de scroll não chegue.
    window.setTimeout(() => avaliarRolagem(areaRolagem), 700);
  };

  const irParaDocumento = (id: string) => {
    document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const podeEnviar = leuTudo && concordou && !carregando;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-2 border-b border-border p-6 pb-4 pr-12 text-left">
          <DialogTitle className="font-display text-xl">Antes de criar sua conta</DialogTitle>
          <DialogDescription>
            Leia os três documentos abaixo. O botão de concordar libera quando você chegar ao fim
            da página.
          </DialogDescription>

          <nav className="flex flex-wrap gap-2 pt-1">
            {DOCUMENTOS_LEGAIS.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => irParaDocumento(doc.id)}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {doc.titulo}
              </button>
            ))}
          </nav>
        </DialogHeader>

        {/* Progresso da leitura */}
        <div className="h-0.5 w-full shrink-0 bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${Math.round(progresso * 100)}%` }}
          />
        </div>

        <div
          ref={setAreaRolagem}
          onScroll={(e) => avaliarRolagem(e.currentTarget)}
          tabIndex={0}
          aria-label="Documentos legais. Role até o fim para liberar o aceite."
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <div className="space-y-12">
            {DOCUMENTOS_LEGAIS.map((doc) => (
              <ConteudoLegal key={doc.id} documento={doc} id={`doc-${doc.id}`} compacto />
            ))}

            <p className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
              Fim dos documentos. Você pode reler qualquer um deles a qualquer momento pelos links
              no rodapé do site.
            </p>
          </div>
        </div>

        <div className="shrink-0 space-y-4 border-t border-border bg-card/60 p-6">
          {!leuTudo ? (
            <button
              type="button"
              onClick={irParaOFim}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              Ir para o fim dos documentos
            </button>
          ) : null}

          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              leuTudo
                ? "border-border hover:border-primary/40"
                : "cursor-not-allowed border-dashed border-border opacity-50",
            )}
          >
            <Checkbox
              checked={concordou}
              onCheckedChange={(v) => setConcordou(v === true)}
              disabled={!leuTudo}
              className="mt-0.5"
              aria-describedby="aceite-descricao"
            />
            <span id="aceite-descricao" className="text-sm leading-relaxed text-foreground">
              Li e concordo com os Termos de Uso, a Política de Privacidade e a Política de
              Cookies da Vetrex.
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={carregando}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={onAceitar} disabled={!podeEnviar} className="gap-2">
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : podeEnviar ? (
                <Check className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {carregando ? "Criando conta..." : "Concordo e criar conta"}
            </Button>
          </div>

          {!leuTudo ? (
            <p className="text-center text-xs text-muted-foreground">
              Role até o fim para liberar o aceite.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
