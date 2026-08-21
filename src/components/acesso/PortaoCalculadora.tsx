import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogoLimite } from "@/components/acesso/DialogoLimite";
import { useAcesso } from "@/components/layout/AcessoProvider";
import { cn } from "@/lib/utils";

/** Tempo que um campo precisa ficar parado para a mexida contar como uma. */
const ESPERA_MS = 700;

interface PortaoCalculadoraProps {
  /** Aba aberta. Define o orçamento, que é duas vezes o número de campos. */
  plataforma: string;
  children: ReactNode;
}

/**
 * Mede o uso da calculadora por quem não assinou e trava quando acaba.
 *
 * Não existe botão de "usar um cálculo". A calculadora recalcula a cada tecla
 * e não tem um momento único de calcular, então o que se conta é mexida em
 * campo: cada campo que muda e fica parado por um instante vale uma. O
 * orçamento do dia é duas vezes o número de campos daquela calculadora, ou
 * seja, dá para preencher o formulário inteiro duas vezes.
 *
 * A escuta é por delegação no contêiner, e não campo a campo, para as seis
 * calculadoras continuarem sem saber que este limite existe.
 */
export const PortaoCalculadora = ({ plataforma, children }: PortaoCalculadoraProps) => {
  const { carregando, ilimitado, restantes, limite, consumir, recarregar } = useAcesso();
  const [dialogo, setDialogo] = useState(false);

  // Um timer por campo. Digitar "120" no preço é uma mexida, não três.
  const timers = useRef(new Map<Element, ReturnType<typeof setTimeout>>());
  // O último valor contabilizado de cada campo, para não cobrar de novo por
  // quem clicou dentro e saiu sem mudar nada.
  const ultimos = useRef(new Map<Element, string>());

  const travado = !ilimitado && !carregando && restantes <= 0;

  // Trocar de aba muda o orçamento, então o saldo precisa ser reconsultado.
  useEffect(() => {
    if (ilimitado) return;
    void recarregar(plataforma);
  }, [plataforma, ilimitado, recarregar]);

  useEffect(() => {
    const mapa = timers.current;
    return () => {
      mapa.forEach((t) => clearTimeout(t));
      mapa.clear();
    };
  }, []);

  const cobrar = useCallback(async () => {
    const ok = await consumir(plataforma);
    if (!ok) setDialogo(true);
  }, [consumir, plataforma]);

  /** Campo de texto mexido: espera parar de digitar antes de cobrar. */
  const aoDigitar = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      if (ilimitado || travado) return;
      const alvo = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!alvo || !("value" in alvo)) return;

      const anterior = timers.current.get(alvo);
      if (anterior) clearTimeout(anterior);

      timers.current.set(
        alvo,
        setTimeout(() => {
          timers.current.delete(alvo);
          const valor = String(alvo.value ?? "");
          if (ultimos.current.get(alvo) === valor) return;
          ultimos.current.set(alvo, valor);
          void cobrar();
        }, ESPERA_MS),
      );
    },
    [cobrar, ilimitado, travado],
  );

  /** Switch e Select do shadcn são botões, então não disparam input. */
  const aoClicar = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (ilimitado || travado) return;
      const alvo = e.target as HTMLElement | null;
      if (!alvo?.closest) return;
      if (alvo.closest('[role="switch"], [role="option"], [role="radio"]')) {
        void cobrar();
      }
    },
    [cobrar, ilimitado, travado],
  );

  if (ilimitado) return <>{children}</>;

  return (
    <>
      {!travado && !carregando && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {restantes} de {limite}
              </span>{" "}
              alterações grátis hoje nesta calculadora. Salvar produto, comparar plataformas e o
              resto ficam no plano.
            </p>
            <div className="mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  restantes <= 3 ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${Math.max((restantes / Math.max(limite, 1)) * 100, 2)}%` }}
              />
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/planos">
              Ver planos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="relative" onInput={aoDigitar} onClick={aoClicar}>
        <div
          className={cn(
            travado && "pointer-events-none select-none blur-[6px] saturate-50",
          )}
          aria-hidden={travado || undefined}
        >
          {children}
        </div>

        {travado && (
          <div className="absolute inset-0 flex items-start justify-center bg-background/70 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-10 w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-xl"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                <Lock className="h-6 w-6 text-primary" />
              </span>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                Acabaram seus usos grátis de hoje
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Você usou as {limite} alterações que a calculadora grátis permite por dia. Elas
                voltam amanhã, na virada da meia-noite. Ou você abre a plataforma inteira agora e
                para de contar.
              </p>
              <Button size="lg" className="mt-6 w-full gap-2" onClick={() => setDialogo(true)}>
                Conhecer os planos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      <DialogoLimite
        aberto={dialogo}
        onFechar={() => setDialogo(false)}
        limite={limite}
      />
    </>
  );
};
