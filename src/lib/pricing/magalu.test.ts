import { describe, it, expect } from "vitest";
import { calcularMagalu } from "./magalu";

const base = {
  custoProduto: 0,
  impostoPercent: 0,
  marketingPercent: 0,
  tipoProduto: "leves" as const,
  descontoFrete: "sem_desconto" as const,
  pesoKg: 0,
  comprimento: 0,
  largura: 0,
  altura: 0,
  taxaFixa: 0,
  usarFrete: false,
};

describe("calcularMagalu", () => {
  it("aplica a faixa de frete de 1kg a 2kg para um peso intermediário", () => {
    const r = calcularMagalu({
      ...base,
      precoVenda: 200,
      custoProduto: 80,
      usarFrete: true,
      pesoKg: 1.5,
    });
    // Comissão: 200 * 0,18 = 36
    // Frete (faixa "De 1kg a 2kg", sem desconto): 42,90
    // Receita líquida: 200 - 36 - 42,90 = 121,10
    // Lucro: 121,10 - 80 = 41,10 | Margem: 41,10 / 200 * 100 = 20,55%
    expect(r.valorComissao).toBeCloseTo(36, 2);
    expect(r.valorFrete).toBeCloseTo(42.9, 2);
    expect(r.receitaLiquida).toBeCloseTo(121.1, 2);
    expect(r.lucro).toBeCloseTo(41.1, 2);
    expect(r.margemPercent).toBeCloseTo(20.55, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("usa a faixa 'até 1kg' (não a de 1kg-2kg) exatamente no limite de 1kg", () => {
    const r = calcularMagalu({
      ...base,
      precoVenda: 100,
      usarFrete: true,
      pesoKg: 1, // exatamente no limite superior da faixa "De 500g a 1kg"
    });
    expect(r.valorFrete).toBeCloseTo(40.8, 2); // não deve cair para 42,90 (faixa seguinte)
  });

  it("desconta imposto e marketing sobre o preço de venda, junto da taxa fixa", () => {
    const r = calcularMagalu({
      ...base,
      precoVenda: 100,
      custoProduto: 30,
      impostoPercent: 8,
      marketingPercent: 10,
      taxaFixa: 5,
    });
    // Comissão: 18 | Imposto: 8 | Marketing: 10 | Taxa fixa: 5
    // Receita líquida: 100 - 18 - 5 - 8 - 10 = 59 | Lucro: 59 - 30 = 29
    expect(r.valorComissao).toBeCloseTo(18, 2);
    expect(r.valorImposto).toBeCloseTo(8, 2);
    expect(r.valorMarketing).toBeCloseTo(10, 2);
    expect(r.receitaLiquida).toBeCloseTo(59, 2);
    expect(r.lucro).toBeCloseTo(29, 2);
  });

  it("não desconta marketing quando o percentual é zero", () => {
    // A UI resolve o switch "Marketing (opcional)" antes de chamar: quando
    // desligado, passa marketingPercent 0. O módulo não conhece o toggle.
    const r = calcularMagalu({
      ...base,
      precoVenda: 100,
      marketingPercent: 0,
    });
    expect(r.valorMarketing).toBe(0);
  });

  it("marca como não lucrativo quando comissão + frete superam a receita disponível", () => {
    const r = calcularMagalu({
      ...base,
      precoVenda: 50,
      custoProduto: 45,
      usarFrete: true,
      pesoKg: 10, // faixa "De 9kg a 13kg", sem desconto: 98,00
    });
    // Comissão: 50 * 0,18 = 9 | Frete: 98
    // Receita líquida: 50 - 9 - 98 = -57 | Lucro: -57 - 45 = -102
    expect(r.valorFrete).toBeCloseTo(98, 2);
    expect(r.lucro).toBeCloseTo(-102, 2);
    expect(r.lucrativo).toBe(false);
  });

  it("devolve resultado neutro, sem NaN, quando o preço de venda é zero", () => {
    const r = calcularMagalu({ ...base, precoVenda: 0, custoProduto: 0 });
    expect(r.margemPercent).toBe(0);
    expect(r.valorComissao).toBe(0);
    expect(r.valorFrete).toBe(0);
    expect(Number.isNaN(r.margemPercent)).toBe(false);
  });
});
