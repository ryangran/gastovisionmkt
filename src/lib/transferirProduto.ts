import type { PlatformKey } from "@/lib/pricing/types";

/** Chave que a Calculadora usa para lembrar a aba aberta. */
export const CHAVE_PLATAFORMA = "calc_plataforma";

export interface DadosProduto {
  nome: string;
  precoVenda: number;
  custo: number;
  impostoPercent?: number;
  pesoKg?: number;
  comprimentoCm?: number;
  larguraCm?: number;
  alturaCm?: number;
}

export interface Medidas {
  pesoKg?: number;
  comprimentoCm?: number;
  larguraCm?: number;
  alturaCm?: number;
}

interface CamposPlataforma {
  nome: string;
  preco: string;
  custo: string;
  imposto: string;
  /** Nem toda calculadora pede peso, e a unidade não é a mesma em todas. */
  peso?: { chave: string; unidade: "kg" | "g" };
  dimensoes?: { comprimento: string; largura: string; altura: string };
}

/**
 * As chaves que cada calculadora lê do sessionStorage. Ficam num lugar só
 * porque a nomenclatura é irregular — a Shein abrevia (`comp`, `larg`, `alt`),
 * a Amazon usa sufixo `_fba` — e principalmente porque a unidade de peso
 * MUDA: a Shein pede gramas, as outras pedem quilos.
 */
const CAMPOS: Record<PlatformKey, CamposPlataforma> = {
  shopee: {
    nome: "calc_shopee_nome",
    preco: "calc_shopee_preco",
    custo: "calc_shopee_custo",
    imposto: "calc_shopee_imposto",
  },
  tiktok: {
    nome: "calc_tiktok_nome",
    preco: "calc_tiktok_preco",
    custo: "calc_tiktok_custo",
    imposto: "calc_tiktok_imposto",
  },
  mercadolivre: {
    nome: "calc_ml_nome",
    preco: "calc_ml_preco",
    custo: "calc_ml_custo",
    imposto: "calc_ml_imposto",
    peso: { chave: "calc_ml_peso", unidade: "kg" },
  },
  amazon: {
    nome: "calc_amazon_nome",
    preco: "calc_amazon_preco",
    custo: "calc_amazon_custo",
    imposto: "calc_amazon_imposto",
    peso: { chave: "calc_amazon_peso_fba", unidade: "kg" },
    dimensoes: {
      comprimento: "calc_amazon_comprimento_fba",
      largura: "calc_amazon_largura_fba",
      altura: "calc_amazon_altura_fba",
    },
  },
  magalu: {
    nome: "calc_magalu_nome",
    preco: "calc_magalu_preco",
    custo: "calc_magalu_custo",
    imposto: "calc_magalu_imposto",
    peso: { chave: "calc_magalu_peso", unidade: "kg" },
    dimensoes: {
      comprimento: "calc_magalu_comprimento",
      largura: "calc_magalu_largura",
      altura: "calc_magalu_altura",
    },
  },
  shein: {
    nome: "calc_shein_nome",
    preco: "calc_shein_preco",
    custo: "calc_shein_custo",
    imposto: "calc_shein_imposto",
    peso: { chave: "calc_shein_peso", unidade: "g" },
    dimensoes: {
      comprimento: "calc_shein_comp",
      largura: "calc_shein_larg",
      altura: "calc_shein_alt",
    },
  },
};

function num(valor: unknown): number | undefined {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Tira peso e dimensões das entradas guardadas com o produto. Cada calculadora
 * nomeia esses campos do seu jeito, então aceitamos as duas convenções.
 */
export function extrairMedidas(inputs: Record<string, unknown> | null | undefined): Medidas {
  if (!inputs || typeof inputs !== "object") return {};
  return {
    pesoKg: num(inputs.pesoKg),
    comprimentoCm: num(inputs.comprimentoCm ?? inputs.comprimento),
    larguraCm: num(inputs.larguraCm ?? inputs.largura),
    alturaCm: num(inputs.alturaCm ?? inputs.altura),
  };
}

/** Formata sem notação científica nem casas decimais sobrando. */
function texto(valor: number): string {
  return JSON.stringify(String(Number(valor.toFixed(4))));
}

/**
 * Monta o que precisa ser gravado no sessionStorage para a calculadora da
 * plataforma destino abrir já preenchida com o produto.
 */
export function montarSessao(
  destino: PlatformKey,
  dados: DadosProduto,
): Record<string, string> {
  const campos = CAMPOS[destino];
  const sessao: Record<string, string> = {
    [CHAVE_PLATAFORMA]: JSON.stringify(destino),
    [campos.nome]: JSON.stringify(dados.nome),
    [campos.preco]: texto(dados.precoVenda),
    [campos.custo]: texto(dados.custo),
  };

  if (dados.impostoPercent !== undefined) {
    sessao[campos.imposto] = texto(dados.impostoPercent);
  }

  if (campos.peso && dados.pesoKg !== undefined) {
    const valor = campos.peso.unidade === "g" ? dados.pesoKg * 1000 : dados.pesoKg;
    sessao[campos.peso.chave] = texto(valor);
  }

  if (campos.dimensoes) {
    if (dados.comprimentoCm !== undefined)
      sessao[campos.dimensoes.comprimento] = texto(dados.comprimentoCm);
    if (dados.larguraCm !== undefined)
      sessao[campos.dimensoes.largura] = texto(dados.larguraCm);
    if (dados.alturaCm !== undefined)
      sessao[campos.dimensoes.altura] = texto(dados.alturaCm);
  }

  return sessao;
}

/**
 * Grava a sessão e deixa a calculadora pronta. Precisa rodar ANTES de navegar:
 * cada calculadora lê o sessionStorage uma única vez, ao montar.
 */
export function aplicarNaSessao(destino: PlatformKey, dados: DadosProduto): void {
  const sessao = montarSessao(destino, dados);
  try {
    for (const [chave, valor] of Object.entries(sessao)) {
      sessionStorage.setItem(chave, valor);
    }
  } catch (e) {
    console.error("Não foi possível preparar a calculadora:", e);
  }
}
