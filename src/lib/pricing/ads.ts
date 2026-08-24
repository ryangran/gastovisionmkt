/**
 * Ponte entre a margem do produto e o investimento em anúncio.
 *
 * A conta é direta: se a margem é 20% do preço, cada real vendido deixa R$0,20.
 * O anúncio se paga quando o gasto não passa desses R$0,20 — ou seja, quando o
 * retorno é de 5 reais vendidos por real gasto. ROAS de equilíbrio = 100/margem,
 * e o ACOS de equilíbrio é a própria margem.
 */

export type Objetivo = "giro" | "rentabilidade";

/** Giro aceita margem menor em troca de volume; rentabilidade preserva metade. */
const MULTIPLICADOR: Record<Objetivo, number> = {
  giro: 1.25,
  rentabilidade: 2,
};

export interface RecomendacaoAds {
  roasEquilibrio: number;
  acosEquilibrio: number;
  roasAlvo: number;
  acosAlvo: number;
  /** Margem que sobra depois de pagar o anúncio no ROAS alvo, em pontos percentuais. */
  margemResultante: number;
  objetivo: Objetivo;
  texto: string;
}

export type SituacaoRoas = "prejuizo" | "empate" | "lucro";

export interface AvaliacaoRoas {
  situacao: SituacaoRoas;
  roasEquilibrio: number;
  acosAtual: number;
  margemResultante: number;
  texto: string;
}

/**
 * Margem em % do preço, a partir do que a pessoa paga e do que recebe.
 *
 * Pedir a margem pronta obriga quem usa a já ter feito essa conta em algum
 * lugar. Custo do produto é o número que todo seller sabe de cabeça.
 *
 * `outrosCustos` é onde entram comissão do marketplace, frete, imposto e
 * embalagem. Sem eles a margem sai otimista, e margem otimista vira ROAS de
 * equilíbrio baixo demais — o erro que faz a pessoa perder dinheiro em cada
 * venda achando que está no lucro.
 */
export function margemDePrecoECusto(
  preco: number,
  custo: number,
  outrosCustos = 0,
): number | null {
  if (!Number.isFinite(preco) || preco <= 0) return null;
  if (!Number.isFinite(custo) || custo < 0) return null;

  const extras = Number.isFinite(outrosCustos) && outrosCustos > 0 ? outrosCustos : 0;
  const sobra = preco - custo - extras;
  return arredondar((sobra / preco) * 100);
}

function margemValida(margemPercent: number): boolean {
  return Number.isFinite(margemPercent) && margemPercent > 0;
}

function arredondar(valor: number, casas = 2): number {
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}

/** Número em formato brasileiro, sem casas decimais desnecessárias. */
export function fmtNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

/** Quantos reais de venda cada real de anúncio precisa gerar para empatar. */
export function roasEquilibrio(margemPercent: number): number | null {
  if (!margemValida(margemPercent)) return null;
  return arredondar(100 / margemPercent);
}

/** Quanto do preço de venda pode ir para o anúncio sem entrar no prejuízo. */
export function acosEquilibrio(margemPercent: number): number | null {
  if (!margemValida(margemPercent)) return null;
  return arredondar(margemPercent);
}

export function recomendarRoas(
  margemPercent: number,
  objetivo: Objetivo,
): RecomendacaoAds | null {
  const equilibrio = roasEquilibrio(margemPercent);
  const acosEq = acosEquilibrio(margemPercent);
  if (equilibrio === null || acosEq === null) return null;

  const roasAlvo = arredondar(equilibrio * MULTIPLICADOR[objetivo]);
  const acosAlvo = arredondar(100 / roasAlvo);
  const margemResultante = arredondar(margemPercent - acosAlvo);

  const texto =
    objetivo === "giro"
      ? `Abaixo de ROAS ${fmtNumero(equilibrio)} o anúncio consome todo o lucro deste produto. ` +
        `Mirando ROAS ${fmtNumero(roasAlvo)} você gasta até ${fmtNumero(acosAlvo)}% do preço em anúncio e ainda ` +
        `sobram ${fmtNumero(margemResultante)} pontos de margem. É menos lucro por venda em troca de ` +
        `mais vendas — faz sentido para girar estoque parado ou ganhar posição.`
      : `Abaixo de ROAS ${fmtNumero(equilibrio)} o anúncio consome todo o lucro deste produto. ` +
        `Mirando ROAS ${fmtNumero(roasAlvo)} o anúncio fica em ${fmtNumero(acosAlvo)}% do preço e preservam-se ` +
        `${fmtNumero(margemResultante)} dos ${fmtNumero(arredondar(margemPercent))} pontos de margem, ou seja, ` +
        `metade do lucro continua com você. Vende menos que mirando giro, e cada venda paga mais.`;

  return {
    roasEquilibrio: equilibrio,
    acosEquilibrio: acosEq,
    roasAlvo,
    acosAlvo,
    margemResultante,
    objetivo,
    texto,
  };
}

/** Compara o ROAS que a campanha entrega hoje com o de equilíbrio do produto. */
export function avaliarRoasAtual(
  margemPercent: number,
  roasAtual: number,
): AvaliacaoRoas | null {
  const equilibrio = roasEquilibrio(margemPercent);
  if (equilibrio === null) return null;
  if (!Number.isFinite(roasAtual) || roasAtual <= 0) return null;

  const acosAtual = arredondar(100 / roasAtual);
  const margemResultante = arredondar(margemPercent - acosAtual);

  // Comparar pelo ACOS evita o erro de arredondamento do ROAS em duas casas.
  const diferenca = margemResultante;
  const situacao: SituacaoRoas =
    Math.abs(diferenca) < 0.01 ? "empate" : diferenca < 0 ? "prejuizo" : "lucro";

  const texto =
    situacao === "prejuizo"
      ? `A campanha está gastando ${fmtNumero(acosAtual)}% do preço em anúncio, mas o produto só ` +
        `suporta ${fmtNumero(arredondar(margemPercent))}%. Cada venda por anúncio está tirando ` +
        `${fmtNumero(arredondar(Math.abs(margemResultante)))} pontos do seu bolso. O ROAS precisa passar de ${fmtNumero(equilibrio)}.`
      : situacao === "empate"
        ? `A campanha está exatamente no equilíbrio: o anúncio consome toda a margem e ` +
          `a venda não deixa nem tira dinheiro.`
        : `A campanha gasta ${fmtNumero(acosAtual)}% do preço em anúncio e o produto suporta ` +
          `${fmtNumero(arredondar(margemPercent))}%. Sobram ${fmtNumero(margemResultante)} pontos de margem por venda.`;

  return { situacao, roasEquilibrio: equilibrio, acosAtual, margemResultante, texto };
}
