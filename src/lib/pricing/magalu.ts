import type { BaseInput, LinhaDetalhe, PricingResult } from "./types";
import { RESULTADO_VAZIO } from "./types";

/** Uma faixa de peso na tabela de frete "Preço Certo" da Magalu. */
export interface MagaluFreteFaixa {
  label: string;
  maxKg: number;
  semDesconto: number;
  desconto25: number;
  desconto50: number;
  desconto75: number;
}

export type MagaluDescontoFrete = "sem_desconto" | "desconto_25" | "desconto_50" | "desconto_75";
export type MagaluTipoProduto = "leves" | "pesados";

export interface MagaluTaxas {
  /** Comissão fixa da Magalu, em fração (0.18 = 18%). */
  comissaoPercent: number;
  /** Tabela de frete "Preço Certo", por faixa de peso (kg) e nível de desconto. */
  freteTabela: MagaluFreteFaixa[];
}

export const MAGALU_TAXAS: MagaluTaxas = {
  comissaoPercent: 0.18, // 18% fixo
  freteTabela: [
    { label: "Até 500g",           maxKg: 0.5,   semDesconto: 35.90, desconto25: 26.93, desconto50: 17.95, desconto75: 8.98 },
    { label: "De 500g a 1kg",      maxKg: 1,     semDesconto: 40.80, desconto25: 30.68, desconto50: 20.45, desconto75: 10.20 },
    { label: "De 1kg a 2kg",       maxKg: 2,     semDesconto: 42.90, desconto25: 32.18, desconto50: 21.45, desconto75: 10.73 },
    { label: "De 2kg a 5kg",       maxKg: 5,     semDesconto: 50.90, desconto25: 38.18, desconto50: 25.45, desconto75: 12.73 },
    { label: "De 5kg a 9kg",       maxKg: 9,     semDesconto: 77.90, desconto25: 58.43, desconto50: 38.95, desconto75: 19.48 },
    { label: "De 9kg a 13kg",      maxKg: 13,    semDesconto: 98.00, desconto25: 74.18, desconto50: 49.45, desconto75: 24.50 },
    { label: "De 13kg a 17kg",     maxKg: 17,    semDesconto: 111.90, desconto25: 83.93, desconto50: 55.95, desconto75: 27.98 },
    { label: "De 17kg a 23kg",     maxKg: 23,    semDesconto: 134.90, desconto25: 101.18, desconto50: 67.45, desconto75: 33.73 },
    { label: "De 23kg a 30kg",     maxKg: 30,    semDesconto: 148.90, desconto25: 111.68, desconto50: 74.45, desconto75: 37.23 },
    { label: "De 30kg a 40kg",     maxKg: 40,    semDesconto: 179.90, desconto25: 134.93, desconto50: 89.95, desconto75: 44.98 },
    { label: "De 40kg a 50kg",     maxKg: 50,    semDesconto: 189.90, desconto25: 142.43, desconto50: 94.95, desconto75: 47.48 },
    { label: "De 50kg a 60kg",     maxKg: 60,    semDesconto: 199.90, desconto25: 149.93, desconto50: 99.95, desconto75: 49.98 },
    { label: "De 60kg a 70kg",     maxKg: 70,    semDesconto: 209.90, desconto25: 157.43, desconto50: 104.95, desconto75: 52.48 },
    { label: "De 70kg a 80kg",     maxKg: 80,    semDesconto: 219.90, desconto25: 164.93, desconto50: 109.95, desconto75: 54.98 },
    { label: "De 80kg a 90kg",     maxKg: 90,    semDesconto: 229.90, desconto25: 172.43, desconto50: 114.95, desconto75: 57.48 },
    { label: "De 90kg a 100kg",    maxKg: 100,   semDesconto: 239.90, desconto25: 179.93, desconto50: 119.95, desconto75: 59.98 },
    { label: "De 100kg a 110kg",   maxKg: 110,   semDesconto: 249.90, desconto25: 187.43, desconto50: 124.95, desconto75: 62.48 },
    { label: "De 110kg a 120kg",   maxKg: 120,   semDesconto: 259.90, desconto25: 194.93, desconto50: 129.95, desconto75: 64.98 },
    { label: "De 120kg a 130kg",   maxKg: 130,   semDesconto: 269.90, desconto25: 202.43, desconto50: 134.95, desconto75: 67.48 },
    { label: "De 130kg a 140kg",   maxKg: 140,   semDesconto: 279.90, desconto25: 209.93, desconto50: 139.95, desconto75: 69.98 },
    { label: "De 140kg a 150kg",   maxKg: 150,   semDesconto: 289.90, desconto25: 217.43, desconto50: 144.95, desconto75: 72.48 },
    { label: "De 150kg a 160kg",   maxKg: 160,   semDesconto: 299.90, desconto25: 224.93, desconto50: 149.95, desconto75: 74.98 },
    { label: "De 160kg a 170kg",   maxKg: 170,   semDesconto: 309.90, desconto25: 232.43, desconto50: 154.95, desconto75: 77.48 },
    { label: "De 170kg a 180kg",   maxKg: 180,   semDesconto: 319.90, desconto25: 239.93, desconto50: 159.95, desconto75: 79.98 },
    { label: "De 180kg a 190kg",   maxKg: 190,   semDesconto: 329.90, desconto25: 247.43, desconto50: 164.95, desconto75: 82.48 },
    { label: "De 190kg a 200kg",   maxKg: 200,   semDesconto: 339.90, desconto25: 254.93, desconto50: 169.95, desconto75: 84.98 },
    { label: "Acima de 200kg",     maxKg: Infinity, semDesconto: 349.90, desconto25: 262.43, desconto50: 174.95, desconto75: 87.48 },
  ],
};

