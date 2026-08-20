import { motion } from "framer-motion";
import { MarketplaceLogo, type MarketplaceKey } from "@/components/MarketplaceLogo";

interface Linha {
  key: MarketplaceKey;
  nome: string;
  lucro: number;
  margem: number;
}

/**
 * Os números vêm de um cálculo real do comparador: produto de R$120, custo
 * R$45, imposto 8%, 600 g, 20x15x10 cm. Não são ilustrativos.
 */
const LINHAS: Linha[] = [
  { key: "tiktok", nome: "TikTok Shop", lucro: 52.2, margem: 43.5 },
  { key: "shein", nome: "Shein", lucro: 42.2, margem: 35.2 },
  { key: "shopee", nome: "Shopee", lucro: 34.6, margem: 28.8 },
  { key: "mercadolivre", nome: "Mercado Livre", lucro: 32.55, margem: 27.1 },
  { key: "amazon", nome: "Amazon", lucro: 28.55, margem: 23.8 },
  { key: "magalu", nome: "Magalu", lucro: 3.0, margem: 2.5 },
];

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const FichaComparativa = () => {
  const maior = LINHAS[0].lucro;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative"
    >
      <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Mesmo produto, seis plataformas
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            custo R$45 · venda R$120 · 600 g
          </span>
        </div>

        <ul>
          {LINHAS.map((l, i) => {
            const proporcao = Math.max((l.lucro / maior) * 100, 3);
            const pior = i === LINHAS.length - 1;
            const melhor = i === 0;
            return (
              <li
                key={l.key}
                className={`relative flex items-center gap-3 border-b border-border/70 px-5 py-3 last:border-0 ${
                  melhor ? "bg-primary/5" : ""
                }`}
              >
                <MarketplaceLogo platform={l.key} className="h-4 w-auto max-w-12 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{l.nome}</span>

                <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:block">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${proporcao}%` }}
                    transition={{ duration: 0.7, delay: 0.2 + i * 0.07, ease: "easeOut" }}
                    className={`block h-full rounded-full ${
                      pior ? "bg-destructive/70" : "bg-primary"
                    }`}
                  />
                </span>

                <span
                  className={`w-24 shrink-0 text-right font-mono text-sm tabular-nums ${
                    pior ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {moeda(l.lucro)}
                </span>
                <span className="hidden w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
                  {l.margem.toLocaleString("pt-BR")}%
                </span>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border bg-muted/30 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Diferença entre a melhor e a pior:{" "}
            <span className="font-mono text-foreground">
              {moeda(LINHAS[0].lucro - LINHAS[LINHAS.length - 1].lucro)} por unidade
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};
