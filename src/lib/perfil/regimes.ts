/**
 * Regime tributário do lojista e o imposto que ele implica.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * O número que sai daqui vai para o campo "Imposto (%)" da calculadora e afeta
 * TODO preço que o lojista definir. Por isso a regra aqui é: sugerir só o que
 * dá para calcular com segurança, e devolver null quando depende do contador.
 * Um palpite disfarçado de cálculo é pior do que um campo em branco.
 *
 * Tabelas do Simples Nacional: Anexos I e II da LC 123/2006, na redação da
 * LC 155/2016, em vigor desde 2018.
 * ────────────────────────────────────────────────────────────────────────────
 */

export type RegimeTributario =
  | "nao_informado"
  | "mei"
  | "simples"
  | "lucro_presumido"
  | "cpf";

export interface DefinicaoRegime {
  chave: RegimeTributario;
  rotulo: string;
  resumo: string;
  explicacao: string;
  /** true quando o sistema consegue calcular a alíquota sozinho. */
  calculaSozinho: boolean;
}

export const REGIMES: DefinicaoRegime[] = [
  {
    chave: "mei",
    rotulo: "MEI",
    resumo: "Microempreendedor Individual",
    explicacao:
      "O MEI paga um valor fixo por mês no DAS, independentemente de quanto vender. " +
      "Não existe percentual por venda, então o imposto na calculadora entra como zero — " +
      "o custo do DAS é uma despesa fixa do mês, não do produto.",
    calculaSozinho: true,
  },
  {
    chave: "simples",
    rotulo: "Simples Nacional",
    resumo: "Alíquota por faixa de faturamento",
    explicacao:
      "A alíquota depende do quanto você faturou nos últimos 12 meses e do anexo da sua " +
      "atividade. Informe os dois e o sistema calcula a alíquota efetiva pela fórmula " +
      "oficial, que é menor que a nominal da faixa por causa da parcela a deduzir.",
    calculaSozinho: true,
  },
  {
    chave: "lucro_presumido",
    rotulo: "Lucro Presumido",
    resumo: "Alíquota informada pelo contador",
    explicacao:
      "No Lucro Presumido o total sobre a receita junta PIS, COFINS, IRPJ e CSLL, e ainda " +
      "depende do ICMS do seu estado e da sua atividade. Não dá para calcular isso sem " +
      "conhecer o seu enquadramento — peça o percentual ao seu contador e informe aqui.",
    calculaSozinho: false,
  },
  {
    chave: "cpf",
    rotulo: "Pessoa física (CPF)",
    resumo: "Alíquota informada pelo contador",
    explicacao:
      "Vendendo como pessoa física, a tributação segue a tabela progressiva do IR e o " +
      "carnê-leão, que variam com o total ganho no mês e não com a venda isolada. Informe " +
      "o percentual que seu contador orientar usar.",
    calculaSozinho: false,
  },
  {
    chave: "nao_informado",
    rotulo: "Ainda não sei",
    resumo: "Informar o imposto manualmente",
    explicacao:
      "Sem o regime definido, o campo de imposto da calculadora continua em branco para " +
      "você preencher a cada produto. Dá para voltar aqui e configurar quando souber.",
    calculaSozinho: false,
  },
];

export type AnexoSimples = "I" | "II";

export interface FaixaSimples {
  /** Limite superior da receita bruta dos últimos 12 meses. */
  ate: number;
  /** Alíquota nominal da faixa, em pontos percentuais. */
  nominal: number;
  /** Parcela a deduzir, em reais. */
  deducao: number;
}

export interface DefinicaoAnexo {
  chave: AnexoSimples;
  rotulo: string;
  faixas: FaixaSimples[];
}

export const SIMPLES_ANEXOS: DefinicaoAnexo[] = [
  {
    chave: "I",
    rotulo: "Anexo I — Comércio (revenda de mercadorias)",
    faixas: [
      { ate: 180000, nominal: 4, deducao: 0 },
      { ate: 360000, nominal: 7.3, deducao: 5940 },
      { ate: 720000, nominal: 9.5, deducao: 13860 },
      { ate: 1800000, nominal: 10.7, deducao: 22500 },
      { ate: 3600000, nominal: 14.3, deducao: 87300 },
      { ate: Infinity, nominal: 19, deducao: 378000 },
    ],
  },
  {
    chave: "II",
    rotulo: "Anexo II — Indústria (fabricação própria)",
    faixas: [
      { ate: 180000, nominal: 4.5, deducao: 0 },
      { ate: 360000, nominal: 7.8, deducao: 5940 },
      { ate: 720000, nominal: 10, deducao: 13860 },
      { ate: 1800000, nominal: 11.2, deducao: 22500 },
      { ate: 3600000, nominal: 14.7, deducao: 85500 },
      { ate: Infinity, nominal: 30, deducao: 720000 },
    ],
  },
];

function anexo(chave: AnexoSimples): DefinicaoAnexo {
  return SIMPLES_ANEXOS.find((a) => a.chave === chave) ?? SIMPLES_ANEXOS[0];
}

export function faixaSimples(chave: AnexoSimples, rbt12: number): FaixaSimples {
  const faixas = anexo(chave).faixas;
  return faixas.find((f) => rbt12 <= f.ate) ?? faixas[faixas.length - 1];
}

/**
 * Alíquota efetiva do Simples: (RBT12 × nominal − dedução) ÷ RBT12.
 *
 * Sem faturamento informado devolve a nominal da primeira faixa, que é onde
 * está quem começou agora — e onde a dedução é zero, então nominal e efetiva
 * coincidem.
 */
export function aliquotaEfetivaSimples(chave: AnexoSimples, rbt12: number): number {
  const faixas = anexo(chave).faixas;
  if (!Number.isFinite(rbt12) || rbt12 <= 0) return faixas[0].nominal;

  const faixa = faixaSimples(chave, rbt12);
  const efetiva = ((rbt12 * (faixa.nominal / 100) - faixa.deducao) / rbt12) * 100;
  return Math.round(Math.max(0, efetiva) * 100) / 100;
}

export interface EntradaImposto {
  regime: RegimeTributario;
  anexo?: AnexoSimples;
  rbt12?: number;
}

/**
 * Imposto sugerido para a calculadora, ou null quando o sistema não tem como
 * saber. Null significa "pergunte ao contador", nunca zero.
 */
export function impostoSugerido({ regime, anexo, rbt12 }: EntradaImposto): number | null {
  if (regime === "mei") return 0;
  if (regime === "simples") return aliquotaEfetivaSimples(anexo ?? "I", rbt12 ?? 0);
  return null;
}

export function definicaoRegime(chave: RegimeTributario): DefinicaoRegime {
  return REGIMES.find((r) => r.chave === chave) ?? REGIMES[REGIMES.length - 1];
}
