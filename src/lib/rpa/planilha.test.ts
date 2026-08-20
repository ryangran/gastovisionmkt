import { describe, it, expect } from "vitest";
import { detectarColunas, montarAfiliados, CAMPOS_RPA, parseValor } from "./planilha";

describe("parseValor", () => {
  it("lê o formato brasileiro com milhar e vírgula", () => {
    expect(parseValor("1.234,56")).toBeCloseTo(1234.56, 2);
    expect(parseValor("0,16")).toBeCloseTo(0.16, 2);
  });

  it("lê o formato internacional com ponto decimal", () => {
    expect(parseValor("1234.56")).toBeCloseTo(1234.56, 2);
    expect(parseValor(1.43)).toBeCloseTo(1.43, 2);
  });

  it("ignora símbolo de moeda e espaços", () => {
    expect(parseValor("R$ 1.234,56")).toBeCloseTo(1234.56, 2);
    expect(parseValor(" 12,00 ")).toBeCloseTo(12, 2);
  });

  it("devolve zero para vazio ou texto sem número", () => {
    expect(parseValor("")).toBe(0);
    expect(parseValor("—")).toBe(0);
    expect(parseValor(null)).toBe(0);
  });
});

describe("detectarColunas", () => {
  it("reconhece cabeçalhos em português com acento e maiúscula", () => {
    const m = detectarColunas([
      "Nome do Afiliado",
      "CPF",
      "Data de Nascimento",
      "Endereço",
      "Comissão Total",
    ]);
    expect(m.nome).toBe("Nome do Afiliado");
    expect(m.cpf).toBe("CPF");
    expect(m.nascimento).toBe("Data de Nascimento");
    expect(m.endereco).toBe("Endereço");
    expect(m.valor).toBe("Comissão Total");
  });

  it("reconhece variações de nome de coluna", () => {
    const m = detectarColunas(["Afiliado", "Documento", "Valor a Pagar"]);
    expect(m.nome).toBe("Afiliado");
    expect(m.cpf).toBe("Documento");
    expect(m.valor).toBe("Valor a Pagar");
  });

  it("deixa em branco o que não reconhecer, em vez de chutar uma coluna", () => {
    const m = detectarColunas(["Coluna A", "Coluna B", "Coluna C"]);
    expect(m.nome).toBeUndefined();
    expect(m.cpf).toBeUndefined();
    expect(m.valor).toBeUndefined();
  });

  it("não usa a mesma coluna para dois campos diferentes", () => {
    const m = detectarColunas(["Nome", "Nome do Endereço"]);
    const usados = Object.values(m).filter(Boolean);
    expect(new Set(usados).size).toBe(usados.length);
  });

  it("exige nome e valor para o relatório ser utilizável", () => {
    expect(CAMPOS_RPA.filter((c) => c.obrigatorio).map((c) => c.chave)).toEqual([
      "nome",
      "valor",
    ]);
  });
});

describe("montarAfiliados", () => {
  const mapa = { nome: "Afiliado", cpf: "CPF", valor: "Comissão" };

  it("converte as linhas da planilha em afiliados", () => {
    const linhas = [
      { Afiliado: "Agnes Machado", CPF: "848.412.220-49", "Comissão": "1,43" },
      { Afiliado: "João Silva", CPF: "111.222.333-44", "Comissão": "R$ 250,00" },
    ];
    const r = montarAfiliados(linhas, mapa);
    expect(r.afiliados).toHaveLength(2);
    expect(r.afiliados[0].nome).toBe("Agnes Machado");
    expect(r.afiliados[0].valorBruto).toBeCloseTo(1.43, 2);
    expect(r.afiliados[1].valorBruto).toBeCloseTo(250, 2);
  });

  it("descarta linha sem nome e reporta quantas foram", () => {
    const linhas = [
      { Afiliado: "Agnes", CPF: "1", "Comissão": "10" },
      { Afiliado: "", CPF: "2", "Comissão": "20" },
    ];
    const r = montarAfiliados(linhas, mapa);
    expect(r.afiliados).toHaveLength(1);
    expect(r.descartadas).toBe(1);
  });

  it("descarta linha com valor zero: recibo de zero não faz sentido", () => {
    const linhas = [
      { Afiliado: "Agnes", CPF: "1", "Comissão": "10" },
      { Afiliado: "Sem comissão", CPF: "2", "Comissão": "0" },
    ];
    const r = montarAfiliados(linhas, mapa);
    expect(r.afiliados).toHaveLength(1);
    expect(r.descartadas).toBe(1);
  });

  it("soma as linhas do mesmo afiliado, em vez de emitir dois recibos", () => {
    // O relatório da Shopee pode trazer uma linha por pedido.
    const linhas = [
      { Afiliado: "Agnes", CPF: "848.412.220-49", "Comissão": "1,00" },
      { Afiliado: "Agnes", CPF: "848.412.220-49", "Comissão": "0,43" },
    ];
    const r = montarAfiliados(linhas, mapa);
    expect(r.afiliados).toHaveLength(1);
    expect(r.afiliados[0].valorBruto).toBeCloseTo(1.43, 2);
  });

  it("não junta homônimos com CPF diferente", () => {
    const linhas = [
      { Afiliado: "Ana Silva", CPF: "111", "Comissão": "10" },
      { Afiliado: "Ana Silva", CPF: "222", "Comissão": "20" },
    ];
    const r = montarAfiliados(linhas, mapa);
    expect(r.afiliados).toHaveLength(2);
  });

  it("devolve lista vazia sem quebrar quando não há linhas", () => {
    const r = montarAfiliados([], mapa);
    expect(r.afiliados).toEqual([]);
    expect(r.descartadas).toBe(0);
  });
});
