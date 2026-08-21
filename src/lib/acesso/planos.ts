import { linkWhatsApp } from "@/lib/contato";

export type PlanoId = "mensal" | "vitalicio";

export interface Plano {
  id: PlanoId;
  nome: string;
  /** Em reais. */
  preco: number;
  /** Preço riscado, quando existe âncora. */
  precoDe?: number;
  periodo: string;
  chamada: string;
  itens: string[];
  destaque?: boolean;
  /**
   * URL do checkout. Enquanto estiver vazia o botão cai no WhatsApp, que é
   * como a venda acontece hoje. Basta colar o link aqui para o botão passar a
   * levar direto para o pagamento, sem mexer em mais nada.
   */
  checkoutUrl?: string;
}

const ITENS_COMUNS = [
  "As seis calculadoras, uma por marketplace",
  "Comparador entre as seis plataformas",
  "Precificação reversa por margem",
  "Calculadora de anúncios com ROAS de equilíbrio",
  "Painel de estoque e margem da carteira",
  "Produtos salvos, sem limite",
  "Embalagem e etiqueta reutilizáveis",
  "Perfil com regime tributário",
  "RPA de afiliados da Shopee",
  "Aviso quando um marketplace muda a taxa",
];

export const PLANOS: Plano[] = [
  {
    id: "mensal",
    nome: "Mensal",
    preco: 19.9,
    periodo: "por mês",
    chamada: "Para testar sem compromisso de longo prazo.",
    itens: ITENS_COMUNS,
    checkoutUrl: undefined,
  },
  {
    id: "vitalicio",
    nome: "Vitalício",
    preco: 97,
    precoDe: 197,
    periodo: "pagamento único",
    chamada: "Paga uma vez e nunca mais. Atualizações de taxa incluídas.",
    itens: [...ITENS_COMUNS, "Atualizações vitalícias, incluindo as taxas"],
    destaque: true,
    checkoutUrl: undefined,
  },
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
