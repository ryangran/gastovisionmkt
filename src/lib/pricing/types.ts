export type PlatformKey =
  | "shopee"
  | "mercadolivre"
  | "amazon"
  | "magalu"
  | "tiktok"
  | "shein";

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  shopee: "Shopee",
  mercadolivre: "Mercado Livre",
  amazon: "Amazon",
  magalu: "Magalu",
  tiktok: "TikTok Shop",
  shein: "Shein",
};

/** Uma linha da composição do preço, para mostrar de onde saiu o número. */
export interface LinhaDetalhe {
  label: string;
  valor: number;
  /** true quando o valor soma na receita (ex.: subsídio Pix). */
  credito?: boolean;
}

/** Campos que toda plataforma consome. */
export interface BaseInput {
  precoVenda: number;
  custoProduto: number;
  impostoPercent: number;
  marketingPercent: number;
}

export interface PricingResult {
  precoVenda: number;
  custoProduto: number;
  valorComissao: number;
  valorImposto: number;
  valorMarketing: number;
  valorFrete: number;
  subsidio: number;
  receitaLiquida: number;
  lucro: number;
  /** Margem sobre o preço de venda, em pontos percentuais (18.5 = 18,5%). */
  margemPercent: number;
  lucrativo: boolean;
  detalhes: LinhaDetalhe[];
}

/** Resultado neutro, devolvido quando o preço ainda não foi informado. */
export const RESULTADO_VAZIO: PricingResult = {
  precoVenda: 0,
  custoProduto: 0,
  valorComissao: 0,
  valorImposto: 0,
  valorMarketing: 0,
  valorFrete: 0,
  subsidio: 0,
  receitaLiquida: 0,
  lucro: 0,
  margemPercent: 0,
  lucrativo: false,
  detalhes: [],
};
