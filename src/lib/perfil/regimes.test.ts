import { describe, it, expect } from "vitest";
import {
  REGIMES,
  SIMPLES_ANEXOS,
  faixaSimples,
  aliquotaEfetivaSimples,
  impostoSugerido,
  type RegimeTributario,
} from "./regimes";

describe("faixaSimples", () => {
  it("coloca quem fatura pouco na primeira faixa", () => {
    const f = faixaSimples("I", 120000);
    expect(f.nominal).toBeCloseTo(4, 2);
    expect(f.deducao).toBe(0);
  });

  it("usa a faixa seguinte ao passar do limite", () => {
    expect(faixaSimples("I", 180000).nominal).toBeCloseTo(4, 2);
    expect(faixaSimples("I", 180000.01).nominal).toBeCloseTo(7.3, 2);
  });

  it("cai na última faixa acima do teto do Simples", () => {
    expect(faixaSimples("I", 10_000_000).nominal).toBeCloseTo(19, 2);
  });
});

describe("aliquotaEfetivaSimples", () => {
  it("na primeira faixa a efetiva é a própria nominal, porque não há dedução", () => {
    expect(aliquotaEfetivaSimples("I", 100000)).toBeCloseTo(4, 2);
  });

  it("aplica a fórmula (RBT12 x nominal - dedução) / RBT12", () => {
    // 300.000 * 7,3% = 21.900 - 5.940 = 15.960 / 300.000 = 5,32%
    expect(aliquotaEfetivaSimples("I", 300000)).toBeCloseTo(5.32, 2);
  });

  it("a efetiva nunca passa da nominal da faixa", () => {
    for (const rbt of [200000, 500000, 1000000, 2000000, 4000000]) {
      const efetiva = aliquotaEfetivaSimples("I", rbt);
      expect(efetiva).toBeLessThanOrEqual(faixaSimples("I", rbt).nominal + 0.001);
    }
  });

  it("cresce conforme o faturamento cresce", () => {
    const a = aliquotaEfetivaSimples("I", 200000);
    const b = aliquotaEfetivaSimples("I", 700000);
    const c = aliquotaEfetivaSimples("I", 3000000);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("devolve a nominal da primeira faixa quando o faturamento não foi informado", () => {
    // Quem está começando não tem RBT12; cobrar um número inventado seria pior.
    expect(aliquotaEfetivaSimples("I", 0)).toBeCloseTo(4, 2);
    expect(aliquotaEfetivaSimples("I", -1)).toBeCloseTo(4, 2);
  });

  it("o Anexo II parte de 4,5%, acima do Anexo I", () => {
    expect(aliquotaEfetivaSimples("II", 100000)).toBeCloseTo(4.5, 2);
  });
});

describe("REGIMES", () => {
  it("cobre os quatro regimes pedidos, mais o não informado", () => {
    const chaves = REGIMES.map((r) => r.chave);
    expect(chaves).toContain("mei");
    expect(chaves).toContain("simples");
    expect(chaves).toContain("lucro_presumido");
    expect(chaves).toContain("cpf");
    expect(chaves).toContain("nao_informado");
  });

  it("todo regime tem rótulo e explicação", () => {
    for (const r of REGIMES) {
      expect(r.rotulo.length, r.chave).toBeGreaterThan(2);
      expect(r.explicacao.length, r.chave).toBeGreaterThan(30);
    }
  });

  it("os dois anexos do Simples estão disponíveis", () => {
    expect(SIMPLES_ANEXOS.map((a) => a.chave)).toEqual(["I", "II"]);
  });
});

describe("impostoSugerido", () => {
  it("sugere zero para MEI: o DAS é fixo por mês, não por venda", () => {
    expect(impostoSugerido({ regime: "mei" })).toBe(0);
  });

  it("sugere a alíquota efetiva para o Simples", () => {
    expect(impostoSugerido({ regime: "simples", anexo: "I", rbt12: 300000 })).toBeCloseTo(5.32, 2);
  });

  it("não sugere nada para Lucro Presumido e CPF: depende do contador", () => {
    expect(impostoSugerido({ regime: "lucro_presumido" })).toBeNull();
    expect(impostoSugerido({ regime: "cpf" })).toBeNull();
  });

  it("não sugere nada quando o regime não foi informado", () => {
    expect(impostoSugerido({ regime: "nao_informado" })).toBeNull();
  });

  it("nunca devolve NaN", () => {
    const regimes: RegimeTributario[] = ["mei", "simples", "lucro_presumido", "cpf", "nao_informado"];
    for (const regime of regimes) {
      const v = impostoSugerido({ regime });
      expect(v === null || Number.isFinite(v), regime).toBe(true);
    }
  });
});
