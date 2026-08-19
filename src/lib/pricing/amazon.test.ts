import { describe, it, expect } from "vitest";
import { calcularAmazon } from "./amazon";

const base = {
  custoProduto: 40,
  impostoPercent: 0,
  marketingPercent: 0,
  categoria: "Casa", // percentual 0,12 + taxa fixa R$1
  modelo: "dba" as const,
  dbaZona: "sp" as const,
  pesoKg: 0,
};

describe("calcularAmazon", () => {
  it("aplica a comissão escalonada (tiered) na faixa excedente de Móveis", () => {
    // Móveis: tiered { ate: 200, taxa: 15%, taxaExcedente: 10% } + taxa fixa R$1
    // 200 * 0,15 = 30 + (300 - 200) * 0,10 = 10 => 40 + 1 fixo = 41
    // DBA com preço >= 79 e pesoKg = 0 => frete = 0 (peso não informado)
    // receita = 300 - 41 - 0 = 259; lucro = 259 - 100 = 159; margem = 159/300 = 53%
    const r = calcularAmazon({
      ...base,
      categoria: "Móveis",
      precoVenda: 300,
      custoProduto: 100,
    });
    expect(r.valorComissao).toBeCloseTo(41, 2);
    expect(r.valorFrete).toBeCloseTo(0, 2);
    expect(r.receitaLiquida).toBeCloseTo(259, 2);
    expect(r.lucro).toBeCloseTo(159, 2);
    expect(r.margemPercent).toBeCloseTo(53, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("usa a faixa FBA de '750g a 1kg' exatamente no limite de 1kg (não a faixa seguinte)", () => {
    // Roupas e acessórios: 14% + R$1 fixo => 40*0,14 + 1 = 6,6
    // Frete FBA: pesoKg=1 cai na faixa maxKg=1 ("750g a 1kg"), preço <= 50 => coluna ate50 = 17,45
    // receita = 40 - 6,6 - 17,45 = 15,95; lucro = 15,95 - 10 = 5,95
    const r = calcularAmazon({
      ...base,
      categoria: "Roupas e acessórios",
      modelo: "fba",
      precoVenda: 40,
      custoProduto: 10,
      pesoKg: 1,
    });
    expect(r.valorComissao).toBeCloseTo(6.6, 2);
    expect(r.valorFrete).toBeCloseTo(17.45, 2);
    expect(r.lucro).toBeCloseTo(5.95, 2);
  });

  it("desconta imposto e marketing sobre o preço de venda", () => {
    // Comissão Casa: 100*0,12 + 1 = 13; DBA preço>=79 e pesoKg=0 => frete 0
    // imposto = 100*10% = 10; marketing = 100*5% = 5
    const r = calcularAmazon({
      ...base,
      precoVenda: 100,
      custoProduto: 30,
      impostoPercent: 10,
      marketingPercent: 5,
    });
    expect(r.valorImposto).toBeCloseTo(10, 2);
    expect(r.valorMarketing).toBeCloseTo(5, 2);
    expect(r.receitaLiquida).toBeCloseTo(72, 2); // 100 - 13 - 10 - 5
    expect(r.lucro).toBeCloseTo(42, 2);
  });

  it("marca como não lucrativo quando o custo supera a receita líquida (DBA tarifa fixa R$8)", () => {
    // Comissão Casa: 50*0,12 + 1 = 7; DBA 30 < preço(50) < 79 => tarifa fixa R$8
    // receita = 50 - 7 - 8 = 35; lucro = 35 - 45 = -10
    const r = calcularAmazon({
      ...base,
      precoVenda: 50,
      custoProduto: 45,
    });
    expect(r.valorFrete).toBeCloseTo(8, 2);
    expect(r.lucro).toBeCloseTo(-10, 2);
    expect(r.lucrativo).toBe(false);
  });

  it("devolve resultado zerado quando o preço é zero, sem NaN", () => {
    const r = calcularAmazon({ ...base, precoVenda: 0, custoProduto: 0 });
    expect(r.margemPercent).toBe(0);
    expect(r.valorComissao).toBe(0);
    expect(r.valorFrete).toBe(0);
    expect(Number.isNaN(r.margemPercent)).toBe(false);
  });

  it("cobra a tarifa fixa DBA de R$4,50 para produtos até R$30", () => {
    // Comissão Casa: 20*0,12 + 1 = 3,4; DBA preço <= 30 => tarifa fixa 4,50
    const r = calcularAmazon({
      ...base,
      precoVenda: 20,
      custoProduto: 5,
    });
    expect(r.valorFrete).toBeCloseTo(4.5, 2);
    expect(r.valorComissao).toBeCloseTo(3.4, 2);
  });

  it("varia o frete DBA por zona quando o preço é >= R$79 e o peso é informado", () => {
    // pesoKg=2 cai na faixa "1 a 2kg": sp=22,95 / centro_norte=37,95
    const sp = calcularAmazon({
      ...base,
      precoVenda: 100,
      pesoKg: 2,
      dbaZona: "sp",
    });
    const centroNorte = calcularAmazon({
      ...base,
      precoVenda: 100,
      pesoKg: 2,
      dbaZona: "centro_norte",
    });
    expect(sp.valorFrete).toBeCloseTo(22.95, 2);
    expect(centroNorte.valorFrete).toBeCloseTo(37.95, 2);
  });

  it("usa o peso cubado (C×L×A÷6000) quando maior que o peso real informado, no FBA Onsite", () => {
    // pesoKg real = 0,1kg; dimensões 20x20x20cm => cubado = 8000/6000 = 1,333kg (> peso real)
    // faixa FBA Onsite para 1,333kg é '1 a 2kg' => valor 27,95 (não 23,95 da faixa de 0,1kg)
    const r = calcularAmazon({
      ...base,
      modelo: "fba_onsite",
      precoVenda: 60,
      custoProduto: 20,
      pesoKg: 0.1,
      alturaCm: 20,
      larguraCm: 20,
      comprimentoCm: 20,
    });
    expect(r.valorFrete).toBeCloseTo(27.95, 2);
  });
});
