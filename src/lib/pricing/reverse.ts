import { calcular, type PlatformInputMap } from "./index";
import type { PlatformKey } from "./types";

/** Entrada sem o preço — é justamente o preço que estamos procurando. */
export type EntradaSemPreco<K extends PlatformKey> = Omit<PlatformInputMap[K], "precoVenda">;

const PASSOS_VARREDURA = 4000;
const ITERACOES_BISSECAO = 60;
const TOLERANCIA_PP = 0.1;

/**
 * Preço de venda que entrega a margem alvo, ou null se ela for inalcançável.
 *
 * A margem cresce com o preço dentro de uma faixa de comissão, mas CAI ao
 * cruzar a fronteira (a Shopee salta de 20% + R$4 para 14% + R$16 em R$80).
 * A função é crescente por trechos, com degraus para baixo — por isso não dá
 * para bisseccionar direto no intervalo inteiro: haveria mais de um ponto de
 * cruzamento e a bisseção poderia parar num trecho que o degrau invalidou.
 *
 * A varredura acha o PRIMEIRO trecho em que a margem cruza o alvo; a bisseção
 * refina só dentro dele. O resultado é arredondado para o centavo acima, para
 * a margem entregue nunca ficar abaixo da pedida.
 */
export function precoParaMargem<K extends PlatformKey>(
  platform: K,
  margemAlvo: number,
  entrada: EntradaSemPreco<K>,
): number | null {
  if (!Number.isFinite(margemAlvo) || margemAlvo < 0 || margemAlvo >= 100) return null;

  const margemEm = (preco: number): number => {
    const input = { ...entrada, precoVenda: preco } as PlatformInputMap[K];
    return calcular(platform, input).margemPercent;
  };

  const custo = Number((entrada as { custoProduto?: number }).custoProduto) || 0;
  const limite = Math.max(custo * 50, 1000) + 5000;
  const passo = limite / PASSOS_VARREDURA;

  let anterior = 0.01;
  let margemAnterior = margemEm(anterior);

  for (let i = 1; i <= PASSOS_VARREDURA; i++) {
    const atual = i * passo;
    const margemAtual = margemEm(atual);

    if (margemAnterior < margemAlvo && margemAtual >= margemAlvo) {
      // Cruzou dentro deste trecho: refina por bisseção entre os dois pontos.
      let lo = anterior;
      let hi = atual;
      for (let k = 0; k < ITERACOES_BISSECAO; k++) {
        const meio = (lo + hi) / 2;
        if (margemEm(meio) >= margemAlvo) hi = meio;
        else lo = meio;
      }
      const preco = Math.ceil(hi * 100) / 100;
      // O arredondamento não pode empurrar o resultado para fora do alvo.
      return margemEm(preco) >= margemAlvo - TOLERANCIA_PP ? preco : null;
    }

    anterior = atual;
    margemAnterior = margemAtual;
  }

  return null;
}
