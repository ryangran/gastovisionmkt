import type { BaseInput, LinhaDetalhe, PricingResult } from "./types";
import { RESULTADO_VAZIO } from "./types";

/** Uma faixa de peso (kg) da tabela de frete do Mercado Livre — limite superior. */
interface MercadoLivrePesoFaixa {
  label: string;
  min: number;
  max: number;
}

/** Uma faixa de preço (R$) da tabela de frete do Mercado Livre — limite superior. */
interface MercadoLivreFaixaPreco {
  label: string;
  max: number;
}

/**
 * Custo fixo cobrado pelo Mercado Livre por venda, em função do preço.
 * Abaixo de `limiar`, o custo é `percentualAbaixo` do preço (ex.: metade do preço).
 * Acima do limiar, usa a primeira faixa de `faixas` cujo `max` comporte o preço;
 * se nenhuma faixa comportar, o custo fixo é zero.
 */
interface MercadoLivreCustoFixoConfig {
  limiar: number;
  percentualAbaixo: number;
  faixas: { max: number; valor: number }[];
}

export interface MercadoLivreTaxas {
  /** Faixas de peso (kg), na ordem usada para indexar `freteTabela`. */
  pesos: MercadoLivrePesoFaixa[];
  /** Faixas de preço (R$), na ordem usada para indexar `freteTabela`. */
  faixasPreco: MercadoLivreFaixaPreco[];
  /** Tabela de frete por [pesoIdx][faixaPrecoIdx]. */
  freteTabela: number[][];
  /** Custo fixo de venda do Mercado Livre, cobrado independente do frete. */
  custoFixo: MercadoLivreCustoFixoConfig;
}

export const MERCADOLIVRE_TAXAS: MercadoLivreTaxas = {
  // Faixas de peso (kg) — limites superiores
  pesos: [
    { label: "Até 0,3 kg", min: 0, max: 0.3 },
    { label: "De 0,3 a 0,5 kg", min: 0.3, max: 0.5 },
    { label: "De 0,5 a 1 kg", min: 0.5, max: 1 },
    { label: "De 1 a 1,5 kg", min: 1, max: 1.5 },
    { label: "De 1,5 a 2 kg", min: 1.5, max: 2 },
    { label: "De 2 a 3 kg", min: 2, max: 3 },
    { label: "De 3 a 4 kg", min: 3, max: 4 },
    { label: "De 4 a 5 kg", min: 4, max: 5 },
    { label: "De 5 a 6 kg", min: 5, max: 6 },
    { label: "De 6 a 7 kg", min: 6, max: 7 },
    { label: "De 7 a 8 kg", min: 7, max: 8 },
    { label: "De 8 a 9 kg", min: 8, max: 9 },
    { label: "De 9 a 11 kg", min: 9, max: 11 },
    { label: "De 11 a 13 kg", min: 11, max: 13 },
    { label: "De 13 a 15 kg", min: 13, max: 15 },
    { label: "De 15 a 17 kg", min: 15, max: 17 },
    { label: "De 17 a 20 kg", min: 17, max: 20 },
  ],
  // Faixas de preço: 0-18.99 | 19-48.99 | 49-78.99 | 79-99.99 | 100-119.99 | 120-149.99 | 150-199.99 | 200+
  faixasPreco: [
    { label: "R$0–18,99", max: 18.99 },
    { label: "R$19–48,99", max: 48.99 },
    { label: "R$49–78,99", max: 78.99 },
    { label: "R$79–99,99", max: 99.99 },
    { label: "R$100–119,99", max: 119.99 },
    { label: "R$120–149,99", max: 149.99 },
    { label: "R$150–199,99", max: 199.99 },
    { label: "A partir de R$200", max: Infinity },
  ],
  // Tabela de frete por [pesoIdx][faixaPrecoIdx]
  freteTabela: [
    [5.65, 6.55, 7.75, 12.35, 14.35, 16.45, 18.45, 20.95],
    [5.95, 6.65, 7.85, 13.25, 15.45, 17.65, 19.85, 22.55],
    [6.05, 6.75, 7.95, 13.85, 16.15, 18.45, 20.75, 23.65],
    [6.15, 6.85, 8.05, 14.15, 16.45, 18.85, 21.15, 24.65],
    [6.25, 6.95, 8.15, 14.45, 16.85, 19.25, 21.65, 24.65],
    [6.35, 7.95, 8.55, 15.75, 18.35, 21.05, 23.65, 26.25],
    [6.45, 8.15, 8.95, 17.05, 19.85, 22.65, 25.55, 28.35],
    [6.55, 8.35, 9.75, 18.45, 21.55, 24.65, 27.75, 30.75],
    [6.65, 8.55, 9.95, 25.45, 28.55, 32.65, 35.75, 39.75],
    [6.75, 8.75, 10.15, 27.05, 31.05, 36.05, 40.05, 44.05],
    [6.85, 8.95, 10.35, 28.85, 33.65, 38.45, 43.25, 48.05],
    [6.95, 9.15, 10.55, 29.65, 34.55, 39.55, 44.45, 49.35],
    [7.05, 9.55, 10.95, 41.25, 48.05, 54.95, 61.75, 68.65],
    [7.15, 9.95, 11.35, 42.15, 49.25, 56.25, 63.25, 70.25],
    [7.25, 10.15, 11.55, 45.05, 52.45, 59.95, 67.45, 74.95],
    [7.35, 10.35, 11.75, 48.55, 56.05, 63.55, 70.75, 78.65],
    [7.45, 10.55, 11.95, 54.75, 63.85, 72.95, 82.05, 91.15],
  ],
  // Custo fixo ML por faixa de preço
  custoFixo: {
    limiar: 12.5,
    percentualAbaixo: 0.5, // metade do preço
    faixas: [
      { max: 29, valor: 6.25 },
      { max: 50, valor: 6.5 },
      { max: 79, valor: 6.75 },
      // acima de R$79 não tem custo fixo (fica de fora das faixas -> retorna 0)
    ],
  },
};

