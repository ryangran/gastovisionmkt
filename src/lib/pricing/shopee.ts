import type { BaseInput, LinhaDetalhe, PricingResult } from "./types";
import { RESULTADO_VAZIO } from "./types";

export interface ShopeeFaixa {
  max: number;
  percentual: number;
  fixo: number;
  /** Taxa fixa como percentual do item, usada na faixa abaixo de R$8. */
  fixoPercentual?: number;
  subsidioPix: number;
}

export type ShopeeTaxas = ShopeeFaixa[];

export const SHOPEE_TAXAS: ShopeeTaxas = [
  { max: 7.99, percentual: 0.2, fixo: 0, fixoPercentual: 0.5, subsidioPix: 0 },
  { max: 79.99, percentual: 0.2, fixo: 4, subsidioPix: 0 },
  { max: 99.99, percentual: 0.14, fixo: 16, subsidioPix: 0.05 },
  { max: 199.99, percentual: 0.14, fixo: 20, subsidioPix: 0.05 },
  { max: 499.99, percentual: 0.14, fixo: 26, subsidioPix: 0.05 },
  { max: Infinity, percentual: 0.14, fixo: 26, subsidioPix: 0.08 },
];

export function faixaShopee(preco: number, taxas: ShopeeTaxas = SHOPEE_TAXAS): ShopeeFaixa {
  return taxas.find((f) => preco <= f.max) ?? taxas[taxas.length - 1];
}

function taxaFixaShopee(faixa: ShopeeFaixa, preco: number): number {
  return faixa.fixoPercentual ? preco * faixa.fixoPercentual : faixa.fixo;
}

export interface ShopeeInput extends BaseInput {
  usarSubsidioPix: boolean;
}

export function calcularShopee(
  input: ShopeeInput,
  taxas: ShopeeTaxas = SHOPEE_TAXAS,
): PricingResult {
  const { precoVenda: preco, custoProduto: custo, impostoPercent, marketingPercent } = input;
  if (preco <= 0) return { ...RESULTADO_VAZIO, custoProduto: custo };

  const extras = input.custosExtras ?? 0;

  const faixa = faixaShopee(preco, taxas);
  const valorComissao = preco * faixa.percentual + taxaFixaShopee(faixa, preco);
  const valorImposto = preco * (impostoPercent / 100);
  const valorMarketing = preco * (marketingPercent / 100);
  const subsidio = input.usarSubsidioPix ? preco * faixa.subsidioPix : 0;

  const receitaLiquida = preco + subsidio - valorComissao - valorImposto - valorMarketing;
  const lucro = receitaLiquida - custo - extras;

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    { label: `Comissão (${(faixa.percentual * 100).toFixed(0)}% + fixo)`, valor: valorComissao },
    { label: "Imposto", valor: valorImposto },
    { label: "Marketing", valor: valorMarketing },
    { label: "Subsídio Pix", valor: subsidio, credito: true },
    { label: "Embalagem e etiqueta", valor: extras },
    { label: "Custo do produto", valor: custo },
  ].filter((l) => l.valor !== 0);

  return {
    precoVenda: preco,
    custoProduto: custo,
    valorComissao,
    valorImposto,
    valorMarketing,
    valorFrete: 0,
    custosExtras: extras,
    subsidio,
    receitaLiquida,
    lucro,
    margemPercent: (lucro / preco) * 100,
    lucrativo: lucro > 0,
    detalhes,
  };
}
