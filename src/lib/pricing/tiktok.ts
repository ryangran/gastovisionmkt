import type { BaseInput, LinhaDetalhe, PricingResult } from "./types";
import { RESULTADO_VAZIO } from "./types";

/**
 * Faixa de comissão do TikTok Shop.
 * `limite` é a fronteira exclusiva da faixa (preco < limite pertence a ela),
 * espelhando o `if (preco < 50) ... else ...` original do componente.
 */
export interface TikTokFaixa {
  limite: number;
  comissao: number;
  taxaFixa: number;
}

export type TikTokTaxas = TikTokFaixa[];

export const TIKTOK_TAXAS: TikTokTaxas = [
  { limite: 50, comissao: 0.1, taxaFixa: 4.0 },
  { limite: Infinity, comissao: 0.06, taxaFixa: 6.0 },
];

/** Taxa adicional cobrada sobre o preço de venda quando o frete grátis está ativo (+6%). */
export const TIKTOK_FRETE_GRATIS_PERCENTUAL = 0.06;

export function faixaTiktok(preco: number, taxas: TikTokTaxas = TIKTOK_TAXAS): TikTokFaixa {
  return taxas.find((f) => preco < f.limite) ?? taxas[taxas.length - 1];
}

export interface TikTokInput extends BaseInput {
  /** Ativa a taxa adicional de frete grátis (+6% sobre o preço de venda). */
  freteGratis: boolean;
  /** Zera a comissão percentual quando o vendedor está no Programa de Incentivo. */
  incentivoComissao: boolean;
}

export function calcularTikTok(
  input: TikTokInput,
  taxas: TikTokTaxas = TIKTOK_TAXAS,
): PricingResult {
  const { precoVenda: preco, custoProduto: custo, impostoPercent, marketingPercent } = input;
  if (preco <= 0) return { ...RESULTADO_VAZIO, custoProduto: custo };

  const extras = input.custosExtras ?? 0;

  const faixa = faixaTiktok(preco, taxas);
  const comissaoPerc = input.incentivoComissao ? 0 : faixa.comissao;
  const freteGratisPerc = input.freteGratis ? TIKTOK_FRETE_GRATIS_PERCENTUAL : 0;

  // Taxa fixa por item é cobrada independentemente do incentivo de comissão,
  // por isso é somada dentro de valorComissao (mesmo padrão do módulo Shopee).
  const valorComissao = preco * comissaoPerc + faixa.taxaFixa;
  const valorFrete = preco * freteGratisPerc;
  const valorImposto = preco * (impostoPercent / 100);
  const valorMarketing = preco * (marketingPercent / 100);

  const receitaLiquida = preco - valorComissao - valorFrete - valorImposto - valorMarketing;
  const lucro = receitaLiquida - custo - extras;

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    {
      label: `Comissão (${(comissaoPerc * 100).toFixed(0)}% + fixo)`,
      valor: valorComissao,
    },
    { label: "Taxa Frete Grátis (6%)", valor: valorFrete },
    { label: "Imposto", valor: valorImposto },
    { label: "Marketing", valor: valorMarketing },
    { label: "Embalagem e etiqueta", valor: extras },
    { label: "Custo do produto", valor: custo },
  ].filter((l) => l.valor !== 0);

  return {
    precoVenda: preco,
    custoProduto: custo,
    valorComissao,
    valorImposto,
    valorMarketing,
    valorFrete,
    custosExtras: extras,
    subsidio: 0,
    receitaLiquida,
    lucro,
    margemPercent: (lucro / preco) * 100,
    lucrativo: lucro > 0,
    detalhes,
  };
}
