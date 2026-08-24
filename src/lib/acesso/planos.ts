import { linkWhatsApp } from "@/lib/contato";

/**
 * Os três planos e o que cada um libera.
 *
 * A matriz `RECURSOS_POR_PLANO` é a fonte única: as rotas, a barra lateral e a
 * tabela comparativa leem daqui. Antes o acesso era tudo-ou-nada, e a regra
 * vivia espalhada como `pago: true`.
 */

export type PlanoId = "essencial" | "plus" | "deluxe";

/** Cada área da plataforma que um plano pode ou não liberar. */
export type Recurso =
  | "calculadora"
  | "perfil"
  | "dashboard"
  | "comparador"
  | "ads"
  | "produtosSalvos"
  | "rpa"
  | "fornecedores";

export const RECURSOS_POR_PLANO: Record<PlanoId, readonly Recurso[]> = {
  essencial: ["calculadora", "perfil"],
  plus: ["calculadora", "perfil", "dashboard", "comparador", "ads", "produtosSalvos", "rpa"],
  deluxe: [
    "calculadora",
    "perfil",
    "dashboard",
    "comparador",
    "ads",
    "produtosSalvos",
    "rpa",
    "fornecedores",
  ],
};

/** Do mais barato para o mais completo. Serve para ordenar e comparar nível. */
export const ORDEM_PLANOS: readonly PlanoId[] = ["essencial", "plus", "deluxe"];

export function planoLibera(plano: PlanoId | null, recurso: Recurso): boolean {
  if (!plano) return false;
  return RECURSOS_POR_PLANO[plano].includes(recurso);
}

/** O plano mais barato que libera o recurso, para a tela dizer o que comprar. */
export function menorPlanoCom(recurso: Recurso): PlanoId {
  const encontrado = ORDEM_PLANOS.find((p) => planoLibera(p, recurso));
  if (!encontrado) throw new Error(`Nenhum plano libera o recurso: ${recurso}`);
  return encontrado;
}

export interface Plano {
  id: PlanoId;
  nome: string;
  /** Em reais. */
  preco: number;
  /** Preço riscado, quando existe âncora. */
  precoDe?: number;
  periodo: string;
  chamada: string;
  /** Bullets do cartão. A tabela comparativa usa a matriz, não estes. */
  itens: string[];
  /** Benefício que não é uma área do sistema. */
  bonus?: string;
  destaque?: boolean;
  /**
   * URL do checkout. Enquanto estiver vazia o botão cai no WhatsApp, que é
   * como a venda acontece hoje. Basta colar o link aqui para o botão passar a
   * levar direto para o pagamento, sem mexer em mais nada.
   */
  checkoutUrl?: string;
}

export const PLANOS: Plano[] = [
  {
    id: "essencial",
    nome: "Vetrex Essencial",
    preco: 29.9,
    periodo: "por mês",
    chamada: "As seis calculadoras sem limite de uso. O básico bem feito.",
    itens: [
      "As seis calculadoras, uma por marketplace",
      "Precificação reversa por margem",
      "Sem limite de cálculos por dia",
      "Perfil com regime tributário",
      "Atualizações de taxa dos marketplaces",
    ],
    checkoutUrl: undefined,
  },
  {
    id: "plus",
    nome: "Vetrex Plus",
    preco: 67.9,
    periodo: "por mês",
    chamada: "A plataforma inteira, menos o catálogo de fornecedores.",
    itens: [
      "Tudo do Essencial",
      "Comparador entre os seis marketplaces",
      "Calculadora de anúncios com ROAS de equilíbrio",
      "Painel de estoque e margem da carteira",
      "Produtos salvos, sem limite",
      "RPA de afiliados da Shopee",
    ],
    destaque: true,
    checkoutUrl: undefined,
  },
  {
    id: "deluxe",
    nome: "Vetrex Deluxe",
    preco: 197,
    periodo: "pagamento único",
    chamada: "Tudo, para sempre, com os fornecedores junto.",
    itens: [
      "Tudo do Plus",
      "Catálogo com 587 fornecedores e contato no WhatsApp",
      "Pagamento único, sem mensalidade",
      "Atualizações vitalícias, incluindo as taxas",
    ],
    bonus: "1 diagnóstico em call, gratuito",
    checkoutUrl: undefined,
  },
];

/** Rótulo de cada recurso na tabela comparativa. */
export const NOME_RECURSO: Record<Recurso, string> = {
  calculadora: "Calculadoras dos seis marketplaces",
  perfil: "Perfil com regime tributário",
  dashboard: "Painel de estoque e margem",
  comparador: "Comparador entre marketplaces",
  ads: "Calculadora de anúncios",
  produtosSalvos: "Produtos salvos",
  rpa: "RPA de afiliados da Shopee",
  fornecedores: "Catálogo de fornecedores",
};

/** Ordem das linhas da tabela comparativa. */
export const RECURSOS_COMPARATIVO: readonly Recurso[] = [
  "calculadora",
  "perfil",
  "comparador",
  "ads",
  "dashboard",
  "produtosSalvos",
  "rpa",
  "fornecedores",
];

export function planoPorId(id: PlanoId): Plano {
  const p = PLANOS.find((x) => x.id === id);
  if (!p) throw new Error(`Plano desconhecido: ${id}`);
  return p;
}

/** Formata em reais, escondendo os centavos quando são zero. */
export function precoBR(valor: number): string {
  const centavos = Math.round(valor * 100) % 100;
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: centavos === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function mensagemAssinatura(plano: Plano): string {
  return [
    `Olá! Quero assinar o plano ${plano.nome} da Vetrex.`,
    "",
    `Valor: ${precoBR(plano.preco)} ${plano.periodo}.`,
    "",
    "Pode me passar como faço o pagamento?",
  ].join("\n");
}

export function linkAssinatura(plano: Plano): string {
  return plano.checkoutUrl ?? linkWhatsApp(mensagemAssinatura(plano));
}

/** Verdadeiro quando o botão vai levar para uma conversa e não para o checkout. */
export function assinaturaPeloWhatsApp(plano: Plano): boolean {
  return !plano.checkoutUrl;
}
