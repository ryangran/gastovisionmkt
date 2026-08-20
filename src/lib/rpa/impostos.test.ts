import { describe, it, expect } from "vitest";
import {
  INSS_TETO,
  INSS_ALIQUOTA,
  calcularInss,
  calcularIrrf,
  calcularRpa,
} from "./impostos";

describe("calcularInss", () => {
  it("aplica 11% sobre o valor bruto", () => {
    expect(calcularInss(1000)).toBeCloseTo(110, 2);
  });

  it("reproduz o recibo de exemplo: R$1,43 de bruto rende R$0,16 de INSS", () => {
    // 1,43 * 0,11 = 0,1573, arredondado para 0,16
    expect(calcularInss(1.43)).toBeCloseTo(0.16, 2);
  });

  it("respeita o teto: acima dele a contribuição para de crescer", () => {
    const noTeto = calcularInss(INSS_TETO);
    expect(calcularInss(INSS_TETO * 3)).toBeCloseTo(noTeto, 2);
    expect(noTeto).toBeCloseTo(INSS_TETO * INSS_ALIQUOTA, 2);
  });

  it("devolve zero para valor zero ou negativo", () => {
    expect(calcularInss(0)).toBe(0);
    expect(calcularInss(-10)).toBe(0);
  });
});

describe("calcularIrrf", () => {
  it("isenta a primeira faixa", () => {
    expect(calcularIrrf(1000)).toBe(0);
    expect(calcularIrrf(2428.8)).toBe(0);
  });

  it("aplica 7,5% com a dedução da segunda faixa", () => {
    // 2500 * 0,075 = 187,50 - 182,16 = 5,34
    expect(calcularIrrf(2500)).toBeCloseTo(5.34, 2);
  });

  it("aplica 27,5% com a dedução da última faixa", () => {
    // 10000 * 0,275 = 2750 - 908,73 = 1841,27
    expect(calcularIrrf(10000)).toBeCloseTo(1841.27, 2);
  });

  it("nunca devolve imposto negativo na fronteira das faixas", () => {
    for (const base of [2428.81, 2826.65, 2826.66, 3751.05, 3751.06, 4664.68, 4664.69]) {
      expect(calcularIrrf(base), `base ${base}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("devolve zero para base zero ou negativa", () => {
    expect(calcularIrrf(0)).toBe(0);
    expect(calcularIrrf(-500)).toBe(0);
  });
});

describe("calcularRpa", () => {
  it("reproduz o recibo de exemplo de ponta a ponta", () => {
    const r = calcularRpa({ bruto: 1.43, reterInss: true, reterIrrf: true, issPercent: 0 });
    expect(r.bruto).toBeCloseTo(1.43, 2);
    expect(r.inss).toBeCloseTo(0.16, 2);
    expect(r.irrf).toBe(0);
    expect(r.iss).toBe(0);
    expect(r.liquido).toBeCloseTo(1.27, 2);
    expect(r.irrfIsento).toBe(true);
  });

  it("desconta o INSS da base do IRRF, como manda a regra do autônomo", () => {
    const bruto = 3000;
    const inss = calcularInss(bruto); // 330
    const r = calcularRpa({ bruto, reterInss: true, reterIrrf: true, issPercent: 0 });
    expect(r.baseIrrf).toBeCloseTo(bruto - inss, 2);
    expect(r.irrf).toBeCloseTo(calcularIrrf(bruto - inss), 2);
  });

  it("com INSS desligado, a base do IRRF passa a ser o bruto inteiro", () => {
    const r = calcularRpa({ bruto: 3000, reterInss: false, reterIrrf: true, issPercent: 0 });
    expect(r.inss).toBe(0);
    expect(r.baseIrrf).toBeCloseTo(3000, 2);
  });

  it("com todas as retenções desligadas, o líquido é o próprio bruto", () => {
    const r = calcularRpa({ bruto: 1500, reterInss: false, reterIrrf: false, issPercent: 0 });
    expect(r.inss).toBe(0);
    expect(r.irrf).toBe(0);
    expect(r.iss).toBe(0);
    expect(r.liquido).toBeCloseTo(1500, 2);
  });

  it("aplica o ISS sobre o valor bruto quando informado", () => {
    const r = calcularRpa({ bruto: 1000, reterInss: false, reterIrrf: false, issPercent: 5 });
    expect(r.iss).toBeCloseTo(50, 2);
    expect(r.liquido).toBeCloseTo(950, 2);
  });

  it("o líquido é sempre bruto menos as três retenções", () => {
    const r = calcularRpa({ bruto: 5000, reterInss: true, reterIrrf: true, issPercent: 3 });
    expect(r.liquido).toBeCloseTo(r.bruto - r.inss - r.irrf - r.iss, 2);
  });

  it("nunca devolve líquido negativo nem NaN", () => {
    for (const bruto of [0, 0.01, 1, 100, 999999]) {
      const r = calcularRpa({ bruto, reterInss: true, reterIrrf: true, issPercent: 20 });
      expect(Number.isNaN(r.liquido), `bruto ${bruto}`).toBe(false);
      expect(r.liquido, `bruto ${bruto}`).toBeGreaterThanOrEqual(0);
    }
  });

  it("arredonda cada valor a duas casas, para o recibo fechar na soma", () => {
    const r = calcularRpa({ bruto: 1234.567, reterInss: true, reterIrrf: true, issPercent: 2 });
    for (const v of [r.bruto, r.inss, r.irrf, r.iss, r.liquido]) {
      expect(Math.round(v * 100) / 100).toBe(v);
    }
  });
});
