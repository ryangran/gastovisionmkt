import { describe, it, expect } from "vitest";
import { calcularShein, calcularFreteShein } from "./shein";

const base = {
  custoProduto: 40,
  impostoPercent: 0,
  marketingPercent: 0,
  pesoKg: 0,
  comprimento: 0,
  largura: 0,
  altura: 0,
};

describe("calcularShein", () => {
  it("aplica 16% de comissão e frete de R$6 na faixa de 600g a 900g", () => {
    const r = calcularShein({ ...base, precoVenda: 100, custoProduto: 30, pesoKg: 0.7 });
    // 100 * 0,16 = 16 de comissão; peso 0,7kg cai na faixa 600g-900g (R$6 de frete)
    // receita = 100 - 16 - 6 - 0 - 0 = 78; lucro = 78 - 30 = 48
    expect(r.valorComissao).toBeCloseTo(16, 2);
    expect(r.valorFrete).toBeCloseTo(6, 2);
    expect(r.receitaLiquida).toBeCloseTo(78, 2);
    expect(r.lucro).toBeCloseTo(48, 2);
    expect(r.margemPercent).toBeCloseTo(48, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("usa a faixa 'Até 600g' (R$4) no limite exato de 0,6kg", () => {
    const r = calcularShein({ ...base, precoVenda: 50, custoProduto: 20, pesoKg: 0.6 });
    // pesoUsado = 0,6kg cai exatamente no limite superior da faixa "Até 600g" (R$4)
    expect(r.valorFrete).toBeCloseTo(4, 2);
    expect(r.lucro).toBeCloseTo(18, 2); // 50 - 8(comissão) - 4(frete) - 20(custo)
  });

  it("desconta imposto e marketing sobre o preço de venda", () => {
    const r = calcularShein({
      ...base,
      precoVenda: 200,
      custoProduto: 50,
      impostoPercent: 10,
      marketingPercent: 5,
    });
    expect(r.valorImposto).toBeCloseTo(20, 2);
    expect(r.valorMarketing).toBeCloseTo(10, 2);
    expect(r.lucro).toBeCloseTo(88, 2); // 200 - 32(comissão) - 0(frete) - 20 - 10 - 50
  });

  it("marca como não lucrativo quando o custo e o frete superam a receita", () => {
    const r = calcularShein({ ...base, precoVenda: 50, custoProduto: 45, pesoKg: 1.0 });
    // peso 1,0kg cai na faixa 900g-1,2kg (R$8 de frete)
    expect(r.valorFrete).toBeCloseTo(8, 2);
    expect(r.lucrativo).toBe(false);
    expect(r.lucro).toBeLessThan(0);
  });

  it("devolve resultado zerado quando o preço é zero", () => {
    const r = calcularShein({ ...base, precoVenda: 0, custoProduto: 0 });
    expect(r.margemPercent).toBe(0);
    expect(r.valorComissao).toBe(0);
    expect(r.valorFrete).toBe(0);
    expect(Number.isNaN(r.margemPercent)).toBe(false);
  });

  it("usa o peso cúbico (C×L×A/6000) quando ele supera o peso real", () => {
    // 30 x 20 x 10 = 6000 -> peso cúbico = 6000/6000 = 1kg, maior que o peso real de 0,1kg
    const info = calcularFreteShein(0.1, 30, 20, 10);
    expect(info.pesoCubico).toBeCloseTo(1, 3);
    expect(info.pesoUsado).toBeCloseTo(1, 3);
    expect(info.valor).toBeCloseTo(8, 2); // cai na faixa 900g-1,2kg

    const r = calcularShein({
      ...base,
      precoVenda: 80,
      custoProduto: 10,
      pesoKg: 0.1,
      comprimento: 30,
      largura: 20,
      altura: 10,
    });
    expect(r.valorFrete).toBeCloseTo(8, 2);
    expect(r.lucro).toBeCloseTo(49.2, 2); // 80 - 12,8(comissão) - 8(frete) - 10(custo)
  });
});
