import { describe, it, expect } from "vitest";
import { calcularShopee } from "./shopee";

const base = {
  custoProduto: 40,
  impostoPercent: 0,
  marketingPercent: 0,
  usarSubsidioPix: false,
};

describe("calcularShopee", () => {
  it("aplica 14% + R$20 fixo na faixa de R$100 a R$199,99", () => {
    const r = calcularShopee({ ...base, precoVenda: 100 });
    // 100 * 0,14 = 14 de comissão + 20 de taxa fixa = 34
    expect(r.valorComissao).toBeCloseTo(34, 2);
    expect(r.receitaLiquida).toBeCloseTo(66, 2);
    expect(r.lucro).toBeCloseTo(26, 2);
    expect(r.margemPercent).toBeCloseTo(26, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("cobra a taxa fixa como 50% do item abaixo de R$8", () => {
    const r = calcularShopee({ ...base, precoVenda: 5, custoProduto: 1 });
    // 5 * 0,20 = 1 de comissão + 5 * 0,5 = 2,50 de taxa fixa = 3,50
    expect(r.valorComissao).toBeCloseTo(3.5, 2);
  });

  it("usa a faixa de R$79,99 no limite exato da fronteira", () => {
    const r = calcularShopee({ ...base, precoVenda: 79.99, custoProduto: 10 });
    // 79,99 * 0,20 = 15,998 + 4 de taxa fixa
    expect(r.valorComissao).toBeCloseTo(19.998, 2);
  });

  it("soma o subsídio Pix como crédito, não como desconto", () => {
    const semPix = calcularShopee({ ...base, precoVenda: 150, custoProduto: 50 });
    const comPix = calcularShopee({
      ...base,
      precoVenda: 150,
      custoProduto: 50,
      usarSubsidioPix: true,
    });
    expect(comPix.subsidio).toBeCloseTo(7.5, 2); // 150 * 0,05
    expect(comPix.lucro).toBeCloseTo(semPix.lucro + 7.5, 2);
  });

  it("desconta imposto e marketing sobre o preço de venda", () => {
    const r = calcularShopee({
      ...base,
      precoVenda: 100,
      custoProduto: 30,
      impostoPercent: 10,
      marketingPercent: 5,
    });
    expect(r.valorImposto).toBeCloseTo(10, 2);
    expect(r.valorMarketing).toBeCloseTo(5, 2);
  });

  it("marca como não lucrativo quando o custo supera a receita líquida", () => {
    const r = calcularShopee({ ...base, precoVenda: 100, custoProduto: 90 });
    expect(r.lucrativo).toBe(false);
    expect(r.lucro).toBeLessThan(0);
  });

  it("devolve resultado zerado quando o preço é zero", () => {
    const r = calcularShopee({ ...base, precoVenda: 0, custoProduto: 0 });
    expect(r.margemPercent).toBe(0);
    expect(r.valorComissao).toBe(0);
    expect(Number.isNaN(r.margemPercent)).toBe(false);
  });
});
