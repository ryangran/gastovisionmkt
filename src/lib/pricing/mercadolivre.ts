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

/**
 * Tabela de Custos dos Envios do Mercado Livre.
 *
 * Vigência: 24 de agosto de 2026.
 * Fonte: vendedores.mercadolivre.com.br/knowledge-hub/48392
 *
 * Vale para Envios Full, Coleta e Agências, de todas as regiões do Brasil. O
 * Mercado Livre trata isso como custo operacional e cobra "em todos os casos,
 * mesmo quando o envio é pago pelo comprador" — por isso a calculadora aplica
 * sempre que houver peso, sem interruptor.
 *
 * A tabela cobre só o frete grátis padrão. Abaixo de R$79 o vendedor pode
 * optar por oferecer frete grátis e rápido, que custa bem mais (no exemplo do
 * próprio ML, R$16,45 contra R$8,65 num produto de 2,5 kg a R$20). Essa opção
 * fica de fora de propósito: assumimos sempre o padrão.
 */
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
    { label: "De 9 a 10 kg", min: 9, max: 10 },
    { label: "De 10 a 11 kg", min: 10, max: 11 },
    { label: "De 11 a 13 kg", min: 11, max: 13 },
    { label: "De 13 a 15 kg", min: 13, max: 15 },
    { label: "De 15 a 17 kg", min: 15, max: 17 },
    { label: "De 17 a 20 kg", min: 17, max: 20 },
    { label: "De 20 a 25 kg", min: 20, max: 25 },
    { label: "De 25 a 30 kg", min: 25, max: 30 },
    { label: "De 30 a 40 kg", min: 30, max: 40 },
    { label: "De 40 a 50 kg", min: 40, max: 50 },
    { label: "De 50 a 60 kg", min: 50, max: 60 },
    { label: "De 60 a 70 kg", min: 60, max: 70 },
    { label: "De 70 a 80 kg", min: 70, max: 80 },
    { label: "De 80 a 90 kg", min: 80, max: 90 },
    { label: "De 90 a 100 kg", min: 90, max: 100 },
    { label: "De 100 a 125 kg", min: 100, max: 125 },
    { label: "De 125 a 150 kg", min: 125, max: 150 },
    { label: "Mais de 150 kg", min: 150, max: Infinity },
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
    [  5.65,   6.85,   8.15,  12.95,  14.95,  16.95,  19.05,  21.65],
    [  5.95,   6.95,   8.25,  13.85,  16.15,  18.15,  20.45,  23.25],
    [  6.05,   7.15,   8.45,  14.45,  16.85,  19.05,  21.35,  24.45],
    [  6.15,   7.35,   8.65,  14.75,  17.15,  19.45,  21.75,  25.45],
    [  6.25,   7.45,   8.75,  15.05,  17.65,  19.85,  22.25,  25.55],
    [  6.35,   8.65,   9.15,  16.45,  19.15,  21.65,  24.35,  27.05],
    [  6.45,   8.75,   9.75,  17.85,  20.75,  23.35,  26.35,  29.25],
    [  6.55,   8.85,  10.25,  19.75,  22.85,  26.05,  29.25,  32.45],
    [  6.65,   8.95,  10.35,  25.95,  29.15,  33.35,  36.45,  40.85],
    [  6.75,   9.05,  10.45,  27.55,  31.65,  36.75,  40.85,  45.25],
    [  6.85,   9.25,  10.55,  29.45,  34.35,  39.25,  44.15,  49.35],
    [  6.95,   9.35,  10.65,  30.25,  35.25,  40.35,  45.35,  50.75],
    [  7.05,   9.45,  10.85,  38.25,  45.05,  51.95,  58.75,  65.85],
    [  7.05,   9.65,  11.05,  41.65,  48.55,  55.45,  62.35,  69.35],
    [  7.15,  10.05,  11.45,  42.55,  49.75,  56.85,  63.85,  70.95],
    [  7.25,  10.25,  11.65,  45.55,  52.95,  60.55,  68.15,  75.65],
    [  7.35,  10.45,  11.85,  48.95,  56.55,  64.05,  71.35,  79.35],
    [  7.45,  10.65,  12.05,  55.15,  64.35,  73.55,  82.75,  91.95],
    [  7.65,  11.05,  12.25,  64.55,  75.75,  85.45,  96.25, 106.85],
    [  7.75,  11.25,  12.45,  66.45,  76.05,  86.25,  97.15, 107.85],
    [  7.85,  11.45,  12.65,  68.35,  79.65,  89.75, 100.05, 107.95],
    [  7.95,  11.65,  12.85,  70.95,  81.85,  92.85, 103.45, 111.65],
    [  8.05,  11.85,  13.05,  75.55,  87.25,  99.05, 110.25, 119.05],
    [  8.15,  12.05,  13.25,  80.95,  93.75, 105.95, 118.05, 127.45],
    [  8.25,  12.25,  13.45,  84.65,  97.95, 110.75, 123.35, 133.15],
    [  8.35,  12.45,  13.65,  94.05, 108.35, 122.95, 136.95, 147.85],
    [  8.45,  12.65,  13.85, 107.45, 124.85, 140.45, 156.45, 168.85],
    [  8.55,  12.85,  14.05, 120.15, 138.95, 156.95, 174.85, 188.85],
    [  8.65,  12.85,  14.25, 127.45, 147.05, 166.55, 185.55, 200.35],
    [  8.75,  12.85,  14.45, 167.05, 193.35, 218.45, 243.45, 262.85],
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
export function pesoIdx(peso: number, pesos: MercadoLivrePesoFaixa[]): number {
  const idx = pesos.findIndex((p) => peso <= p.max);
  return idx === -1 ? pesos.length - 1 : idx;
}