/** Encontra o índice da faixa de peso cujo limite comporta o peso informado. */
function pesoIdx(peso: number, pesos: MercadoLivrePesoFaixa[]): number {
  const idx = pesos.findIndex((p) => peso <= p.max);
  return idx === -1 ? pesos.length - 1 : idx;
}

/** Encontra o índice da faixa de preço cujo limite comporta o preço informado. */
function faixaPrecoIdx(preco: number, faixas: MercadoLivreFaixaPreco[]): number {
  const idx = faixas.findIndex((f) => preco <= f.max);
  return idx === -1 ? faixas.length - 1 : idx;
}

/** Valor do frete Mercado Livre, por peso × faixa de preço. */
function freteMercadoLivre(preco: number, peso: number, taxas: MercadoLivreTaxas): number {
  const pi = pesoIdx(peso, taxas.pesos);
  const fi = faixaPrecoIdx(preco, taxas.faixasPreco);
  return taxas.freteTabela[pi][fi];
}

/** Custo fixo de venda cobrado pelo Mercado Livre, em função do preço. */
function custoFixoMercadoLivre(preco: number, cfg: MercadoLivreCustoFixoConfig): number {
  if (preco < cfg.limiar) return preco * cfg.percentualAbaixo;
  const faixa = cfg.faixas.find((f) => preco <= f.max);
  return faixa ? faixa.valor : 0;
}

export interface MercadoLivreInput extends BaseInput {
  tipoAnuncio: "classico" | "premium";
  /** Nome da categoria selecionada em `categorias`. */
  produto: string;
  /** Categorias cadastradas, com a comissão (fração, 0.115 = 11,5%) de cada tipo de anúncio. */
  categorias: { nome: string; classicoPerc: number; premiumPerc: number }[];
  /** Peso do produto, em kg — usado apenas quando `usarFrete` é true. */
  pesoKg: number;
  /** Espelha o switch "Nós oferecemos entrega" da UI. */
  usarFrete: boolean;
}

export function calcularMercadoLivre(
  input: MercadoLivreInput,
  taxas: MercadoLivreTaxas = MERCADOLIVRE_TAXAS,
): PricingResult {
  const {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent,
    marketingPercent,
    tipoAnuncio,
    produto: produtoNome,
    categorias,
    pesoKg,
    usarFrete,
  } = input;

  if (preco <= 0) return { ...RESULTADO_VAZIO, custoProduto: custo };

  const produto = categorias.find((p) => p.nome === produtoNome) ?? categorias[0] ?? null;
  const comissaoPerc = tipoAnuncio === "classico" ? (produto?.classicoPerc ?? 0) : (produto?.premiumPerc ?? 0);

  const valorComissaoPerc = preco * comissaoPerc;
  const valorCustoFixo = custoFixoMercadoLivre(preco, taxas.custoFixo);
  // Comissão percentual + custo fixo de venda, somados no mesmo campo (como no modelo Shopee,
  // que combina percentual + fixo em `valorComissao`).
  const valorComissao = valorComissaoPerc + valorCustoFixo;
  const valorImposto = preco * (impostoPercent / 100);
  const valorMarketing = preco * (marketingPercent / 100);
  const valorFrete = usarFrete && pesoKg > 0 ? freteMercadoLivre(preco, pesoKg, taxas) : 0;

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing - valorFrete;
  const lucro = receitaLiquida - custo;

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    { label: `Comissão (${(comissaoPerc * 100).toFixed(1)}%)`, valor: valorComissaoPerc },
    { label: "Custo fixo ML", valor: valorCustoFixo },
    { label: "Frete", valor: valorFrete },
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
