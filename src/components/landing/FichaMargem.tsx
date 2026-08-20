import { motion } from "framer-motion";

interface Item {
  rotulo: string;
  valor: number;
  onde: string;
  credito?: boolean;
}

/**
 * O caminho do dinheiro numa venda real de R$120 na Shopee, custo R$45,
 * imposto de 8%, embalagem de R$2,50. Cada linha é um ponto que a Vetrex
 * controla, e é por isso que ela não é só uma calculadora.
 */
const ITENS: Item[] = [
  { rotulo: "Venda", valor: 120, onde: "o que o cliente paga", credito: true },
  { rotulo: "Comissão da plataforma", valor: -36.8, onde: "14% mais R$20 fixos" },
  { rotulo: "Imposto", valor: -9.6, onde: "pelo seu regime tributário" },
  { rotulo: "Embalagem e etiqueta", valor: -2.5, onde: "cadastrada uma vez, usada sempre" },
  { rotulo: "Custo do produto", valor: -45, onde: "o que você pagou pela peça" },
];

const SOBRA = 26.1;
const MARGEM = 21.8;

function moeda(v: number): string {
  return Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const FichaMargem = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    className="relative"
  >
    <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl" />

    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="border-b border-border px-5 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Onde o dinheiro da sua venda vai parar
        </p>
      </div>

      <ul>
        {ITENS.map((item) => (
          <li
            key={item.rotulo}
            className="flex items-center gap-3 border-b border-border/70 px-5 py-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">{item.rotulo}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.onde}</span>
            </span>
            <span
              className={`shrink-0 whitespace-nowrap font-mono text-sm tabular-nums ${
                item.credito ? "text-foreground" : "text-destructive"
              }`}
            >
              {item.credito ? "" : "- "}
              {moeda(item.valor)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3 bg-primary/5 px-5 py-4">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">Sobra para você</span>
          <span className="block text-xs text-muted-foreground">
            margem de {MARGEM.toLocaleString("pt-BR")}%
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-lg font-semibold tabular-nums text-success">
          {moeda(SOBRA)}
        </span>
      </div>

      <div className="border-t border-border bg-muted/30 px-5 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Cada linha acima muda por plataforma, por peso, por faixa de preço e por regime.
          A Vetrex controla todas elas.
        </p>
      </div>
    </div>
  </motion.div>
);