/** Peso cubado = Altura(m) × Largura(m) × Comprimento(m) × fator (167 leves / 300 pesados). */
export function calcularPesoCubadoMagalu(
  alturaM: number,
  larguraM: number,
  comprimentoM: number,
  tipo: MagaluTipoProduto,
): number {
  const fator = tipo === "leves" ? 167 : 300;
  return alturaM * larguraM * comprimentoM * fator;
}

/** Encontra a faixa de frete cujo limite de peso comporta o peso informado. */
export function faixaFreteMagalu(
  pesoKg: number,
  tabela: MagaluFreteFaixa[] = MAGALU_TAXAS.freteTabela,
): MagaluFreteFaixa {
  return tabela.find((f) => pesoKg <= f.maxKg) ?? tabela[tabela.length - 1];
}

function valorFreteMagalu(faixa: MagaluFreteFaixa, desconto: MagaluDescontoFrete): number {
  if (desconto === "desconto_75") return faixa.desconto75;
  if (desconto === "desconto_50") return faixa.desconto50;
  if (desconto === "desconto_25") return faixa.desconto25;
  return faixa.semDesconto;
}

export interface MagaluInput extends BaseInput {
  tipoProduto: MagaluTipoProduto;
  descontoFrete: MagaluDescontoFrete;
  /** Peso real informado pelo lojista, em kg. */
  pesoKg: number;
  /** Dimensões em centímetros (convertidas para metros no cálculo de cubagem). */
  comprimento: number;
  largura: number;
  altura: number;
  /** Tarifa fixa cobrada por pedido, em R$ (não é percentual). */
  taxaFixa: number;
  usarFrete: boolean;
}

export function calcularMagalu(
  input: MagaluInput,
  taxas: MagaluTaxas = MAGALU_TAXAS,
): PricingResult {
  const {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent,
    marketingPercent,
    tipoProduto,
    descontoFrete,
    pesoKg,
    comprimento,
    largura,
    altura,
    taxaFixa,
    usarFrete,
  } = input;

  if (preco <= 0) return { ...RESULTADO_VAZIO, custoProduto: custo };

  const alturaM = altura / 100;
  const larguraM = largura / 100;
  const comprimentoM = comprimento / 100;

  const pesoCubado =
    alturaM > 0 && larguraM > 0 && comprimentoM > 0
      ? calcularPesoCubadoMagalu(alturaM, larguraM, comprimentoM, tipoProduto)
      : 0;
  const pesoFinal = Math.max(pesoKg, pesoCubado);

  const faixa = usarFrete && pesoFinal > 0 ? faixaFreteMagalu(pesoFinal, taxas.freteTabela) : null;
  const valorFrete = faixa ? valorFreteMagalu(faixa, descontoFrete) : 0;

  const valorComissao = preco * taxas.comissaoPercent;
  const valorTaxaFixa = taxaFixa;
  const valorImposto = preco * (impostoPercent / 100);
  const valorMarketing = preco * (marketingPercent / 100);

  const receitaLiquida = preco - valorComissao - valorTaxaFixa - valorImposto - valorMarketing - valorFrete;
  const lucro = receitaLiquida - custo;

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    { label: `Comissão Magalu (${(taxas.comissaoPercent * 100).toFixed(0)}%)`, valor: valorComissao },
    { label: "Taxa fixa", valor: valorTaxaFixa },
    { label: "Frete Preço Certo", valor: valorFrete },
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
