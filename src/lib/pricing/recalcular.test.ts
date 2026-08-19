import { describe, it, expect } from "vitest";
import { recalcularCarteira, chaveDaPlataforma } from "./recalcular";
import type { ProdutoSalvo } from "@/lib/carteira";
import { SHOPEE_TAXAS } from "./shopee";

function produto(over: Partial<ProdutoSalvo> = {}): ProdutoSalvo {
  return {
    id: "1",
    platform: "Shopee",
    product_name: "Fone",
    sale_price: 100,
    cost: 40,
    profit_margin_percent: 26,
    profit_margin_value: 26,
    stock_quantity: 1,
    inputs: {
      precoVenda: 100,
      custoProduto: 40,
      impostoPercent: 0,
      marketingPercent: 0,
      usarSubsidioPix: false,
    },
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("chaveDaPlataforma", () => {
  it("traduz o nome de exibição gravado no banco para a chave do módulo", () => {
    expect(chaveDaPlataforma("Mercado Livre")).toBe("mercadolivre");
    expect(chaveDaPlataforma("TikTok Shop")).toBe("tiktok");
    expect(chaveDaPlataforma("Shopee")).toBe("shopee");
  });

  it("devolve null para plataforma desconhecida, em vez de chutar", () => {
    expect(chaveDaPlataforma("Amazonas")).toBeNull();
    expect(chaveDaPlataforma("")).toBeNull();
  });
});

describe("recalcularCarteira", () => {
  it("não acusa mudança quando as taxas são as mesmas", () => {
    const r = recalcularCarteira([produto()], {});
    expect(r.mudancas).toHaveLength(0);
    expect(r.totalAvaliados).toBe(1);
  });

  it("detecta queda de margem quando a comissão sobe", () => {
    // 14% -> 20% na faixa de R$100
    const novas = SHOPEE_TAXAS.map((f) =>
      f.max === 199.99 ? { ...f, percentual: 0.2 } : f,
    );
    const r = recalcularCarteira([produto()], { shopee: novas });

    expect(r.mudancas).toHaveLength(1);
    expect(r.mudancas[0].margemAntes).toBeCloseTo(26, 1);
    expect(r.mudancas[0].margemDepois).toBeCloseTo(20, 1); // 100 - 20 - 20 - 40 = 20
    expect(r.mudancas[0].virouPrejuizo).toBe(false);
  });

  it("marca o produto que passou a vender no prejuízo", () => {
    const novas = SHOPEE_TAXAS.map((f) =>
      f.max === 199.99 ? { ...f, percentual: 0.5, fixo: 30 } : f,
    );
    const r = recalcularCarteira([produto()], { shopee: novas });
    expect(r.mudancas[0].virouPrejuizo).toBe(true);
    expect(r.mudancas[0].margemDepois).toBeLessThan(0);
  });

  it("marca quem saiu do prejuízo quando a taxa cai", () => {
    const noPrejuizo = produto({
      cost: 80,
      profit_margin_percent: -14,
      profit_margin_value: -14,
      inputs: {
        precoVenda: 100, custoProduto: 80, impostoPercent: 0,
        marketingPercent: 0, usarSubsidioPix: false,
      },
    });
    const novas = SHOPEE_TAXAS.map((f) =>
      f.max === 199.99 ? { ...f, percentual: 0.05, fixo: 5 } : f,
    );
    const r = recalcularCarteira([noPrejuizo], { shopee: novas });
    expect(r.mudancas[0].deixouPrejuizo).toBe(true);
    expect(r.mudancas[0].margemDepois).toBeGreaterThan(0);
  });

  it("trata produto sem inputs como não recalculável, nunca como zero", () => {
    // Linhas salvas antes da migration não têm as entradas guardadas.
    const antigo = produto({ id: "velho", inputs: {} });
    const r = recalcularCarteira([antigo], { shopee: SHOPEE_TAXAS });
    expect(r.naoRecalculaveis).toHaveLength(1);
    expect(r.mudancas).toHaveLength(0);
  });

  it("trata plataforma desconhecida como não recalculável", () => {
    const estranho = produto({ id: "x", platform: "Americanas" });
    const r = recalcularCarteira([estranho], {});
    expect(r.naoRecalculaveis).toHaveLength(1);
  });

  it("não conta como mudança uma diferença de centésimo por arredondamento", () => {
    const quaseIgual = SHOPEE_TAXAS.map((f) =>
      f.max === 199.99 ? { ...f, percentual: 0.140001 } : f,
    );
    const r = recalcularCarteira([produto()], { shopee: quaseIgual });
    expect(r.mudancas).toHaveLength(0);
  });
});
