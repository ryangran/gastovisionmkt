import type { BaseInput, LinhaDetalhe, PricingResult } from "./types";
import { RESULTADO_VAZIO } from "./types";

/** Uma categoria Amazon: taxa única (percentual) ou escalonada (tiered), + taxa fixa somada por item. */
export type AmazonCategoria = {
  nome: string;
  percentual?: number;
  tiered?: { ate: number; taxa: number; taxaExcedente: number };
  taxaFixa: number;
};

const AMAZON_CATEGORIAS: AmazonCategoria[] = [
  { nome: "Roupas e acessórios",                       percentual: 0.14, taxaFixa: 1 },
  { nome: "Sapatos e óculos escuros",                  percentual: 0.14, taxaFixa: 1 },
  { nome: "Bagagem, bolsas e acessórios de viagem",    percentual: 0.14, taxaFixa: 1 },
  { nome: "Relógios",                                  percentual: 0.13, taxaFixa: 1 },
  { nome: "Joias",                                     percentual: 0.14, taxaFixa: 1 },
  { nome: "Livros",                                    percentual: 0.15, taxaFixa: 1 },
  { nome: "TV, áudio e cinema em casa",                percentual: 0.10, taxaFixa: 1 },
  { nome: "Eletrônicos portáteis",                     percentual: 0.13, taxaFixa: 1 },
  { nome: "Celulares",                                 percentual: 0.11, taxaFixa: 1 },
  { nome: "Câmera e fotografia",                       percentual: 0.11, taxaFixa: 1 },
  { nome: "Acessórios para eletrônicos e para PC",     tiered: { ate: 100, taxa: 0.15, taxaExcedente: 0.10 }, taxaFixa: 1 },
  { nome: "Videogames e consoles",                     percentual: 0.11, taxaFixa: 1 },
  { nome: "Casa",                                      percentual: 0.12, taxaFixa: 1 },
  { nome: "Reforma de casa",                           percentual: 0.11, taxaFixa: 1 },
  { nome: "Cozinha",                                   percentual: 0.12, taxaFixa: 1 },
  { nome: "Computadores",                              percentual: 0.12, taxaFixa: 1 },
  { nome: "Papelaria e escritório",                    percentual: 0.13, taxaFixa: 1 },
  { nome: "Esportes, aventura e lazer",                percentual: 0.12, taxaFixa: 1 },
  { nome: "Eletrodomésticos de linha branca",          percentual: 0.11, taxaFixa: 1 },
  { nome: "Móveis",                                    tiered: { ate: 200, taxa: 0.15, taxaExcedente: 0.10 }, taxaFixa: 1 },
  { nome: "Brinquedos e jogos",                        percentual: 0.12, taxaFixa: 1 },
  { nome: "Produtos para bebês",                       percentual: 0.12, taxaFixa: 1 },
  { nome: "Saúde e cuidado pessoal",                   percentual: 0.12, taxaFixa: 1 },
  { nome: "Beleza",                                    percentual: 0.13, taxaFixa: 1 },
  { nome: "Produtos de beleza de luxo",                percentual: 0.14, taxaFixa: 1 },
  { nome: "Aparelhos para cuidados pessoais",          percentual: 0.12, taxaFixa: 1 },
  { nome: "Plantas e jardim",                          percentual: 0.12, taxaFixa: 1 },
  { nome: "Vídeo e DVD",                               percentual: 0.15, taxaFixa: 1 },
  { nome: "Música",                                    percentual: 0.15, taxaFixa: 1 },
  { nome: "Instrumentos musicais e acessórios",        percentual: 0.12, taxaFixa: 1 },
  { nome: "Peças e acessórios automotivos",            percentual: 0.12, taxaFixa: 1 },
  { nome: "Pneus e rodas",                             percentual: 0.10, taxaFixa: 1 },
  { nome: "Produtos para animais de estimação",        percentual: 0.12, taxaFixa: 1 },
  { nome: "Comidas e bebidas",                         percentual: 0.10, taxaFixa: 1 },
  { nome: "Bebidas alcoólicas",                        percentual: 0.11, taxaFixa: 1 },
  { nome: "Indústria e Ciência",                       percentual: 0.12, taxaFixa: 2 },
  { nome: "Outros",                                    percentual: 0.15, taxaFixa: 1 },
];

// Tabela de frete FBA Amazon (Preço Certo)
type AmazonFBAFaixa = {
  label: string;
  maxKg: number;
  ate50: number;
  acima50: number;
};