/** Encontra o índice da faixa de preço cujo limite comporta o preço informado. */
export function faixaPrecoIdx(preco: number, faixas: MercadoLivreFaixaPreco[]): number {
  const idx = faixas.findIndex((f) => preco <= f.max);
  return idx === -1 ? faixas.length - 1 : idx;
}

/** Abaixo deste preço o frete não passa de metade do valor do produto. */
export const ML_LIMIAR_METADE_PRECO = 19;

/**
 * Valor do frete Mercado Livre, por peso × faixa de preço.
 *
 * O rodapé da tabela diz: "os produtos de menos de R$ 19 pagam no máximo
 * metade do preço do produto". Sem esse teto, um produto de R$10 pesando 5 kg
 * apareceria com R$6,65 de frete quando o cobrado é R$5,00 — a calculadora
 * mostraria prejuízo onde não há.
 */
function freteMercadoLivre(preco: number, peso: number, taxas: MercadoLivreTaxas): number {
  const pi = pesoIdx(peso, taxas.pesos);
  const fi = faixaPrecoIdx(preco, taxas.faixasPreco);
  const tabelado = taxas.freteTabela[pi][fi];

  if (preco < ML_LIMIAR_METADE_PRECO) return Math.min(tabelado, preco / 2);
  return tabelado;
}

/** Custo fixo de venda cobrado pelo Mercado Livre, em função do preço. */
export function custoFixoMercadoLivre(preco: number, cfg: MercadoLivreCustoFixoConfig): number {
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
  /** Peso do produto, em kg. Sem peso não há como saber a faixa de frete. */
  pesoKg: number;
  /** Verdadeiro quando há peso informado. O frete do ML não é opcional. */
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

  const extras = input.custosExtras ?? 0;

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
  const lucro = receitaLiquida - custo - extras;

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    { label: `Comissão (${(comissaoPerc * 100).toFixed(1)}%)`, valor: valorComissaoPerc },
    { label: "Custo fixo ML", valor: valorCustoFixo },
    { label: "Frete", valor: valorFrete },
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
