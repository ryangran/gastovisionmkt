import { describe, it, expect } from "vitest";
import { agregarCarteira, type ProdutoSalvo } from "./carteira";

const base: Omit<ProdutoSalvo, "sale_price" | "cost" | "profit_margin_percent" | "profit_margin_value" | "stock_quantity"> = {
  id: "1",
  platform: "Shopee",
  product_name: "X",
  inputs: {},
  created_at: "2026-01-01T00:00:00Z",
};

function produto(over: Partial<ProdutoSalvo> = {}): ProdutoSalvo {
  return {
    ...base,
    sale_price: 100,
    cost: 40,
    profit_margin_percent: 26,
    profit_margin_value: 26,
    stock_quantity: 0,
    ...over,
  };
}

describe("agregarCarteira", () => {
  it("soma o custo do estoque como custo x quantidade", () => {
    const r = agregarCarteira([
      produto({ stock_quantity: 3 }),
      produto({ id: "2", sale_price: 50, cost: 20, profit_margin_value: 5, profit_margin_percent: 10, stock_quantity: 2 }),
    ]);
    expect(r.custoTotalEstoque).toBeCloseTo(160, 2); // 40*3 + 20*2
    expect(r.valorVendaEstoque).toBeCloseTo(400, 2); // 100*3 + 50*2
    expect(r.lucroPotencial).toBeCloseTo(88, 2); // 26*3 + 5*2
  });

  it("não conta no custo imobilizado o produto sem estoque, mas o conta no total", () => {
    const r = agregarCarteira([produto({ stock_quantity: 0 })]);
    expect(r.custoTotalEstoque).toBe(0);
    expect(r.totalProdutos).toBe(1);
  });

  it("lista os produtos com margem negativa", () => {
    const r = agregarCarteira([
      produto({ stock_quantity: 1 }),
      produto({ id: "2", cost: 95, profit_margin_percent: -5, profit_margin_value: -5, stock_quantity: 1 }),
    ]);
    expect(r.produtosNoPrejuizo).toHaveLength(1);
    expect(r.produtosNoPrejuizo[0].id).toBe("2");
  });

  it("pondera a margem média pelo valor de venda em estoque, não pela média simples", () => {
    // Um item barato de margem alta não pode mascarar o item caro de margem baixa.
    const r = agregarCarteira([
      produto({ id: "caro", sale_price: 1000, cost: 950, profit_margin_percent: 5, profit_margin_value: 50, stock_quantity: 1 }),
      produto({ id: "barato", sale_price: 10, cost: 2, profit_margin_percent: 80, profit_margin_value: 8, stock_quantity: 1 }),
    ]);
    // Ponderada: (50 + 8) / (1000 + 10) = 5,74%. Média simples daria 42,5%.
    expect(r.margemMedia).toBeCloseTo(5.74, 1);
  });

  it("agrupa custo e contagem por plataforma", () => {
    const r = agregarCarteira([
      produto({ platform: "Shopee", stock_quantity: 2 }),
      produto({ id: "2", platform: "Shopee", cost: 10, stock_quantity: 1 }),
      produto({ id: "3", platform: "Amazon", cost: 30, stock_quantity: 1 }),
    ]);
    const shopee = r.porPlataforma.find((p) => p.platform === "Shopee");
    const amazon = r.porPlataforma.find((p) => p.platform === "Amazon");
    expect(shopee?.custoEstoque).toBeCloseTo(90, 2); // 40*2 + 10*1
    expect(shopee?.produtos).toBe(2);
    expect(amazon?.custoEstoque).toBeCloseTo(30, 2);
  });

  it("devolve zeros para carteira vazia, sem NaN", () => {
    const r = agregarCarteira([]);
    expect(r.margemMedia).toBe(0);
    expect(Number.isNaN(r.margemMedia)).toBe(false);
    expect(r.custoTotalEstoque).toBe(0);
    expect(r.totalProdutos).toBe(0);
    expect(r.porPlataforma).toEqual([]);
  });

  it("não quebra quando stock_quantity vem ausente do banco", () => {
    // Antes da migration as linhas antigas não têm a coluna.
    const semEstoque = { ...produto(), stock_quantity: undefined as unknown as number };
    const r = agregarCarteira([semEstoque]);
    expect(r.custoTotalEstoque).toBe(0);
    expect(Number.isNaN(r.custoTotalEstoque)).toBe(false);
  });
});
