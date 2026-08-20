import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Play, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoFeatureProps {
  numero: string;
  titulo: string;
  descricao: ReactNode;
  /** Caminho do vídeo em /public. Sem ele, o bloco mostra o espaço reservado. */
  video?: string;
  /** Imagem de capa exibida antes do play. */
  poster?: string;
  /** Inverte o lado do vídeo, para o olho não cair na mesma coluna toda vez. */
  invertido?: boolean;
  destaque?: string;
}

export const VideoFeature = ({
  numero,
  titulo,
  descricao,
  video,
  poster,
  invertido,
  destaque,
}: VideoFeatureProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);
  /**
   * Vídeo que não carrega vira espaço reservado, em vez de player travado em
   * 0:00. Assim basta soltar o arquivo em /public/videos para ele aparecer,
   * sem mexer no código.
   */
  const [falhou, setFalhou] = useState(false);

  // Dá play quando o bloco entra na tela e pausa quando sai, para não deixar
  // seis vídeos rodando ao mesmo tempo em segundo plano.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          void el.play().then(() => setTocando(true)).catch(() => setTocando(false));
        } else {
          el.pause();
          setTocando(false);
        }
      },
      { threshold: 0.4 },
    );

    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={cn(
        "grid items-center gap-8 lg:grid-cols-2 lg:gap-14",
        invertido && "lg:[&>*:first-child]:order-2",
      )}
    >
      <div className="min-w-0">
        <span className="font-mono text-xs tracking-[0.3em] text-primary">{numero}</span>
        <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          {titulo}
        </h3>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {descricao}
        </div>
        {destaque && (
          <p className="mt-5 border-l-2 border-primary pl-4 font-mono text-sm text-foreground">
            {destaque}
          </p>
        )}
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-primary/10 blur-2xl" />
        <div className="relative overflow-hidden rounded-xl border border-border bg-card">
          {video && !falhou ? (
            <>
              <video
                ref={ref}
                src={video}
                poster={poster}
                muted
                loop
                playsInline
                preload="metadata"
                onError={() => setFalhou(true)}
                controls
                className="aspect-video w-full bg-black object-cover"
              />
              {!tocando && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90">
                    <Play className="ml-0.5 h-6 w-6 fill-primary-foreground text-primary-foreground" />
                  </span>
                </span>
              )}
            </>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted/40 to-card">
              <Film className="h-7 w-7 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Demonstração em vídeo
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
