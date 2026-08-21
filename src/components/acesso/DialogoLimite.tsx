import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CartaoPlano } from "@/components/acesso/CartaoPlano";
import { PLANOS } from "@/lib/acesso/planos";

interface DialogoLimiteProps {
  aberto: boolean;
  onFechar: () => void;
  limite: number;
}

/** Aparece quando as alterações grátis do dia acabaram. */
export const DialogoLimite = ({ aberto, onFechar, limite }: DialogoLimiteProps) => (
  <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
    <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Lock className="h-6 w-6 text-primary" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold text-foreground">
          Acabaram seus usos grátis de hoje
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          A calculadora grátis permite {limite} alterações por dia, o suficiente para preencher o
          formulário duas vezes. Elas voltam amanhã, na virada da meia-noite. Se você não quer
          esperar, e nem ficar contando, é aqui que a plataforma inteira abre: comparador entre os
          seis marketplaces, precificação reversa, calculadora de anúncios, painel de estoque e
          produtos salvos sem limite.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {PLANOS.map((plano) => (
          <CartaoPlano key={plano.id} plano={plano} compacto />
        ))}
      </div>

      <div className="mt-4 flex flex-col items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link to="/planos" onClick={onFechar}>
            Ver a comparação completa
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Garantia de 7 dias. Se não achar dinheiro que estava escapando, devolvemos.
        </p>
      </div>
    </DialogContent>
  </Dialog>
);
