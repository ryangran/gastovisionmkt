import { describe, it, expect } from "vitest";
import { calcular, PLATFORM_KEYS } from "./index";
import { PLATFORM_LABELS } from "./types";

/** Um input mínimo por plataforma, só com o que cada uma exige. */
const INPUT_MINIMO = {
  shopee: { usarSubsidioPix: false },
  mercadolivre: {
    tipoAnuncio: "classico" as const,
    produto: "",
    categorias: [],
    pesoKg: 0,
    usarFrete: false,
  },
  amazon: {
    categoria: "Casa",
    modelo: "dba" as const,
    dbaZona: "sp" as const,
    pesoKg: 0,
  },
  magalu: {
    tipoProduto: "leves" as const,
    descontoFrete: "sem_desconto" as const,
    pesoKg: 0,
    comprimento: 0,
    largura: 0,
    altura: 0,
    taxaFixa: 0,
    usarFrete: false,
  },
  tiktok: { freteGratis: false, incentivoComissao: false },
  shein: { pesoKg: 0, comprimento: 0, largura: 0, altura: 0 },
};

const BASE = {
  precoVenda: 0,
  custoProduto: 0,
  impostoPercent: 0,
  marketingPercent: 0,
};

describe("registro de calculadoras", () => {
  it("expõe as seis plataformas", () => {
    expect(PLATFORM_KEYS).toHaveLength(6);
    expect(new Set(PLATFORM_KEYS).size).toBe(6);
  });

  it("tem um rótulo para cada plataforma registrada", () => {
    for (const key of PLATFORM_KEYS) {
      expect(PLATFORM_LABELS[key]).toBeTruthy();
    }
  });

  it("despacha para a calculadora da plataforma pedida", () => {
    const r = calcular("shopee", {
      ...BASE,
      precoVenda: 100,
      custoProduto: 40,
      usarSubsidioPix: false,
    });
    // Mesma conta verificada em shopee.test.ts: 100*0,14 + 20 = 34
    expect(r.valorComissao).toBeCloseTo(34, 2);
  });

  it("nunca devolve margem NaN com preço zero, em nenhuma plataforma", () => {
    for (const key of PLATFORM_KEYS) {
      const input = { ...BASE, ...INPUT_MINIMO[key] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = calcular(key, input as any);
      expect(Number.isNaN(r.margemPercent), `${key} devolveu NaN`).toBe(false);
      expect(r.margemPercent).toBe(0);
    }
  });

  it("desconta custos extras em todas as plataformas", () => {
    for (const key of PLATFORM_KEYS) {
      const base = { ...BASE, ...INPUT_MINIMO[key], precoVenda: 150, custoProduto: 50 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sem = calcular(key, base as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const com = calcular(key, { ...base, custosExtras: 3 } as any);
      expect(com.custosExtras, key).toBeCloseTo(3, 2);
      expect(com.lucro, key).toBeCloseTo(sem.lucro - 3, 2);
    }
  });

  it("devolve lucro e margem coerentes entre si em todas as plataformas", () => {
    for (const key of PLATFORM_KEYS) {
      const input = { ...BASE, ...INPUT_MINIMO[key], precoVenda: 150, custoProduto: 50 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = calcular(key, input as any);
      expect(r.lucro, `${key}`).toBeCloseTo(r.receitaLiquida - r.custoProduto, 2);
      expect(r.margemPercent, `${key}`).toBeCloseTo((r.lucro / r.precoVenda) * 100, 2);
      expect(r.lucrativo, `${key}`).toBe(r.lucro > 0);
    }
  });
});
