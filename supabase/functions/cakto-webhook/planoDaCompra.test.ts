import { describe, expect, it } from "vitest";
import { CHECKOUTS, planoDaCompra, validadeEmIso } from "./planoDaCompra";

/** Payload no formato que a Cakto manda, com só o que a função lê. */
const payload = (extra: Record<string, unknown>) => extra;

describe("planoDaCompra pelo link do checkout", () => {
  it("cada link em uso cai no plano certo", () => {
    expect(planoDaCompra(payload({ checkoutUrl: "https://pay.cakto.com.br/vgi2b7q" }))).toEqual({
      plano: "essencial",
      origem: "checkout",
    });
    expect(planoDaCompra(payload({ checkoutUrl: "https://pay.cakto.com.br/39x7i89" }))).toEqual({
      plano: "plus",
      origem: "checkout",
    });
    expect(
      planoDaCompra(payload({ checkoutUrl: "https://pay.cakto.com.br/6m7kaiz_785267" })),
    ).toEqual({ plano: "deluxe", origem: "checkout" });
  });

  it("os links antigos continuam valendo como Plus", () => {
    // Quem comprou antes dos três planos tinha acesso total. Rebaixar para
    // Essencial tiraria o que a pessoa já usava.
    for (const id of ["n9b89by", "32i2hyh"]) {
      expect(planoDaCompra(payload({ checkoutUrl: `https://pay.cakto.com.br/${id}` })).plano).toBe(
        "plus",
      );
    }
  });

  it("reconhece o identificador também no id da oferta", () => {
    expect(planoDaCompra(payload({ offer: { id: "39x7i89" } })).plano).toBe("plus");
  });

  it("nenhum identificador é prefixo de outro, senão o primeiro venceria sempre", () => {
    const ids = Object.keys(CHECKOUTS);
    for (const a of ids) {
      for (const b of ids) {
        if (a !== b) expect(b.includes(a)).toBe(false);
      }
    }
  });
});

describe("planoDaCompra pelo nome da oferta", () => {
  it("usa o nome quando o link não é reconhecido", () => {
    expect(planoDaCompra(payload({ offer: { name: "Vetrex Deluxe" } }))).toEqual({
      plano: "deluxe",
      origem: "nome",
    });
    expect(planoDaCompra(payload({ offer: { name: "Vetrex Plus mensal" } })).plano).toBe("plus");
    expect(planoDaCompra(payload({ offer: { name: "Plano Essencial" } })).plano).toBe("essencial");
  });

  it("entende a nomenclatura antiga de vitalício", () => {
    expect(planoDaCompra(payload({ offer: { name: "Vetrex Vitalício" } })).plano).toBe("deluxe");
    expect(planoDaCompra(payload({ offer: { name: "Lifetime access" } })).plano).toBe("deluxe");
  });
});

describe("planoDaCompra pelo valor", () => {
  it("reconhece os três preços quando não há link nem nome", () => {
    expect(planoDaCompra(payload({ amount: 29.9 }))).toEqual({
      plano: "essencial",
      origem: "valor",
    });
    expect(planoDaCompra(payload({ amount: 67.9 })).plano).toBe("plus");
    expect(planoDaCompra(payload({ amount: 197 })).plano).toBe("deluxe");
  });

  it("aceita o valor como texto, que é como alguns gateways mandam", () => {
    expect(planoDaCompra(payload({ amount: "197.00" })).plano).toBe("deluxe");
  });

  it("ignora valor que não bate com plano nenhum", () => {
    expect(planoDaCompra(payload({ amount: 500 })).origem).toBe("padrao");
  });
});

describe("planoDaCompra sem sinal nenhum", () => {
  it("cai no mais barato, não no mais caro", () => {
    // Liberar demais é silencioso e permanente. Liberar de menos vira
    // mensagem no suporte e é corrigido pelo painel.
    expect(planoDaCompra(payload({}))).toEqual({ plano: "essencial", origem: "padrao" });
  });

  it("não quebra com payload malformado", () => {
    expect(planoDaCompra(payload({ offer: null }))).toEqual({
      plano: "essencial",
      origem: "padrao",
    });
    expect(planoDaCompra(payload({ checkoutUrl: 42, offer: { name: 7 } })).plano).toBe("essencial");
  });
});

describe("validadeEmIso", () => {
  const agora = Date.UTC(2026, 7, 24, 12, 0, 0);

  it("deluxe não expira", () => {
    expect(validadeEmIso("deluxe", agora)).toBeNull();
  });

  it("os mensais valem 30 dias", () => {
    for (const plano of ["essencial", "plus"] as const) {
      const iso = validadeEmIso(plano, agora);
      expect(iso).not.toBeNull();
      const dias = (new Date(iso as string).getTime() - agora) / (24 * 60 * 60 * 1000);
      expect(dias).toBe(30);
    }
  });
});
