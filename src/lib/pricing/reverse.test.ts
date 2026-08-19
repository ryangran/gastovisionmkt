import { describe, it, expect } from "vitest";
import { precoParaMargem } from "./reverse";
import { calcularShopee } from "./shopee";
import { calcular, PLATFORM_KEYS } from "./index";

const shopee = {
  custoProduto: 40,
  impostoPercent: 0,
  marketingPercent: 0,
  usarSubsidioPix: false,
};

describe("precoParaMargem", () => {
  it("encontra um preço cuja margem bate com o alvo", () => {
    const preco = precoParaMargem("shopee", 20, shopee);
    expect(preco).not.toBeNull();
    const r = calcularShopee({ ...shopee, precoVenda: preco! });
    expect(r.margemPercent).toBeGreaterThanOrEqual(19.95);
    expect(r.margemPercent).toBeLessThan(20.6);
  });

  it("exige preço maior para margem maior", () => {
    const p10 = precoParaMargem("shopee", 10, shopee)!;
    const p30 = precoParaMargem("shopee", 30, shopee)!;
    expect(p30).toBeGreaterThan(p10);
  });

  it("devolve null quando a margem alvo é inalcançável", () => {
    // A comissão da Shopee é 14% e o teto de margem fica abaixo de 86%.
    expect(precoParaMargem("shopee", 95, shopee)).toBeNull();
  });

  it("devolve null para custo zero ou negativo de alvo inválido", () => {
    expect(precoParaMargem("shopee", -5, shopee)).toBeNull();
  });

  it("atravessa a fronteira de faixa sem devolver um preço da faixa errada", () => {
    // Em R$80 a Shopee salta de 20% + R$4 para 14% + R$16: a margem CAI ao
    // cruzar. O preço devolvido tem que realmente entregar o alvo, não um
    // ponto que só parecia válido antes do salto.
    for (const alvo of [5, 10, 15, 20, 25, 30, 35, 40]) {
      const preco = precoParaMargem("shopee", alvo, shopee);
      if (preco === null) continue;
      const r = calcularShopee({ ...shopee, precoVenda: preco });
      expect(r.margemPercent, `alvo ${alvo}% devolveu preço ${preco}`).toBeGreaterThanOrEqual(
        alvo - 0.1,
      );
    }
  });

  it("devolve o menor preço que atinge o alvo, não um preço qualquer acima dele", () => {
    const preco = precoParaMargem("shopee", 20, shopee)!;
    const umPoucoAbaixo = calcularShopee({ ...shopee, precoVenda: preco - 1 });
    expect(umPoucoAbaixo.margemPercent).toBeLessThan(20);
  });

  it("funciona em todas as plataformas sem devolver NaN", () => {
    const extras: Record<string, Record<string, unknown>> = {
      shopee: { usarSubsidioPix: false },
      mercadolivre: {
        tipoAnuncio: "classico",
        produto: "C",
        categorias: [{ nome: "C", classicoPerc: 0.12, premiumPerc: 0.16 }],
        pesoKg: 0.5,
        usarFrete: false,
      },
      amazon: { categoria: "Casa", modelo: "dba", dbaZona: "sp", pesoKg: 0.5 },
      magalu: {
        tipoProduto: "leves",
        descontoFrete: "sem_desconto",
        pesoKg: 0.5,
        comprimento: 0,
        largura: 0,
        altura: 0,
        taxaFixa: 0,
        usarFrete: false,
      },
      tiktok: { freteGratis: false, incentivoComissao: false },
      shein: { pesoKg: 0.5, comprimento: 0, largura: 0, altura: 0 },
    };

    for (const key of PLATFORM_KEYS) {
      const entrada = {
        custoProduto: 30,
        impostoPercent: 0,
        marketingPercent: 0,
        ...extras[key],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preco = precoParaMargem(key, 15, entrada as any);
      expect(preco === null || Number.isFinite(preco), `${key}`).toBe(true);
      if (preco !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = calcular(key, { ...entrada, precoVenda: preco } as any);
        expect(r.margemPercent, `${key}`).toBeGreaterThanOrEqual(14.9);
      }
    }
  });
});
