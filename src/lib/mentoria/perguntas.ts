import type { MarketplaceKey } from "@/components/MarketplaceLogo";

/** Número que recebe os leads, em formato internacional para o link wa.me. */
export const WHATSAPP_DESTINO = "5511944804280";

export interface Opcao<T extends string = string> {
  valor: T;
  rotulo: string;
  /** Linha de apoio, quando o rótulo sozinho deixa dúvida. */
  ajuda?: string;
}

export const FATURAMENTOS: Opcao[] = [
  { valor: "ainda_nao_vendo", rotulo: "Ainda não vendo", ajuda: "Quero começar do jeito certo" },
  { valor: "ate_5k", rotulo: "Até R$5 mil por mês" },
  { valor: "5k_20k", rotulo: "R$5 mil a R$20 mil por mês" },
  { valor: "20k_50k", rotulo: "R$20 mil a R$50 mil por mês" },
  { valor: "50k_100k", rotulo: "R$50 mil a R$100 mil por mês" },
  { valor: "acima_100k", rotulo: "Acima de R$100 mil por mês" },
];

export const PLATAFORMAS: { valor: MarketplaceKey; rotulo: string }[] = [
  { valor: "shopee", rotulo: "Shopee" },
  { valor: "mercadolivre", rotulo: "Mercado Livre" },
  { valor: "amazon", rotulo: "Amazon" },
  { valor: "magalu", rotulo: "Magalu" },
  { valor: "tiktok", rotulo: "TikTok Shop" },
  { valor: "shein", rotulo: "Shein" },
];

export const TEMPOS: Opcao[] = [
  { valor: "nao_comecei", rotulo: "Ainda não comecei" },
  { valor: "menos_6m", rotulo: "Menos de 6 meses" },
  { valor: "6m_2a", rotulo: "De 6 meses a 2 anos" },
  { valor: "mais_2a", rotulo: "Mais de 2 anos" },
];

export const PRECIFICACAO: Opcao[] = [
  { valor: "achismo", rotulo: "No olho", ajuda: "Olho o concorrente e coloco parecido" },
  { valor: "planilha", rotulo: "Planilha própria" },
  { valor: "calculadora_gratis", rotulo: "Calculadora grátis da internet" },
  { valor: "vetrex", rotulo: "Já uso a Vetrex" },
];

export const OBJETIVOS: Opcao[] = [
  { valor: "margem", rotulo: "Aumentar a margem do que já vendo" },
  { valor: "escalar", rotulo: "Escalar faturamento sem perder lucro" },
  { valor: "parar_prejuizo", rotulo: "Descobrir os produtos que dão prejuízo" },
  { valor: "ads", rotulo: "Fazer anúncio parar de comer o lucro" },
  { valor: "nova_plataforma", rotulo: "Entrar em um marketplace novo" },
  { valor: "estoque", rotulo: "Organizar estoque e capital parado" },
  { valor: "imposto", rotulo: "Entender o imposto do meu regime" },
];

export const URGENCIAS: Opcao[] = [
  { valor: "agora", rotulo: "Quero começar agora" },
  { valor: "30_dias", rotulo: "Nos próximos 30 dias" },
  { valor: "pesquisando", rotulo: "Só pesquisando por enquanto" },
];

export const STATUS_LEAD = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "contatado", rotulo: "Contatado" },
  { valor: "respondeu", rotulo: "Respondeu" },
  { valor: "fechado", rotulo: "Fechado" },
  { valor: "perdido", rotulo: "Perdido" },
] as const;

export type StatusLead = (typeof STATUS_LEAD)[number]["valor"];

/** Resolve o rótulo de um valor salvo. Sem match, devolve o próprio valor. */
export function rotuloDe(opcoes: readonly Opcao[], valor: string): string {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
}

export function rotulosDe(opcoes: readonly Opcao[], valores: string[]): string[] {
  return valores.map((v) => rotuloDe(opcoes, v));
}

export interface RespostasMentoria {
  nome: string;
  telefone: string;
  email: string;
  faturamento: string;
  plataformas: string[];
  tempo_vendendo: string;
  precifica_hoje: string;
  objetivos: string[];
  urgencia: string;
  dor: string;
}

export const RESPOSTAS_VAZIAS: RespostasMentoria = {
  nome: "",
  telefone: "",
  email: "",
  faturamento: "",
  plataformas: [],
  tempo_vendendo: "",
  precifica_hoje: "",
  objetivos: [],
  urgencia: "",
  dor: "",
};
