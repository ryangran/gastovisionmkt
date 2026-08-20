import { describe, it, expect } from "vitest";
import { extrairMedidas, montarSessao } from "./transferirProduto";

const produto = {
  nome: "Fone",
  precoVenda: 38.99,
  custo: 19.99,
  impostoPercent: 7,
};

describe("extrairMedidas", () => {
  it("lê peso e dimensões do formato da Shein e do Magalu", () => {
    const m = extrairMedidas({
      pesoKg: 0.6,
      comprimento: 20,
      largura: 15,
      altura: 10,
    });
    expect(m.pesoKg).toBeCloseTo(0.6, 3);
    expect(m.comprimentoCm).toBe(20);
    expect(m.alturaCm).toBe(10);
  });

  it("lê o formato da Amazon, que nomeia as dimensões com sufixo Cm", () => {
    const m = extrairMedidas({
      pesoKg: 1.2,
      comprimentoCm: 30,
      larguraCm: 20,
      alturaCm: 10,
    });
    expect(m.pesoKg).toBeCloseTo(1.2, 3);
    expect(m.comprimentoCm).toBe(30);
    expect(m.larguraCm).toBe(20);
  });

  it("devolve vazio para produto sem medidas, sem inventar zero", () => {
    const m = extrairMedidas({ precoVenda: 10, custoProduto: 5 });
    expect(m.pesoKg).toBeUndefined();
    expect(m.comprimentoCm).toBeUndefined();
  });

  it("ignora entradas ausentes", () => {
    expect(extrairMedidas({}).pesoKg).toBeUndefined();
    expect(extrairMedidas(null as never).pesoKg).toBeUndefined();
  });
});

describe("montarSessao", () => {
  it("preenche nome, preço, custo e imposto da plataforma destino", () => {
    const s = montarSessao("shopee", produto);
    expect(s.calc_shopee_nome).toBe('"Fone"');
    expect(s.calc_shopee_preco).toBe('"38.99"');
    expect(s.calc_shopee_custo).toBe('"19.99"');
    expect(s.calc_shopee_imposto).toBe('"7"');
  });

  it("seleciona a aba da plataforma destino", () => {
    expect(montarSessao("magalu", produto).calc_plataforma).toBe('"magalu"');
  });

  it("grava o peso em kg para Magalu, Amazon e Mercado Livre", () => {
    const dados = { ...produto, pesoKg: 0.6 };
    expect(montarSessao("magalu", dados).calc_magalu_peso).toBe('"0.6"');
    expect(montarSessao("amazon", dados).calc_amazon_peso_fba).toBe('"0.6"');
    expect(montarSessao("mercadolivre", dados).calc_ml_peso).toBe('"0.6"');
  });

  it("converte o peso para gramas na Shein, que usa outra unidade", () => {
    // O campo da Shein é "Peso (gramas)"; gravar 0,6 ali faria o produto pesar
    // 0,6 g em vez de 600 g e zeraria o frete.
    const s = montarSessao("shein", { ...produto, pesoKg: 0.6 });
    expect(s.calc_shein_peso).toBe('"600"');
  });

  it("grava as dimensões com o nome de campo de cada plataforma", () => {
    const dados = { ...produto, comprimentoCm: 20, larguraCm: 15, alturaCm: 10 };
    const shein = montarSessao("shein", dados);
    expect(shein.calc_shein_comp).toBe('"20"');
    expect(shein.calc_shein_alt).toBe('"10"');

    const amazon = montarSessao("amazon", dados);
    expect(amazon.calc_amazon_comprimento_fba).toBe('"20"');

    const magalu = montarSessao("magalu", dados);
    expect(magalu.calc_magalu_comprimento).toBe('"20"');
  });

  it("não grava chave de medida que a plataforma destino não tem", () => {
    const s = montarSessao("tiktok", { ...produto, pesoKg: 2, comprimentoCm: 10 });
    expect(Object.keys(s).some((k) => k.includes("peso"))).toBe(false);
    expect(Object.keys(s).some((k) => k.includes("comp"))).toBe(false);
  });

  it("omite medidas ausentes em vez de gravar zero", () => {
    const s = montarSessao("shein", produto);
    expect(s.calc_shein_peso).toBeUndefined();
    expect(s.calc_shein_comp).toBeUndefined();
  });

  it("grava valores como JSON, no formato que usePersistedState espera", () => {
    const s = montarSessao("shopee", produto);
    for (const valor of Object.values(s)) {
      expect(() => JSON.parse(valor)).not.toThrow();
    }
  });
});
