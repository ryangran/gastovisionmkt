/**
 * Traduz o payload da Cakto para o plano comprado.
 *
 * Vive num arquivo separado, sem nenhum import do Deno, para poder ser testado
 * pelo vitest. Errar aqui é caro nos dois sentidos: dar Deluxe para quem pagou
 * o Essencial entrega R$167 de produto de graça, e o contrário deixa quem
 * pagou sem o que comprou.
 */

export type PlanoCompra = "essencial" | "plus" | "deluxe";

/**
 * Identificador de cada link de checkout, que é o sinal confiável: nós é que
 * criamos as URLs. Nome de oferta e valor mudam quando você edita a campanha
 * na Cakto; o identificador do link, não.
 */
export const CHECKOUTS: Record<string, PlanoCompra> = {
  // Links em uso
  vgi2b7q: "essencial",
  "39x7i89": "plus",
  "6m7kaiz": "deluxe",

  // Links antigos, de quando o acesso era tudo-ou-nada. Continuam valendo como
  // Plus para não rebaixar quem comprou antes da mudança.
  n9b89by: "plus",
  "32i2hyh": "plus",
};

/** Valor cobrado por plano, usado só quando o link não for reconhecido. */
const PRECO_POR_PLANO: [number, PlanoCompra][] = [
  [29.9, "essencial"],
  [67.9, "plus"],
  [197, "deluxe"],
];

function porNome(texto: string): PlanoCompra | null {
  if (texto.includes("deluxe")) return "deluxe";
  if (texto.includes("plus")) return "plus";
  if (texto.includes("essencial")) return "essencial";
  // Nomenclatura antiga.
  if (texto.includes("vitalício") || texto.includes("vitalicio") || texto.includes("lifetime")) {
    return "deluxe";
  }
  return null;
}

function porValor(valor: unknown): PlanoCompra | null {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Tolerância de 1 real absorve centavo de taxa e arredondamento.
  const achado = PRECO_POR_PLANO.find(([preco]) => Math.abs(n - preco) < 1);
  return achado ? achado[1] : null;
}

export interface ResultadoPlano {
  plano: PlanoCompra;
  /** Como foi decidido. Vai para o log, para dar o que investigar. */
  origem: "checkout" | "nome" | "valor" | "padrao";
}

export function planoDaCompra(data: Record<string, unknown>): ResultadoPlano {
  const offer = (data?.offer ?? {}) as Record<string, unknown>;
  const texto = [
    String(data?.checkoutUrl ?? ""),
    String(offer?.name ?? ""),
    String(offer?.id ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  for (const [id, plano] of Object.entries(CHECKOUTS)) {
    if (texto.includes(id)) return { plano, origem: "checkout" };
  }

  const doNome = porNome(texto);
  if (doNome) return { plano: doNome, origem: "nome" };

  const doValor = porValor(data?.amount ?? data?.baseAmount ?? offer?.price);
  if (doValor) return { plano: doValor, origem: "valor" };

  // Não reconheceu nada. Cai no mais barato de propósito: liberar demais é
  // silencioso e permanente, enquanto liberar de menos vira mensagem no
  // suporte no mesmo dia e é corrigido pelo painel admin.
  return { plano: "essencial", origem: "padrao" };
}

/** Só o Deluxe é vitalício. Os outros valem 30 dias. */
export function validadeEmIso(plano: PlanoCompra, agora = Date.now()): string | null {
  if (plano === "deluxe") return null;
  return new Date(agora + 30 * 24 * 60 * 60 * 1000).toISOString();
}