const AMAZON_FBA_TABELA: AmazonFBAFaixa[] = [
  { label: "0 a 100g",       maxKg: 0.1,  ate50: 14.05, acima50: 15.55 },
  { label: "100 a 200g",     maxKg: 0.2,  ate50: 14.55, acima50: 16.05 },
  { label: "200 a 300g",     maxKg: 0.3,  ate50: 15.05, acima50: 16.55 },
  { label: "300 a 400g",     maxKg: 0.4,  ate50: 15.65, acima50: 17.15 },
  { label: "400 a 500g",     maxKg: 0.5,  ate50: 16.25, acima50: 17.85 },
  { label: "500 a 750g",     maxKg: 0.75, ate50: 16.85, acima50: 18.55 },
  { label: "750g a 1kg",     maxKg: 1,    ate50: 17.45, acima50: 19.25 },
  { label: "1 a 1,5kg",      maxKg: 1.5,  ate50: 18.45, acima50: 20.35 },
  { label: "1,5 a 2kg",      maxKg: 2,    ate50: 19.45, acima50: 21.35 },
  { label: "2 a 3kg",        maxKg: 3,    ate50: 20.45, acima50: 22.35 },
  { label: "3 a 4kg",        maxKg: 4,    ate50: 21.45, acima50: 23.35 },
  { label: "4 a 5kg",        maxKg: 5,    ate50: 22.45, acima50: 24.35 },
  { label: "5 a 6kg",        maxKg: 6,    ate50: 27.45, acima50: 30.35 },
  { label: "6 a 7kg",        maxKg: 7,    ate50: 29.45, acima50: 33.35 },
  { label: "7 a 8kg",        maxKg: 8,    ate50: 31.45, acima50: 35.35 },
  { label: "8 a 9kg",        maxKg: 9,    ate50: 33.45, acima50: 37.35 },
  { label: "9 a 10kg",       maxKg: 10,   ate50: 47.45, acima50: 51.35 },
];

const AMAZON_FBA_QUILO_ADICIONAL = { ate50: 3.25, acima50: 3.50 };

// Tabela de frete FBA Onsite
type AmazonFBAOnsiteFaixa = {
  label: string;
  maxKg: number;
  valor: number;
};

const AMAZON_FBA_ONSITE_TABELA: AmazonFBAOnsiteFaixa[] = [
  { label: "0 a 250g",       maxKg: 0.25, valor: 23.95 },
  { label: "250 a 500g",     maxKg: 0.5,  valor: 24.95 },
  { label: "500g a 1kg",     maxKg: 1,    valor: 26.45 },
  { label: "1 a 2kg",        maxKg: 2,    valor: 27.95 },
  { label: "2 a 3kg",        maxKg: 3,    valor: 29.95 },
  { label: "3 a 4kg",        maxKg: 4,    valor: 32.95 },
  { label: "4 a 5kg",        maxKg: 5,    valor: 36.45 },
  { label: "5 a 6kg",        maxKg: 6,    valor: 41.45 },
  { label: "6 a 7kg",        maxKg: 7,    valor: 46.45 },
  { label: "7 a 8kg",        maxKg: 8,    valor: 51.45 },
  { label: "8 a 9kg",        maxKg: 9,    valor: 56.45 },
  { label: "9 a 10kg",       maxKg: 10,   valor: 71.45 },
];

const AMAZON_FBA_ONSITE_QUILO_ADICIONAL = 4.00;

// Tabela de frete DBA Amazon (Novas tarifas a partir de 01/09/2024)
// Produtos até R$30: tarifa fixa R$4,50
// Produtos até R$79: tarifa fixa R$8,00
// Produtos a partir de R$79: tabela por peso e zona
export type AmazonDBAZona = "sp" | "zona1" | "zona2" | "centro_norte";

type AmazonDBAFaixa = {
  label: string;
  maxKg: number;
  sp: number;
  zona1: number;
  zona2: number;
  centro_norte: number;
};

const AMAZON_DBA_TABELA: AmazonDBAFaixa[] = [
  { label: "0 a 250g",     maxKg: 0.25, sp: 19.95, zona1: 19.95, zona2: 20.45, centro_norte: 29.45 },
  { label: "250 a 500g",   maxKg: 0.5,  sp: 20.45, zona1: 20.45, zona2: 20.95, centro_norte: 30.45 },
  { label: "500g a 1kg",   maxKg: 1,    sp: 21.45, zona1: 21.45, zona2: 21.95, centro_norte: 33.45 },
  { label: "1 a 2kg",      maxKg: 2,    sp: 22.95, zona1: 22.95, zona2: 23.45, centro_norte: 37.95 },
  { label: "2 a 3kg",      maxKg: 3,    sp: 23.95, zona1: 23.95, zona2: 24.45, centro_norte: 44.45 },
  { label: "3 a 4kg",      maxKg: 4,    sp: 25.95, zona1: 25.95, zona2: 25.95, centro_norte: 46.95 },
  { label: "4 a 5kg",      maxKg: 5,    sp: 27.95, zona1: 27.95, zona2: 27.95, centro_norte: 48.95 },
  { label: "5 a 6kg",      maxKg: 6,    sp: 36.95, zona1: 36.95, zona2: 36.95, centro_norte: 58.45 },
  { label: "6 a 7kg",      maxKg: 7,    sp: 39.45, zona1: 39.45, zona2: 39.45, centro_norte: 59.95 },
  { label: "7 a 8kg",      maxKg: 8,    sp: 40.45, zona1: 40.45, zona2: 40.45, centro_norte: 61.45 },
  { label: "8 a 9kg",      maxKg: 9,    sp: 45.45, zona1: 46.95, zona2: 46.95, centro_norte: 62.95 },
  { label: "9 a 10kg",     maxKg: 10,   sp: 59.95, zona1: 61.45, zona2: 65.95, centro_norte: 87.45 },
];

