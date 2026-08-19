import type { BaseInput, LinhaDetalhe, PricingResult } from "./types";
import { RESULTADO_VAZIO } from "./types";

/** Uma faixa de peso da tabela de frete Shein. */
export interface SheinFreteFaixa {
  label: string;
  maxKg: number;
  valor: number;
}

export interface SheinTaxas {
  comissaoPercent: number;
  frete: SheinFreteFaixa[];
}

export const SHEIN_TAXAS: SheinTaxas = {
  comissaoPercent: 0.16,
  frete: [
    { label: "Até 600g", maxKg: 0.6, valor: 4 },
    { label: "600g a 900g", maxKg: 0.9, valor: 6 },
    { label: "900g a 1,2kg", maxKg: 1.2, valor: 8 },
    { label: "1,2kg a 1,5kg", maxKg: 1.5, valor: 10 },
  ],
};

export interface SheinFreteInfo {
  faixa: SheinFreteFaixa | null;
  valor: number;
  pesoCubico: number;
  pesoUsado: number;
}

/**
 * Calcula o frete Shein a partir do peso real e das dimensões (peso cúbico).
 * Considera-se o maior entre peso real e peso cúbico: (C × L × A) / 6000.
 * Acima da última faixa (1,5kg) não há faixa correspondente, então o valor
 * cai no fallback da última faixa da tabela (comportamento original preservado).
 */
export function calcularFreteShein(
  pesoRealKg: number,
  comprimento: number,
  largura: number,
  altura: number,
  taxas: SheinTaxas = SHEIN_TAXAS,
): SheinFreteInfo {
  const pesoCubico = (comprimento * largura * altura) / 6000;
  const pesoUsado = Math.max(pesoRealKg, pesoCubico);
  const faixa = taxas.frete.find((f) => pesoUsado <= f.maxKg) ?? null;
  const valor = faixa ? faixa.valor : taxas.frete[taxas.frete.length - 1].valor;
  return { faixa, valor, pesoCubico, pesoUsado };
}

export interface SheinInput extends BaseInput {
  pesoKg: number;
  comprimento: number;
  largura: number;
  altura: number;
}

export function calcularShein(
  input: SheinInput,
  taxas: SheinTaxas = SHEIN_TAXAS,
): PricingResult {
  const {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent,
    marketingPercent,
    pesoKg,
    comprimento,
    largura,
    altura,
  } = input;
  if (preco <= 0) return { ...RESULTADO_VAZIO, custoProduto: custo };

  const freteInfo = calcularFreteShein(pesoKg, comprimento, largura, altura, taxas);
  const valorFrete =
    pesoKg > 0 || (comprimento > 0 && largura > 0 && altura > 0) ? freteInfo.valor : 0;

  const valorComissao = preco * taxas.comissaoPercent;
  const valorImposto = preco * (impostoPercent / 100);
  const valorMarketing = preco * (marketingPercent / 100);

  const receitaLiquida = preco - valorComissao - valorFrete - valorImposto - valorMarketing;
  const lucro = receitaLiquida - custo;

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    { label: `Comissão (${(taxas.comissaoPercent * 100).toFixed(0)}%)`, valor: valorComissao },
    { label: "Frete Shein", valor: valorFrete },
    { label: "Imposto", valor: valorImposto },
    { label: "Marketing", valor: valorMarketing },
    { label: "Custo do produto", valor: custo },
  ].filter((l) => l.valor !== 0);

  return {
    precoVenda: preco,
    custoProduto: custo,
    valorComissao,
    valorImposto,
    valorMarketing,
    valorFrete,
    subsidio: 0,
    receitaLiquida,
    lucro,
    margemPercent: (lucro / preco) * 100,
    lucrativo: lucro > 0,
    detalhes,
  };
}
