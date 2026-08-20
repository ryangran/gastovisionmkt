import { jsPDF } from "jspdf";
import { calcularRpa, INSS_ALIQUOTA, type ResultadoRpa } from "./impostos";
import type { Afiliado } from "./planilha";

export interface EmpresaRpa {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  municipio: string;
  uf: string;
  cep: string;
  inscricaoEstadual: string;
  descricaoServico: string;
  reterInss: boolean;
  reterIrrf: boolean;
  reterIss: boolean;
  issPercent: number;
}

export interface LinhaValor {
  descricao: string;
  aliquota: string;
  valor: number;
  total?: boolean;
}

function moeda(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Linhas da tabela de valores. Uma retenção desligada não aparece: recibo com
 * linha "R$ 0,00" faz o prestador achar que houve desconto.
 */
export function montarLinhasValores(r: ResultadoRpa, empresa: EmpresaRpa): LinhaValor[] {
  const linhas: LinhaValor[] = [
    { descricao: "Valor Bruto do Serviço", aliquota: "-", valor: r.bruto },
  ];

  if (empresa.reterInss) {
    linhas.push({
      descricao: "(-) INSS",
      aliquota: `${(INSS_ALIQUOTA * 100).toFixed(0)}%`,
      valor: r.inss,
    });
  }
  if (empresa.reterIrrf) {
    linhas.push({
      descricao: "(-) IRRF",
      aliquota: r.irrfIsento ? "Isento" : "Tabela progressiva",
      valor: r.irrf,
    });
  }
  if (empresa.reterIss && empresa.issPercent > 0) {
    linhas.push({
      descricao: "(-) ISS",
      aliquota: `${empresa.issPercent.toLocaleString("pt-BR")}%`,
      valor: r.iss,
    });
  }

  linhas.push({
    descricao: "VALOR LÍQUIDO A RECEBER",
    aliquota: "",
    valor: r.liquido,
    total: true,
  });
  return linhas;
}

/** Número do recibo, estável para o mesmo afiliado no mesmo mês. */
export function numeroRecibo(afiliado: Afiliado, referencia: string): string {
  const semente = `${afiliado.nome}|${afiliado.cpf}|${referencia}`;
  let h = 0;
  for (let i = 0; i < semente.length; i++) {
    h = (h * 31 + semente.charCodeAt(i)) >>> 0;
  }
  return String(h).padStart(11, "0").slice(0, 11);
}

const MARGEM = 20;
const LARGURA = 210;
const UTIL = LARGURA - MARGEM * 2;

function faixaSecao(doc: jsPDF, y: number, titulo: string): number {
  doc.setFillColor(238, 240, 243);
  doc.rect(MARGEM, y, UTIL, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);
  doc.text(titulo, MARGEM + 3, y + 4.8);
  return y + 12;
}

function campo(doc: jsPDF, y: number, rotulo: string, valor: string): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  const largura = doc.getTextWidth(`${rotulo}: `);
  doc.text(`${rotulo}:`, MARGEM, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const linhas = doc.splitTextToSize(valor || "-", UTIL - largura);
  doc.text(linhas, MARGEM + largura, y);
  return y + 5 * linhas.length;
}

/** Desenha um RPA na página atual do documento. */
export function desenharRpa(
  doc: jsPDF,
  afiliado: Afiliado,
  empresa: EmpresaRpa,
  referencia: string,
): void {
  const r = calcularRpa({
    bruto: afiliado.valorBruto,
    reterInss: empresa.reterInss,
    reterIrrf: empresa.reterIrrf,
    issPercent: empresa.reterIss ? empresa.issPercent : 0,
  });

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("RECIBO DE PAGAMENTO A AUTÔNOMO (RPA)", LARGURA / 2, 22, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Nº ${numeroRecibo(afiliado, referencia)}  ·  Referência: ${referencia}`,
    LARGURA / 2,
    28,
    { align: "center" },
  );

  doc.setDrawColor(210, 210, 210);
  doc.line(MARGEM, 33, LARGURA - MARGEM, 33);

  let y = faixaSecao(doc, 38, "1. TOMADOR DOS SERVIÇOS");
  y = campo(doc, y, "Razão Social", empresa.razaoSocial);
  y = campo(doc, y, "CNPJ", empresa.cnpj);
  y = campo(doc, y, "Endereço", empresa.endereco);
  y = campo(doc, y, "Município/UF", [empresa.municipio, empresa.uf].filter(Boolean).join(" - "));
  if (empresa.cep) y = campo(doc, y, "CEP", empresa.cep);
  if (empresa.inscricaoEstadual) {
    y = campo(doc, y, "Inscrição Estadual", empresa.inscricaoEstadual);
  }

  y = faixaSecao(doc, y + 4, "2. PRESTADOR DO SERVIÇO (AUTÔNOMO)");
  y = campo(doc, y, "Nome completo", afiliado.nome);
  y = campo(doc, y, "CPF", afiliado.cpf);
  if (afiliado.nascimento) y = campo(doc, y, "Data de nascimento", afiliado.nascimento);
  if (afiliado.endereco) y = campo(doc, y, "Endereço", afiliado.endereco);

  y = faixaSecao(doc, y + 4, "3. DESCRIÇÃO DO SERVIÇO PRESTADO");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const descricao = doc.splitTextToSize(empresa.descricaoServico || "-", UTIL);
  doc.text(descricao, MARGEM, y);
  y += 5 * descricao.length;

  y = faixaSecao(doc, y + 4, "4. VALORES E IMPOSTOS");

  const colDescricao = MARGEM;
  const colAliquota = MARGEM + 100;
  const colValor = LARGURA - MARGEM;
  const alturaLinha = 8;

  doc.setFillColor(238, 240, 243);
  doc.rect(MARGEM, y, UTIL, alturaLinha, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("Descrição", colDescricao + 2, y + 5.4);
  doc.text("Alíquota", colAliquota + 2, y + 5.4);
  doc.text("Valor (R$)", colValor - 2, y + 5.4, { align: "right" });
  doc.setDrawColor(200, 200, 200);
  doc.rect(MARGEM, y, UTIL, alturaLinha);
  y += alturaLinha;

  for (const linha of montarLinhasValores(r, empresa)) {
    if (linha.total) doc.setFillColor(238, 240, 243);
    if (linha.total) doc.rect(MARGEM, y, UTIL, alturaLinha, "F");
    doc.setFont("helvetica", linha.total ? "bold" : "normal");
    doc.setTextColor(linha.total ? 20 : 50, linha.total ? 20 : 50, linha.total ? 20 : 50);
    doc.text(linha.descricao, colDescricao + 2, y + 5.4);
    if (linha.aliquota) doc.text(linha.aliquota, colAliquota + 2, y + 5.4);
    doc.text(moeda(linha.valor), colValor - 2, y + 5.4, { align: "right" });
    doc.rect(MARGEM, y, UTIL, alturaLinha);
    y += alturaLinha;
  }

  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("Assinatura do Contratante:", MARGEM, y);
  doc.setDrawColor(150, 150, 150);
  doc.line(MARGEM + 48, y + 1, MARGEM + 130, y + 1);
  y += 14;
  doc.text("Assinatura do Prestador:", MARGEM, y);
  doc.line(MARGEM + 44, y + 1, MARGEM + 130, y + 1);

  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(
    "As alíquotas e o enquadramento fiscal devem ser confirmados com o contador responsável.",
    MARGEM,
    282,
  );
}

/** Um RPA por documento, para sair um arquivo por afiliado. */
export function gerarPdfIndividual(
  afiliado: Afiliado,
  empresa: EmpresaRpa,
  referencia: string,
): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  desenharRpa(doc, afiliado, empresa, referencia);
  return doc.output("blob");
}

/** Nome de arquivo seguro, derivado do nome do afiliado. */
export function nomeArquivo(afiliado: Afiliado): string {
  const base = afiliado.nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  return `${base || "RPA"}.pdf`;
}