const AMAZON_DBA_QUILO_ADICIONAL = 4.00; // todas as zonas

export type AmazonModelo = "dba" | "fba" | "fba_onsite";

/** Tabelas de taxas/frete que a Amazon usa: comissão por categoria + frete FBA, FBA Onsite e DBA. */
export type AmazonTaxas = {
  categorias: AmazonCategoria[];
  fbaTabela: AmazonFBAFaixa[];
  fbaQuiloAdicional: { ate50: number; acima50: number };
  fbaOnsiteTabela: AmazonFBAOnsiteFaixa[];
  fbaOnsiteQuiloAdicional: number;
  dbaTabela: AmazonDBAFaixa[];
  dbaQuiloAdicional: number;
};

export const AMAZON_TAXAS: AmazonTaxas = {
  categorias: AMAZON_CATEGORIAS,
  fbaTabela: AMAZON_FBA_TABELA,
  fbaQuiloAdicional: AMAZON_FBA_QUILO_ADICIONAL,
  fbaOnsiteTabela: AMAZON_FBA_ONSITE_TABELA,
  fbaOnsiteQuiloAdicional: AMAZON_FBA_ONSITE_QUILO_ADICIONAL,
  dbaTabela: AMAZON_DBA_TABELA,
  dbaQuiloAdicional: AMAZON_DBA_QUILO_ADICIONAL,
};

export function buscarCategoriaAmazon(nome: string, taxas: AmazonTaxas): AmazonCategoria {
  return taxas.categorias.find((c) => c.nome === nome) ?? taxas.categorias[0];
}

export function calcularComissaoAmazon(preco: number, categoria: AmazonCategoria): number {
  let comissaoPercentual = 0;
  if (categoria.tiered) {
    const { ate, taxa, taxaExcedente } = categoria.tiered;
    if (preco <= ate) {
      comissaoPercentual = preco * taxa;
    } else {
      comissaoPercentual = ate * taxa + (preco - ate) * taxaExcedente;
    }
  } else if (categoria.percentual) {
    comissaoPercentual = preco * categoria.percentual;
  }
  return comissaoPercentual + categoria.taxaFixa;
}

export function descricaoTaxaAmazon(categoria: AmazonCategoria): string {
  if (categoria.tiered) {
    return `${(categoria.tiered.taxa * 100).toFixed(0)}% até R$${categoria.tiered.ate} / ${(categoria.tiered.taxaExcedente * 100).toFixed(0)}% acima`;
  }
  return `${((categoria.percentual ?? 0) * 100).toFixed(0)}%`;
}

export function calcularPesoCubadoFBA(alturaCm: number, larguraCm: number, comprimentoCm: number): number {
  return (comprimentoCm * larguraCm * alturaCm) / 6000;
}

export interface AmazonFreteInfo {
  faixa: AmazonFBAFaixa | null;
  valor: number;
}

export function freteFBA(
  pesoKg: number,
  precoVenda: number,
  taxas: AmazonTaxas = AMAZON_TAXAS,
): AmazonFreteInfo {
  const coluna: "ate50" | "acima50" = precoVenda <= 50 ? "ate50" : "acima50";
  const tabela = taxas.fbaTabela;
  if (pesoKg <= 10) {
    const faixa = tabela.find((f) => pesoKg <= f.maxKg) ?? tabela[tabela.length - 1];
    return { faixa, valor: faixa[coluna] };
  }
  const faixaBase = tabela[tabela.length - 1];
  const quilosExtra = Math.ceil(pesoKg - 10);
  return {
    faixa: faixaBase,
    valor: faixaBase[coluna] + quilosExtra * taxas.fbaQuiloAdicional[coluna],
  };
}

export interface AmazonFreteOnsiteInfo {
  faixa: AmazonFBAOnsiteFaixa | null;
  valor: number;
}

