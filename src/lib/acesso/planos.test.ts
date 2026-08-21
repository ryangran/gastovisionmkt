import { describe, expect, it } from "vitest";
import {
  PLANOS,
  assinaturaPeloWhatsApp,
  linkAssinatura,
  mensagemAssinatura,
  planoPorId,
  precoBR,
  type Plano,
} from "./planos";

describe("precoBR", () => {
  it("esconde os centavos quando são zero", () => {
    expect(precoBR(97)).toBe("R$ 97");
    expect(precoBR(197)).toBe("R$ 197");
  });

  it("mostra os centavos quando existem", () => {
    expect(precoBR(19.9)).toBe("R$ 19,90");
  });

  it("arredonda meio centavo em vez de truncar", () => {
    expect(precoBR(19.899)).toBe("R$ 19,90");
  });
});

describe("PLANOS", () => {
  it("tem exatamente o mensal e o vitalício", () => {
    expect(PLANOS.map((p) => p.id)).toEqual(["mensal", "vitalicio"]);
  });

  it("mantém os preços que estão na landing", () => {
    expect(planoPorId("mensal").preco).toBe(19.9);
    expect(planoPorId("vitalicio").preco).toBe(97);
    expect(planoPorId("vitalicio").precoDe).toBe(197);
  });

  it("destaca só um plano, senão nenhum se destaca", () => {
    expect(PLANOS.filter((p) => p.destaque)).toHaveLength(1);
  });

  it("o vitalício promete atualização de taxa, que é o argumento dele", () => {
    expect(planoPorId("vitalicio").itens.join(" ")).toContain("vitalícias");
  });

  it("reclama de id que não existe em vez de devolver undefined", () => {
    expect(() => planoPorId("anual" as never)).toThrow(/desconhecido/);
  });
});

describe("linkAssinatura", () => {
  it("cai no WhatsApp enquanto não houver checkout", () => {
    const p = planoPorId("vitalicio");
    expect(assinaturaPeloWhatsApp(p)).toBe(true);
    expect(linkAssinatura(p)).toMatch(/^https:\/\/wa\.me\/5511944804280\?text=/);
  });

  it("usa o checkout assim que a URL for preenchida", () => {
    const p: Plano = { ...planoPorId("mensal"), checkoutUrl: "https://pay.exemplo.com/mensal" };
    expect(assinaturaPeloWhatsApp(p)).toBe(false);
    expect(linkAssinatura(p)).toBe("https://pay.exemplo.com/mensal");
  });

  it("escapa a mensagem, para acento e quebra de linha não corromperem a URL", () => {
    const p = planoPorId("mensal");
    const link = linkAssinatura(p);
    expect(link).not.toContain(" ");
    expect(link).not.toContain("\n");
    expect(decodeURIComponent(link.split("?text=")[1])).toBe(mensagemAssinatura(p));
  });
});

describe("mensagemAssinatura", () => {
  it("diz qual plano e quanto custa, para não ter que perguntar", () => {
    const msg = mensagemAssinatura(planoPorId("mensal"));
    expect(msg).toContain("Mensal");
    expect(msg).toContain("R$ 19,90");
    expect(msg).toContain("por mês");
  });
});
