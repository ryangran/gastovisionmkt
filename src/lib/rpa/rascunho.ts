import type { EmpresaRpa } from "./pdf";

/**
 * Lê o rascunho dos dados da empresa guardado no navegador.
 *
 * Antes de o sistema passar a ter uma empresa só, o rascunho era gravado como
 * `{ "1": {...} }`. Esse objeto não é nulo, então passava pelo `??` e chegava ao
 * formulário sem `razaoSocial`, quebrando no `.trim()`. Recuperar o que a pessoa
 * digitou é melhor do que descartar em silêncio.
 */
export function migrarRascunho(bruto: unknown): Partial<EmpresaRpa> | null {
  if (!bruto || typeof bruto !== "object") return null;
  const obj = bruto as Record<string, unknown>;
  if (typeof obj.razaoSocial === "string") return obj as Partial<EmpresaRpa>;
  const antigo = obj["1"] ?? obj["2"];
  if (antigo && typeof antigo === "object") return antigo as Partial<EmpresaRpa>;
  return null;
}
