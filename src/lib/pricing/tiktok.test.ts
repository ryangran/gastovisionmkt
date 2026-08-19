import { describe, it, expect } from "vitest";
import { calcularTikTok } from "./tiktok";

const base = {
  custoProduto: 40,
  impostoPercent: 0,
  marketingPercent: 0,
  freteGratis: false,
  incentivoComissao: false,
};

describe("calcularTikTok", () => {
  it("aplica 6% + R$6 fixo na faixa de preço >= R$50 (caso base)", () => {
    const r = calcularTikTok({ ...base, precoVenda: 100 });
    // 100 * 0,06 = 6 de comissão + 6 de taxa fixa = 12
    // receita líquida = 100 - 12 = 88; lucro = 88 - 40 = 48; margem = 48/100*100 = 48%
    expect(r.valorComissao).toBeCloseTo(12, 2);
    expect(r.receitaLiquida).toBeCloseTo(88, 2);
    expect(r.lucro).toBeCloseTo(48, 2);
    expect(r.margemPercent).toBeCloseTo(48, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("usa a faixa de 10% + R$4 fixo no limite exato da fronteira de R$50", () => {
    const abaixo = calcularTikTok({ ...base, precoVenda: 49 });
    // 49 * 0,10 = 4,9 de comissão + 4 de taxa fixa = 8,9
    expect(abaixo.valorComissao).toBeCloseTo(8.9, 2);

    const noLimite = calcularTikTok({ ...base, precoVenda: 50 });
    // 50 * 0,06 = 3 de comissão + 6 de taxa fixa = 9 (>= 50 já usa a faixa maior)
    expect(noLimite.valorComissao).toBeCloseTo(9, 2);
  });

  it("zera a comissão percentual com incentivo de comissão, mas mantém a taxa fixa", () => {
    const semIncentivo = calcularTikTok({ ...base, precoVenda: 100 });
    const comIncentivo = calcularTikTok({ ...base, precoVenda: 100, incentivoComissao: true });
    // comissão vira 0% + 6 de taxa fixa = 6
    expect(comIncentivo.valorComissao).toBeCloseTo(6, 2);
    expect(comIncentivo.lucro).toBeCloseTo(semIncentivo.lucro + 6, 2);
  });

  it("cobra +6% adicional sobre o preço quando o frete grátis está ativo", () => {
    const semFreteGratis = calcularTikTok({ ...base, precoVenda: 100 });
    const comFreteGratis = calcularTikTok({ ...base, precoVenda: 100, freteGratis: true });
    // 100 * 0,06 = 6 de taxa adicional de frete grátis
    expect(comFreteGratis.valorFrete).toBeCloseTo(6, 2);
    expect(semFreteGratis.valorFrete).toBe(0);
    expect(comFreteGratis.lucro).toBeCloseTo(semFreteGratis.lucro - 6, 2);
  });

  it("desconta imposto e marketing sobre o preço de venda", () => {
    const r = calcularTikTok({
      ...base,
      precoVenda: 100,
      custoProduto: 30,
      impostoPercent: 10,
      marketingPercent: 5,
    });
    expect(r.valorImposto).toBeCloseTo(10, 2);
    expect(r.valorMarketing).toBeCloseTo(5, 2);
  });

  it("não desconta marketing quando o percentual é zero", () => {
    // A UI resolve o toggle de marketing antes de chamar: quando desligado,
    // passa marketingPercent 0. O módulo não conhece o toggle.
    const r = calcularTikTok({
      ...base,
      precoVenda: 100,
      marketingPercent: 0,
    });
    expect(r.valorMarketing).toBe(0);
  });

  it("marca como não lucrativo quando o custo supera a receita líquida", () => {
    const r = calcularTikTok({ ...base, precoVenda: 50, custoProduto: 100 });
    // comissão: 50 * 0,06 + 6 = 9; receita líquida = 41; lucro = 41 - 100 = -59
    expect(r.receitaLiquida).toBeCloseTo(41, 2);
    expect(r.lucro).toBeCloseTo(-59, 2);
    expect(r.lucrativo).toBe(false);
  });

  it("devolve resultado zerado quando o preço é zero, sem NaN", () => {
    const r = calcularTikTok({ ...base, precoVenda: 0, custoProduto: 0 });
    expect(r.margemPercent).toBe(0);
    expect(r.valorComissao).toBe(0);
    expect(r.valorFrete).toBe(0);
    expect(Number.isNaN(r.margemPercent)).toBe(false);
    expect(Number.isNaN(r.lucro)).toBe(false);
  });
});
