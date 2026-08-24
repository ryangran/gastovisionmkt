import { describe, expect, it } from "vitest";
import {
  diasRestantes,
  distribuicao,
  ehLegado,
  estaAtiva,
  nivelDoPlanType,
  receitaRecorrente,
  rotuloCurto,
  situacao,
} from "./planoAdmin";

/** Data relativa a hoje, para os testes não vencerem com o tempo. */
const emDias = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

describe("nivelDoPlanType", () => {
  it("traduz os planos atuais", () => {
    expect(nivelDoPlanType("essencial")).toBe("essencial");
    expect(nivelDoPlanType("plus")).toBe("plus");
    expect(nivelDoPlanType("deluxe")).toBe("deluxe");
  });

  it("traduz os legados sem rebaixar ninguém", () => {
    expect(nivelDoPlanType("lifetime")).toBe("deluxe");
    expect(nivelDoPlanType("monthly")).toBe("plus");
    expect(nivelDoPlanType("daily")).toBe("plus");
  });

  it("não se importa com caixa, que varia entre gateway e painel", () => {
    expect(nivelDoPlanType("DELUXE")).toBe("deluxe");
    expect(nivelDoPlanType("Monthly")).toBe("plus");
  });

  it("devolve null para o que não conhece", () => {
    expect(nivelDoPlanType(null)).toBeNull();
    expect(nivelDoPlanType("")).toBeNull();
    expect(nivelDoPlanType("anual")).toBeNull();
  });
});

describe("ehLegado", () => {
  it("marca só os plan_type que saíram de circulação", () => {
    expect(ehLegado("lifetime")).toBe(true);
    expect(ehLegado("monthly")).toBe(true);
    expect(ehLegado("daily")).toBe(true);
    expect(ehLegado("deluxe")).toBe(false);
    expect(ehLegado(null)).toBe(false);
  });
});

describe("situacao", () => {
  it("deluxe é vitalício, mesmo sem data de expiração", () => {
    // Sem este caso, toda conta vitalícia apareceria como expirada, porque
    // expires_at é nulo nelas.
    expect(situacao({ plan_type: "deluxe", expires_at: null })).toBe("vitalicio");
    expect(situacao({ plan_type: "lifetime", expires_at: null })).toBe("vitalicio");
  });

  it("separa ativo, expirando e expirado", () => {
    expect(situacao({ plan_type: "plus", expires_at: emDias(30) })).toBe("ativo");
    expect(situacao({ plan_type: "plus", expires_at: emDias(3) })).toBe("expirando");
    expect(situacao({ plan_type: "plus", expires_at: emDias(-1) })).toBe("expirado");
  });

  it("sem plan_type reconhecido é sem plano", () => {
    expect(situacao({ plan_type: null, expires_at: null })).toBe("sem-plano");
    expect(situacao({ plan_type: "anual", expires_at: emDias(30) })).toBe("sem-plano");
  });
});

describe("estaAtiva", () => {
  it("expirado e sem plano não dão acesso", () => {
    expect(estaAtiva({ plan_type: "plus", expires_at: emDias(-1) })).toBe(false);
    expect(estaAtiva({ plan_type: null, expires_at: null })).toBe(false);
  });

  it("expirando ainda dá acesso, que é o ponto de avisar antes", () => {
    expect(estaAtiva({ plan_type: "plus", expires_at: emDias(2) })).toBe(true);
  });
});

describe("receitaRecorrente", () => {
  it("soma só os mensais vigentes", () => {
    const r = receitaRecorrente([
      { plan_type: "essencial", expires_at: emDias(20) },
      { plan_type: "plus", expires_at: emDias(20) },
    ]);
    expect(r).toBe(97.8);
  });

  it("ignora o deluxe, que é pagamento único", () => {
    // Somar vitalício ao MRR inflaria um número que só faz sentido como
    // recorrência.
    expect(receitaRecorrente([{ plan_type: "deluxe", expires_at: null }])).toBe(0);
  });

  it("ignora assinatura expirada", () => {
    expect(receitaRecorrente([{ plan_type: "plus", expires_at: emDias(-5) }])).toBe(0);
  });

  it("conta o legado monthly como plus, que é o acesso que ele dá", () => {
    expect(receitaRecorrente([{ plan_type: "monthly", expires_at: emDias(10) }])).toBe(67.9);
  });
});

describe("distribuicao", () => {
  it("conta por nível, só quem está vigente", () => {
    expect(
      distribuicao([
        { plan_type: "essencial", expires_at: emDias(10) },
        { plan_type: "plus", expires_at: emDias(10) },
        { plan_type: "monthly", expires_at: emDias(10) },
        { plan_type: "deluxe", expires_at: null },
        { plan_type: "plus", expires_at: emDias(-1) },
        { plan_type: null, expires_at: null },
      ]),
    ).toEqual({ essencial: 1, plus: 2, deluxe: 1 });
  });

  it("devolve todos os níveis zerados quando não há ninguém", () => {
    expect(distribuicao([])).toEqual({ essencial: 0, plus: 0, deluxe: 0 });
  });
});

describe("diasRestantes", () => {
  it("devolve null quando não há data", () => {
    expect(diasRestantes(null)).toBeNull();
  });

  it("arredonda para cima, para o último dia ainda contar como 1", () => {
    expect(diasRestantes(emDias(0.2))).toBe(1);
  });
});

describe("rotuloCurto", () => {
  it("tira o prefixo da marca, que se repete em toda linha", () => {
    expect(rotuloCurto("plus")).toBe("Plus");
    expect(rotuloCurto("lifetime")).toBe("Deluxe");
    expect(rotuloCurto(null)).toBe("Sem plano");
  });
});
