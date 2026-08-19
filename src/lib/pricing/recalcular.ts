import { calcular, type PlatformInputMap, type PlatformTaxasMap } from "./index";
import { PLATFORM_LABELS, type PlatformKey } from "./types";
import type { ProdutoSalvo } from "@/lib/carteira";

/** Diferença abaixo disso é ruído de arredondamento, não mudança de taxa. */
const TOLERANCIA_PP = 0.01;

/** O banco grava o nome de exibição; os módulos usam a chave. */
export function chaveDaPlataforma(nomeExibicao: string): PlatformKey | null {
  const entrada = Object.entries(PLATFORM_LABELS).find(
    ([, label]) => label === nomeExibicao,
  );
  return entrada ? (entrada[0] as PlatformKey) : null;
}

export interface MudancaProduto {
  produto: ProdutoSalvo;
  margemAntes: number;
  margemDepois: number;
  lucroDepois: number;
  virouPrejuizo: boolean;
  deixouPrejuizo: boolean;
}

export interface ResultadoRecalculo {
  mudancas: MudancaProduto[];
  /** Produtos que não puderam ser refeitos: sem entradas guardadas ou plataforma desconhecida. */
  naoRecalculaveis: ProdutoSalvo[];
  totalAvaliados: number;
}

export type TaxasPorPlataforma = Partial<{
  [K in PlatformKey]: PlatformTaxasMap[K];
}>;

function temEntradas(inputs: unknown): inputs is Record<string, unknown> {
  return (
    typeof inputs === "object" &&
    inputs !== null &&
    Object.keys(inputs as Record<string, unknown>).length > 0 &&
    "precoVenda" in (inputs as Record<string, unknown>)
  );
}

/**
 * Refaz a conta de cada produto salvo com as taxas informadas e devolve o que
 * mudou. Produto sem as entradas guardadas — as linhas salvas antes da coluna
 * `inputs` existir — é reportado como não recalculável, nunca tratado como
 * zero: dizer que a margem virou zero seria pior que dizer que não se sabe.
 */
export function recalcularCarteira(
  produtos: ProdutoSalvo[],
  taxas: TaxasPorPlataforma,
): ResultadoRecalculo {
  const mudancas: MudancaProduto[] = [];
  const naoRecalculaveis: ProdutoSalvo[] = [];

  for (const p of produtos) {
    const chave = chaveDaPlataforma(p.platform);
    if (!chave || !temEntradas(p.inputs)) {
      naoRecalculaveis.push(p);
      continue;
    }

    let resultado;
    try {
      resultado = calcular(
        chave,
        p.inputs as unknown as PlatformInputMap[typeof chave],
        taxas[chave],
      );
    } catch (e) {
      console.error(`Falha ao recalcular ${p.product_name}:`, e);
      naoRecalculaveis.push(p);
      continue;
    }

    if (!Number.isFinite(resultado.margemPercent)) {
      naoRecalculaveis.push(p);
      continue;
    }

    const margemAntes = p.profit_margin_percent;
    const margemDepois = resultado.margemPercent;
    if (Math.abs(margemDepois - margemAntes) < TOLERANCIA_PP) continue;

    mudancas.push({
      produto: p,
      margemAntes,
      margemDepois,
      lucroDepois: resultado.lucro,
      virouPrejuizo: margemAntes >= 0 && margemDepois < 0,
      deixouPrejuizo: margemAntes < 0 && margemDepois >= 0,
    });
  }

  return { mudancas, naoRecalculaveis, totalAvaliados: produtos.length };
}
