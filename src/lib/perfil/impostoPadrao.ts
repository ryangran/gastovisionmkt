import type { RegimeTributario } from "./regimes";

interface PerfilImposto {
  regime: RegimeTributario;
  impostoPercent: number;
}

/**
 * O que preencher no campo "Imposto (%)" da calculadora, ou null para deixar
 * como está.
 *
 * Duas regras que valem a pena declarar:
 *
 * - Um percentual salvo vale por si, mesmo sem regime escolhido. Quem digitou
 *   7% e deixou o regime em "Ainda não sei" quer os 7% do mesmo jeito.
 * - Zero só é preenchido no MEI, onde é resposta ("o DAS é fixo, não incide por
 *   venda"). Nos outros regimes zero é ausência de configuração, e escrever 0
 *   no campo faria o lojista calcular sem imposto sem perceber.
 *
 * O número sai com PONTO decimal porque os campos de imposto da calculadora são
 * <input type="number">, e o navegador descarta em silêncio um valor com
 * vírgula — a alíquota efetiva do Simples, como 5,32, sumiria do campo.
 */
export function impostoParaPreencher(
  valorAtual: string,
  perfil: PerfilImposto | null,
): string | null {
  if (!perfil) return null;
  // Campo já preenchido é do lojista: nunca sobrescrever enquanto ele trabalha.
  if (valorAtual.trim() !== "") return null;

  const percentual = Number(perfil.impostoPercent);
  if (!Number.isFinite(percentual) || percentual < 0) return null;

  if (percentual > 0) return String(percentual);
  return perfil.regime === "mei" ? "0" : null;
}
