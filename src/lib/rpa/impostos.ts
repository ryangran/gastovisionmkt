/**
 * Retenções do Recibo de Pagamento a Autônomo (RPA).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TABELAS FISCAIS — CONFERIR COM O CONTADOR ANTES DE EMITIR EM PRODUÇÃO
 *
 * Os valores abaixo são os vigentes a partir de MAIO DE 2025. Legislação
 * tributária muda por medida provisória, normalmente em janeiro ou maio.
 * Quando mudar, é só trocar os números deste bloco — nada mais no sistema
 * depende deles.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Data da tabela usada, mostrada na interface para o lojista conferir. */
export const TABELA_VIGENCIA = "maio/2025";

/** Contribuinte individual: 11% sobre o valor pago, limitado ao teto. */
export const INSS_ALIQUOTA = 0.11;
export const INSS_TETO = 8157.41;

export interface FaixaIrrf {
  /** Limite superior da faixa. Infinity na última. */
  ate: number;
  aliquota: number;
  deducao: number;
}

/** Tabela progressiva mensal do IRRF. */
export const IRRF_FAIXAS: FaixaIrrf[] = [
  { ate: 2428.8, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
];

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** INSS do contribuinte individual, com o teto aplicado. */
export function calcularInss(bruto: number): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const base = Math.min(bruto, INSS_TETO);
  return centavos(base * INSS_ALIQUOTA);
}

export function faixaIrrf(base: number): FaixaIrrf {
  return IRRF_FAIXAS.find((f) => base <= f.ate) ?? IRRF_FAIXAS[IRRF_FAIXAS.length - 1];
}

/** IRRF pela tabela progressiva. A base já deve vir líquida do INSS. */
export function calcularIrrf(base: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const faixa = faixaIrrf(base);
  return centavos(Math.max(0, base * faixa.aliquota - faixa.deducao));
}

export interface EntradaRpa {
  bruto: number;
  reterInss: boolean;
  reterIrrf: boolean;
  /** Alíquota de ISS em pontos percentuais. Zero desliga a retenção. */
  issPercent: number;
}

export interface ResultadoRpa {
  bruto: number;
  inss: number;
  /** Base do IRRF: bruto menos o INSS retido. */
  baseIrrf: number;
  irrf: number;
  /** true quando a base caiu na faixa isenta — o recibo escreve "Isento". */
  irrfIsento: boolean;
  iss: number;
  liquido: number;
}

export function calcularRpa({
  bruto,
  reterInss,
  reterIrrf,
  issPercent,
}: EntradaRpa): ResultadoRpa {
  const valorBruto = Number.isFinite(bruto) && bruto > 0 ? centavos(bruto) : 0;

  const inss = reterInss ? calcularInss(valorBruto) : 0;
  // O INSS retido sai da base do IRRF do autônomo.
  const baseIrrf = centavos(valorBruto - inss);
  const irrf = reterIrrf ? calcularIrrf(baseIrrf) : 0;

  const aliquotaIss = Number.isFinite(issPercent) && issPercent > 0 ? issPercent : 0;
  const iss = centavos(valorBruto * (aliquotaIss / 100));

  const liquido = Math.max(0, centavos(valorBruto - inss - irrf - iss));

  return {
    bruto: valorBruto,
    inss,
    baseIrrf,
    irrf,
    irrfIsento: reterIrrf && irrf === 0,
    iss,
    liquido,
  };
}
