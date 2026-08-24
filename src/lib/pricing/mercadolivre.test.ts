import { describe, it, expect } from "vitest";
import { calcularMercadoLivre } from "./mercadolivre";

const categorias = [{ nome: "Eletrônicos", classicoPerc: 0.115, premiumPerc: 0.165 }];

const base = {
  custoProduto: 40,
  impostoPercent: 0,
  marketingPercent: 0,
  tipoAnuncio: "classico" as const,
  produto: "Eletrônicos",
  categorias,
  pesoKg: 0,
  usarFrete: false,
};

describe("calcularMercadoLivre", () => {
  it("aplica a comissão do anúncio clássico (11,5%)", () => {
    const r = calcularMercadoLivre({ ...base, precoVenda: 100, custoProduto: 40 });
    // Comissão: 100 * 0,115 = 11,5. Preço 100 não tem custo fixo (acima de R$79) = 0.
    // Receita líquida: 100 - 11,5 = 88,5. Lucro: 88,5 - 40 = 48,5. Margem: 48,5%.
    expect(r.valorComissao).toBeCloseTo(11.5, 2);
    expect(r.receitaLiquida).toBeCloseTo(88.5, 2);
    expect(r.lucro).toBeCloseTo(48.5, 2);
    expect(r.margemPercent).toBeCloseTo(48.5, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("aplica a comissão do anúncio premium (16,5%)", () => {
    const r = calcularMercadoLivre({
      ...base,
      tipoAnuncio: "premium",
      precoVenda: 100,
      custoProduto: 40,
    });
    // Comissão: 100 * 0,165 = 16,5 (sem custo fixo, preço > R$79).
    // Receita líquida: 100 - 16,5 = 83,5. Lucro: 83,5 - 40 = 43,5. Margem: 43,5%.
    expect(r.valorComissao).toBeCloseTo(16.5, 2);
    expect(r.receitaLiquida).toBeCloseTo(83.5, 2);
    expect(r.lucro).toBeCloseTo(43.5, 2);
    expect(r.margemPercent).toBeCloseTo(43.5, 2);
    expect(r.lucrativo).toBe(true);
  });

  it("usa a fronteira exata entre as faixas de peso do frete (0,3kg vs 0,31kg)", () => {
    const noLimite = calcularMercadoLivre({
      ...base,
      precoVenda: 30,
      custoProduto: 2,
      usarFrete: true,
      pesoKg: 0.3,
    });
    const acimaDoLimite = calcularMercadoLivre({
      ...base,
      precoVenda: 30,
      custoProduto: 2,
      usarFrete: true,
      pesoKg: 0.31,
    });
    // Preço R$30 cai na faixa "R$19–48,99" (coluna 1). Acima de R$19 de
    // propósito: abaixo disso o teto de metade do preço mascararia a fronteira
    // de peso, que é o que este teste quer verificar.
    // 0,3kg ainda é a faixa "Até 0,3 kg" (linha 0) -> frete R$6,85.
    // 0,31kg já cai na faixa "De 0,3 a 0,5 kg" (linha 1) -> frete R$6,95.
    expect(noLimite.valorFrete).toBeCloseTo(6.85, 2);
    expect(acimaDoLimite.valorFrete).toBeCloseTo(6.95, 2);
  });

  it("desconta imposto e marketing sobre o preço de venda", () => {
    const r = calcularMercadoLivre({
      ...base,
      precoVenda: 200,
      custoProduto: 80,
      impostoPercent: 10,
      marketingPercent: 5,
    });
    // Comissão: 200 * 0,115 = 23 (sem custo fixo, preço > R$79).
    // Imposto: 200 * 0,10 = 20. Marketing: 200 * 0,05 = 10.
    // Receita líquida: 200 - 23 - 20 - 10 = 147. Lucro: 147 - 80 = 67.
    expect(r.valorImposto).toBeCloseTo(20, 2);
    expect(r.valorMarketing).toBeCloseTo(10, 2);
    expect(r.receitaLiquida).toBeCloseTo(147, 2);
    expect(r.lucro).toBeCloseTo(67, 2);
  });

  it("marca como não lucrativo quando o custo supera a receita líquida", () => {
    const r = calcularMercadoLivre({ ...base, precoVenda: 50, custoProduto: 45 });
    // Comissão: 50 * 0,115 = 5,75. Preço R$50 cai na faixa de custo fixo <=50 -> R$6,50.
    // Comissão total: 5,75 + 6,50 = 12,25.
    // Receita líquida: 50 - 12,25 = 37,75. Lucro: 37,75 - 45 = -7,25.
    expect(r.valorComissao).toBeCloseTo(12.25, 2);
    expect(r.lucro).toBeCloseTo(-7.25, 2);
    expect(r.lucrativo).toBe(false);
  });

  it("devolve resultado zerado quando o preço é zero, sem NaN", () => {
    const r = calcularMercadoLivre({ ...base, precoVenda: 0, custoProduto: 0 });
    expect(r.margemPercent).toBe(0);
    expect(r.valorComissao).toBe(0);
    expect(r.valorFrete).toBe(0);
    expect(Number.isNaN(r.margemPercent)).toBe(false);
    expect(Number.isNaN(r.lucro)).toBe(false);
  });
});

describe("teto de metade do preço abaixo de R$19", () => {
  const base = {
    precoVenda: 0,
    custoProduto: 0,
    impostoPercent: 0,
    marketingPercent: 0,
    tipoAnuncio: "premium" as const,
    produto: "Padrão",
    categorias: [{ nome: "Padrão", classicoPerc: 0.11, premiumPerc: 0.16 }],
    pesoKg: 0,
    usarFrete: true,
  };

  it("limita o frete a metade do preço quando o produto custa menos de R$19", () => {
    // Produto de R$10 com 5 kg: a tabela diz R$6,55, mas o ML cobra no máximo
    // metade do preço. Sem o teto a calculadora mostraria prejuízo onde não há.
    const r = calcularMercadoLivre({ ...base, precoVenda: 10, pesoKg: 5 });
    expect(r.valorFrete).toBeCloseTo(5, 2);
  });

  it("não aplica o teto quando ele é maior que o valor de tabela", () => {
    // R$18 de preço dá teto de R$9, mas a tabela cobra R$5,65 — vence o menor.
    const r = calcularMercadoLivre({ ...base, precoVenda: 18, pesoKg: 0.2 });
    expect(r.valorFrete).toBeCloseTo(5.65, 2);
  });

  it("a partir de R$19 vale a tabela cheia", () => {
    // 5 kg é o limite SUPERIOR da faixa "De 4 a 5 kg", então ainda é linha 7 e
    // não linha 8. R$19 já sai da primeira coluna e cai em "R$19–48,99".
    const r = calcularMercadoLivre({ ...base, precoVenda: 19, pesoKg: 5 });
    expect(r.valorFrete).toBeCloseTo(8.85, 2);
  });
});

describe("faixas de peso acima de 20 kg", () => {
  const base = {
    precoVenda: 0,
    custoProduto: 0,
    impostoPercent: 0,
    marketingPercent: 0,
    tipoAnuncio: "premium" as const,
    produto: "Padrão",
    categorias: [{ nome: "Padrão", classicoPerc: 0.11, premiumPerc: 0.16 }],
    pesoKg: 0,
    usarFrete: true,
  };

  it("cobre os pesos que a tabela antiga deixava de fora", () => {
    // A tabela anterior parava em 20 kg, então tudo acima caía na última faixa
    // e saía barato demais. Agora vai até "Mais de 150 kg".
    expect(calcularMercadoLivre({ ...base, precoVenda: 250, pesoKg: 45 }).valorFrete)
      .toBeCloseTo(111.65, 2);
    expect(calcularMercadoLivre({ ...base, precoVenda: 250, pesoKg: 200 }).valorFrete)
      .toBeCloseTo(262.85, 2);
  });
});
