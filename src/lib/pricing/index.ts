import type { PlatformKey, PricingResult } from "./types";
import { calcularShopee, type ShopeeInput, type ShopeeTaxas } from "./shopee";
import {
  calcularMercadoLivre,
  type MercadoLivreInput,
  type MercadoLivreTaxas,
} from "./mercadolivre";
import { calcularAmazon, type AmazonInput, type AmazonTaxas } from "./amazon";
import { calcularMagalu, type MagaluInput, type MagaluTaxas } from "./magalu";
import { calcularTikTok, type TikTokInput, type TikTokTaxas } from "./tiktok";
import { calcularShein, type SheinInput, type SheinTaxas } from "./shein";

export * from "./types";

export interface PlatformInputMap {
  shopee: ShopeeInput;
  mercadolivre: MercadoLivreInput;
  amazon: AmazonInput;
  magalu: MagaluInput;
  tiktok: TikTokInput;
  shein: SheinInput;
}

export interface PlatformTaxasMap {
  shopee: ShopeeTaxas;
  mercadolivre: MercadoLivreTaxas;
  amazon: AmazonTaxas;
  magalu: MagaluTaxas;
  tiktok: TikTokTaxas;
  shein: SheinTaxas;
}

export const PLATFORM_KEYS: PlatformKey[] = [
  "shopee",
  "mercadolivre",
  "amazon",
  "magalu",
  "tiktok",
  "shein",
];

const CALCULADORAS = {
  shopee: calcularShopee,
  mercadolivre: calcularMercadoLivre,
  amazon: calcularAmazon,
  magalu: calcularMagalu,
  tiktok: calcularTikTok,
  shein: calcularShein,
} as const;

/**
 * Ponto único de entrada para calcular a margem em qualquer plataforma.
 *
 * O parâmetro `taxas` fica sem uso enquanto as tabelas vivem no código. Ele
 * existe desde já porque a fonte das taxas vai passar para o banco, e incluí-lo
 * depois obrigaria a mexer em todos os pontos de chamada.
 */
export function calcular<K extends PlatformKey>(
  platform: K,
  input: PlatformInputMap[K],
  taxas?: PlatformTaxasMap[K],
): PricingResult {
  const fn = CALCULADORAS[platform] as (
    i: PlatformInputMap[K],
    t?: PlatformTaxasMap[K],
  ) => PricingResult;
  return fn(input, taxas);
}
