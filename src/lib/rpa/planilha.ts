/**
 * Leitura do relatório de afiliados.
 *
 * O formato exato do Relatório Mensal da Shopee não está documentado aqui, e
 * ele muda sem aviso. Por isso o reconhecimento de coluna é por apelido, e a
 * interface sempre deixa o lojista corrigir o mapeamento: errar a coluna do
 * valor emitiria recibo com o número errado, o que é pior do que não emitir.
 */

export type CampoRpa = "nome" | "cpf" | "nascimento" | "endereco" | "valor";

export interface DefinicaoCampo {
  chave: CampoRpa;
  rotulo: string;
  obrigatorio: boolean;
  /** Trechos que, se aparecerem no cabeçalho, identificam a coluna. */
  apelidos: string[];
}

export const CAMPOS_RPA: DefinicaoCampo[] = [
  {
    chave: "nome",
    rotulo: "Nome do afiliado",
    obrigatorio: true,
    apelidos: ["nome do afiliado", "nome completo", "afiliado", "nome", "beneficiario"],
  },
  {
    chave: "valor",
    rotulo: "Valor da comissão",
    obrigatorio: true,
    apelidos: [
      "comissao total",
      "valor a pagar",
      "total de comissao",
      "comissao",
      "valor bruto",
      "valor",
      "ganhos",
    ],
  },
  {
    chave: "cpf",
    rotulo: "CPF",
    obrigatorio: false,
    apelidos: ["cpf", "documento", "cpf/cnpj"],
  },
  {
    chave: "nascimento",
    rotulo: "Data de nascimento",
    obrigatorio: false,
    apelidos: ["data de nascimento", "nascimento", "data nasc"],
  },
  {
    chave: "endereco",
    rotulo: "Endereço",
    obrigatorio: false,
    apelidos: ["endereco completo", "endereco", "logradouro"],
  },
];

export type MapaColunas = Partial<Record<CampoRpa, string>>;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Casa cada campo com a coluna mais específica disponível. Os apelidos estão
 * do mais específico para o mais genérico, e uma coluna já usada não é
 * reaproveitada — sem isso "Nome" e "Nome do Endereço" cairiam no mesmo campo.
 */
export function detectarColunas(cabecalhos: string[]): MapaColunas {
  const mapa: MapaColunas = {};
  const usados = new Set<string>();

  for (const campo of CAMPOS_RPA) {
    for (const apelido of campo.apelidos) {
      const achado = cabecalhos.find(
        (c) => !usados.has(c) && normalizar(c).includes(apelido),
      );
      if (achado) {
        mapa[campo.chave] = achado;
        usados.add(achado);
        break;
      }
    }
  }

  return mapa;
}

/** Aceita "R$ 1.234,56", "1234.56" e número puro. */
export function parseValor(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  if (typeof valor !== "string") return 0;

  const limpo = valor.replace(/[^\d,.-]/g, "").trim();
  if (!limpo) return 0;

  // Com vírgula, o separador decimal é a vírgula e o ponto é milhar.
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

export interface Afiliado {
  nome: string;
  cpf: string;
  nascimento: string;
  endereco: string;
  valorBruto: number;
}

export interface ResultadoPlanilha {
  afiliados: Afiliado[];
  /** Linhas ignoradas por não ter nome ou por ter valor zero. */
  descartadas: number;
}

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

/**
 * Converte as linhas em afiliados, somando as do mesmo prestador — o relatório
 * pode trazer uma linha por pedido, e cada afiliado recebe um recibo só.
 */
export function montarAfiliados(
  linhas: Array<Record<string, unknown>>,
  mapa: MapaColunas,
): ResultadoPlanilha {
  const porPessoa = new Map<string, Afiliado>();
  let descartadas = 0;

  for (const linha of linhas) {
    const nome = mapa.nome ? texto(linha[mapa.nome]) : "";
    const valorBruto = mapa.valor ? parseValor(linha[mapa.valor]) : 0;

    if (!nome || valorBruto <= 0) {
      descartadas += 1;
      continue;
    }

    const cpf = mapa.cpf ? texto(linha[mapa.cpf]) : "";
    // O CPF distingue homônimos; sem ele, o nome é o que temos.
    const chave = `${normalizar(nome)}|${cpf.replace(/\D/g, "")}`;

    const existente = porPessoa.get(chave);
    if (existente) {
      existente.valorBruto = Math.round((existente.valorBruto + valorBruto) * 100) / 100;
      continue;
    }

    porPessoa.set(chave, {
      nome,
      cpf,
      nascimento: mapa.nascimento ? texto(linha[mapa.nascimento]) : "",
      endereco: mapa.endereco ? texto(linha[mapa.endereco]) : "",
      valorBruto: Math.round(valorBruto * 100) / 100,
    });
  }

  return { afiliados: [...porPessoa.values()], descartadas };
}
