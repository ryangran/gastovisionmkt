import { describe, expect, it } from "vitest";
import {
  ORDEM_PLANOS,
  PLANOS,
  RECURSOS_COMPARATIVO,
  RECURSOS_POR_PLANO,
  assinaturaPeloWhatsApp,
  linkAssinatura,
  menorPlanoCom,
  mensagemAssinatura,
  planoLibera,
  planoPorId,
  precoBR,
  type Plano,
  type Recurso,
} from "./planos";

/**
 * `toLocaleString` separa o R$ do número com espaço não-quebrável (U+00A0).
 * Normalizar aqui evita esse caractere invisível espalhado pelas asserções,
 * onde ninguém enxerga a diferença ao ler o teste.
 */
const semNbsp = (texto: string) => texto.replace(/\u00a0/g, " ");

describe("precoBR", () => {
  it("esconde os centavos quando são zero", () => {
    expect(semNbsp(precoBR(197))).toBe("R$ 197");
  });

  it("mostra os centavos quando existem", () => {
    expect(semNbsp(precoBR(29.9))).toBe("R$ 29,90");
    expect(semNbsp(precoBR(67.9))).toBe("R$ 67,90");
  });

  it("arredonda meio centavo em vez de truncar", () => {
    expect(semNbsp(precoBR(29.899))).toBe("R$ 29,90");
  });
});

describe("PLANOS", () => {
  it("tem os três planos, do mais barato para o mais completo", () => {
    expect(PLANOS.map((p) => p.id)).toEqual(["essencial", "plus", "deluxe"]);
  });

  it("mantém os preços combinados", () => {
    expect(planoPorId("essencial").preco).toBe(29.9);
    expect(planoPorId("plus").preco).toBe(67.9);
    expect(planoPorId("deluxe").preco).toBe(197);
  });

  it("sobe de preço junto com o nível, senão a tabela não faz sentido", () => {
    const precos = ORDEM_PLANOS.map((id) => planoPorId(id).preco);
    expect([...precos].sort((a, b) => a - b)).toEqual(precos);
  });

  it("destaca só um plano, senão nenhum se destaca", () => {
    expect(PLANOS.filter((p) => p.destaque)).toHaveLength(1);
  });

  it("o destaque é o Deluxe, e ele tem selo próprio", () => {
    // Decisão de negócio: o Deluxe é o que se quer vender. Um teste segura
    // isso, senão uma edição no arquivo de planos move o realce sem querer.
    expect(planoPorId("deluxe").destaque).toBe(true);
    expect(planoPorId("deluxe").selo).toBeTruthy();
    expect(planoPorId("plus").destaque).toBeFalsy();
    expect(planoPorId("essencial").destaque).toBeFalsy();
  });

  it("só o deluxe é pagamento único", () => {
    expect(planoPorId("deluxe").periodo).toBe("pagamento único");
    expect(planoPorId("essencial").periodo).toBe("por mês");
    expect(planoPorId("plus").periodo).toBe("por mês");
  });

  it("o deluxe anuncia a call, que é o bônus dele", () => {
    expect(planoPorId("deluxe").bonus).toMatch(/call/i);
    expect(planoPorId("essencial").bonus).toBeUndefined();
    expect(planoPorId("plus").bonus).toBeUndefined();
  });

  it("reclama de id que não existe em vez de devolver undefined", () => {
    expect(() => planoPorId("anual" as never)).toThrow(/desconhecido/);
  });
});

describe("matriz de acesso", () => {
  it("essencial libera só a calculadora e o perfil", () => {
    expect([...RECURSOS_POR_PLANO.essencial].sort()).toEqual(["calculadora", "perfil"]);
  });

  it("plus libera tudo menos fornecedores", () => {
    expect(planoLibera("plus", "fornecedores")).toBe(false);
    for (const r of RECURSOS_COMPARATIVO) {
      if (r !== "fornecedores") expect(planoLibera("plus", r)).toBe(true);
    }
  });

  it("deluxe libera tudo", () => {
    for (const r of RECURSOS_COMPARATIVO) {
      expect(planoLibera("deluxe", r)).toBe(true);
    }
  });

  it("cada plano contém tudo do anterior, senão subir de plano tiraria algo", () => {
    for (let i = 1; i < ORDEM_PLANOS.length; i += 1) {
      const anterior = RECURSOS_POR_PLANO[ORDEM_PLANOS[i - 1]];
      const atual = RECURSOS_POR_PLANO[ORDEM_PLANOS[i]];
      for (const r of anterior) expect(atual).toContain(r);
    }
  });

  it("sem plano não libera nada", () => {
    for (const r of RECURSOS_COMPARATIVO) {
      expect(planoLibera(null, r)).toBe(false);
    }
  });

  it("aponta o plano mais barato que resolve cada área", () => {
    expect(menorPlanoCom("calculadora")).toBe("essencial");
    expect(menorPlanoCom("comparador")).toBe("plus");
    expect(menorPlanoCom("fornecedores")).toBe("deluxe");
  });

  it("a tabela comparativa cobre todos os recursos que existem", () => {
    const naMatriz = new Set<Recurso>(RECURSOS_POR_PLANO.deluxe);
    expect([...RECURSOS_COMPARATIVO].sort()).toEqual([...naMatriz].sort());
  });
});

describe("checkout", () => {
  it("os três planos apontam para um checkout, não para o WhatsApp", () => {
    for (const p of PLANOS) {
      expect(assinaturaPeloWhatsApp(p)).toBe(false);
      expect(linkAssinatura(p)).toMatch(/^https:\/\/pay\.cakto\.com\.br\//);
    }
  });

  it("cada plano tem um link diferente", () => {
    // Colar o mesmo link em dois planos cobraria o preço errado sem nenhum
    // erro aparecer na tela.
    const urls = PLANOS.map((p) => p.checkoutUrl);
    expect(new Set(urls).size).toBe(PLANOS.length);
  });
});

describe("linkAssinatura", () => {
  /** Plano sem checkout, para exercitar o caminho de fallback. */
  const semCheckout: Plano = { ...planoPorId("plus"), checkoutUrl: undefined };

  it("cai no WhatsApp quando o plano não tem checkout", () => {
    expect(assinaturaPeloWhatsApp(semCheckout)).toBe(true);
    expect(linkAssinatura(semCheckout)).toMatch(/^https:\/\/wa\.me\/5511944804280\?text=/);
  });

  it("prefere o checkout quando existe", () => {
    const p: Plano = { ...semCheckout, checkoutUrl: "https://pay.exemplo.com/plus" };
    expect(assinaturaPeloWhatsApp(p)).toBe(false);
    expect(linkAssinatura(p)).toBe("https://pay.exemplo.com/plus");
  });

  it("escapa a mensagem, para acento e quebra de linha não corromperem a URL", () => {
    const link = linkAssinatura(semCheckout);
    expect(link).not.toContain(" ");
    expect(link).not.toContain("\n");
    expect(decodeURIComponent(link.split("?text=")[1])).toBe(mensagemAssinatura(semCheckout));
  });
});

describe("mensagemAssinatura", () => {
  it("diz qual plano e quanto custa, para não ter que perguntar", () => {
    const msg = semNbsp(mensagemAssinatura(planoPorId("plus")));
    expect(msg).toContain("Vetrex Plus");
    expect(msg).toContain("R$ 67,90");
    expect(msg).toContain("por mês");
  });
});