export function freteFBAOnsite(
  pesoKg: number,
  taxas: AmazonTaxas = AMAZON_TAXAS,
): AmazonFreteOnsiteInfo {
  const tabela = taxas.fbaOnsiteTabela;
  if (pesoKg <= 10) {
    const faixa = tabela.find((f) => pesoKg <= f.maxKg) ?? tabela[tabela.length - 1];
    return { faixa, valor: faixa.valor };
  }
  const faixaBase = tabela[tabela.length - 1];
  const quilosExtra = Math.ceil(pesoKg - 10);
  return {
    faixa: faixaBase,
    valor: faixaBase.valor + quilosExtra * taxas.fbaOnsiteQuiloAdicional,
  };
}

export interface AmazonFreteDBAInfo {
  valor: number;
  tipo: string;
  faixa?: AmazonDBAFaixa;
}

export function freteDBA(
  pesoKg: number,
  precoVenda: number,
  zona: AmazonDBAZona,
  taxas: AmazonTaxas = AMAZON_TAXAS,
): AmazonFreteDBAInfo {
  // Produtos até R$30: tarifa fixa
  if (precoVenda <= 30) {
    return { valor: 4.5, tipo: "Tarifa fixa (produto até R$30)" };
  }
  // Produtos até R$79: tarifa fixa
  if (precoVenda < 79) {
    return { valor: 8.0, tipo: "Tarifa fixa (produto até R$79)" };
  }
  // Produtos a partir de R$79: tabela por peso e zona
  if (pesoKg <= 0) {
    return { valor: 0, tipo: "Informe o peso para calcular" };
  }
  const tabela = taxas.dbaTabela;
  if (pesoKg <= 10) {
    const faixa = tabela.find((f) => pesoKg <= f.maxKg) ?? tabela[tabela.length - 1];
    return { valor: faixa[zona], tipo: `Tabela por peso (${faixa.label})`, faixa };
  }
  const faixaBase = tabela[tabela.length - 1];
  const quilosExtra = Math.ceil(pesoKg - 10);
  return {
    valor: faixaBase[zona] + quilosExtra * taxas.dbaQuiloAdicional,
    tipo: `Acima de 10kg (+${quilosExtra}kg extra)`,
    faixa: faixaBase,
  };
}

export interface AmazonInput extends BaseInput {
  /** Nome exato da categoria (ver AMAZON_TAXAS.categorias). Cai para a primeira categoria se não encontrada. */
  categoria: string;
  modelo: AmazonModelo;
  dbaZona: AmazonDBAZona;
  /** Peso real informado pelo lojista, em kg. */
  pesoKg: number;
  /** Dimensões do pacote em cm, usadas para o peso cubado (C×L×A÷6000). */
  alturaCm?: number;
  larguraCm?: number;
  comprimentoCm?: number;
}

export function calcularAmazon(
  input: AmazonInput,
  taxas: AmazonTaxas = AMAZON_TAXAS,
): PricingResult {
  const {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent,
    marketingPercent,
    categoria: categoriaNome,
    modelo,
    dbaZona,
    pesoKg,
    alturaCm = 0,
    larguraCm = 0,
    comprimentoCm = 0,
  } = input;

  if (preco <= 0) return { ...RESULTADO_VAZIO, custoProduto: custo };

  const categoria = buscarCategoriaAmazon(categoriaNome, taxas);

  const pesoCubado = alturaCm > 0 && larguraCm > 0 && comprimentoCm > 0
    ? calcularPesoCubadoFBA(alturaCm, larguraCm, comprimentoCm)
    : 0;
  const pesoFinal = Math.max(pesoKg, pesoCubado);

  let valorFrete = 0;
  if (modelo === "fba" && pesoFinal > 0) {
    valorFrete = freteFBA(pesoFinal, preco, taxas).valor;
  } else if (modelo === "fba_onsite" && pesoFinal > 0) {
    valorFrete = freteFBAOnsite(pesoFinal, taxas).valor;
  } else if (modelo === "dba") {
    valorFrete = freteDBA(pesoFinal, preco, dbaZona, taxas).valor;
  }

  const valorComissao = calcularComissaoAmazon(preco, categoria);
  const valorImposto = preco * (impostoPercent / 100);
  const valorMarketing = preco * (marketingPercent / 100);

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing - valorFrete;
  const lucro = receitaLiquida - custo;

  const rotuloFrete = modelo === "dba" ? "DBA" : modelo === "fba" ? "FBA" : "FBA Onsite";

  const detalhes: LinhaDetalhe[] = [
    { label: "Preço de venda", valor: preco, credito: true },
    { label: `Comissão (${descricaoTaxaAmazon(categoria)})`, valor: valorComissao },
    { label: `Frete ${rotuloFrete}`, valor: valorFrete },
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
