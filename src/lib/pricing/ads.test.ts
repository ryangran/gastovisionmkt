import { describe, it, expect } from "vitest";
import {
  roasEquilibrio,
  acosEquilibrio,
  recomendarRoas,
  avaliarRoasAtual,
  margemDePrecoECusto,
} from "./ads";

describe("roasEquilibrio", () => {
  it("margem de 20% exige ROAS 5 para empatar", () => {
    // Cada real vendido deixa R$0,20; o anúncio se paga quando 1/5 da venda cobre o gasto.
    expect(roasEquilibrio(20)).toBeCloseTo(5, 2);
  });

  it("margem de 50% exige ROAS 2", () => {
    expect(roasEquilibrio(50)).toBeCloseTo(2, 2);
  });

  it("margem de 10% exige ROAS 10", () => {
    expect(roasEquilibrio(10)).toBeCloseTo(10, 2);
  });

  it("ACOS de equilíbrio é a própria margem", () => {
    expect(acosEquilibrio(20)).toBeCloseTo(20, 2);
    expect(acosEquilibrio(37.5)).toBeCloseTo(37.5, 2);
  });

  it("devolve null para margem zero ou negativa", () => {
    expect(roasEquilibrio(0)).toBeNull();
    expect(roasEquilibrio(-5)).toBeNull();
    expect(acosEquilibrio(0)).toBeNull();
  });
});

describe("recomendarRoas", () => {
  it("giro aceita ROAS mais perto do equilíbrio que rentabilidade", () => {
    const giro = recomendarRoas(20, "giro")!;
    const rent = recomendarRoas(20, "rentabilidade")!;
    expect(giro.roasAlvo).toBeLessThan(rent.roasAlvo);
    expect(giro.roasAlvo).toBeGreaterThan(giro.roasEquilibrio);
  });

  it("rentabilidade preserva metade da margem", () => {
    const r = recomendarRoas(20, "rentabilidade")!;
    // ROAS alvo 10 => ACOS 10% => sobra 10 dos 20 pontos de margem
    expect(r.roasAlvo).toBeCloseTo(10, 2);
    expect(r.acosAlvo).toBeCloseTo(10, 2);
    expect(r.margemResultante).toBeCloseTo(10, 2);
  });

  it("giro troca margem por volume, mas nunca entra no prejuízo", () => {
    const r = recomendarRoas(20, "giro")!;
    expect(r.margemResultante).toBeGreaterThan(0);
    expect(r.margemResultante).toBeLessThan(20);
  });

  it("explica o número em texto, sem deixar o usuário interpretar sozinho", () => {
    const r = recomendarRoas(20, "giro")!;
    expect(r.texto.length).toBeGreaterThan(40);
    expect(r.texto).toContain("5");
  });

  it("devolve null quando o produto já está no prejuízo", () => {
    expect(recomendarRoas(-3, "giro")).toBeNull();
    expect(recomendarRoas(0, "rentabilidade")).toBeNull();
  });
});

describe("avaliarRoasAtual", () => {
  it("aponta prejuízo quando o ROAS está abaixo do equilíbrio", () => {
    const a = avaliarRoasAtual(20, 4)!;
    expect(a.situacao).toBe("prejuizo");
    expect(a.margemResultante).toBeLessThan(0);
  });

  it("aponta empate no equilíbrio exato", () => {
    expect(avaliarRoasAtual(20, 5)!.situacao).toBe("empate");
  });

  it("aponta lucro acima do equilíbrio", () => {
    const a = avaliarRoasAtual(20, 8)!;
    expect(a.situacao).toBe("lucro");
    expect(a.margemResultante).toBeGreaterThan(0);
  });

  it("devolve null para entradas sem sentido", () => {
    expect(avaliarRoasAtual(20, 0)).toBeNull();
    expect(avaliarRoasAtual(-1, 5)).toBeNull();
  });
});

describe("margemDePrecoECusto", () => {
  it("tira a margem do preço e do custo", () => {
    // 34,43 vendendo, 15 de custo: sobram 19,43, que são 56,43% do preço.
    expect(margemDePrecoECusto(34.43, 15)).toBe(56.43);
    expect(margemDePrecoECusto(100, 60)).toBe(40);
  });

  it("desconta os outros custos por venda", () => {
    // Sem comissão, frete e imposto a margem sai otimista, e margem otimista
    // vira ROAS de equilíbrio baixo demais.
    expect(margemDePrecoECusto(34.43, 15, 8)).toBe(33.2);
    expect(margemDePrecoECusto(100, 40, 20)).toBe(40);
  });

  it("aceita custo zero, que é o caso de brinde e amostra", () => {
    expect(margemDePrecoECusto(50, 0)).toBe(100);
  });

  it("devolve margem negativa quando o custo passa do preço", () => {
    // Negativo é informação: quem cai aqui não deveria anunciar. Quem consome
    // trata margem <= 0 como sem ROAS possível.
    expect(margemDePrecoECusto(100, 130)).toBe(-30);
    expect(recomendarRoas(margemDePrecoECusto(100, 130) as number, "giro")).toBeNull();
  });

  it("devolve null para entradas sem sentido", () => {
    expect(margemDePrecoECusto(0, 10)).toBeNull();
    expect(margemDePrecoECusto(-5, 10)).toBeNull();
    expect(margemDePrecoECusto(100, -1)).toBeNull();
    expect(margemDePrecoECusto(Number.NaN, 10)).toBeNull();
  });

  it("ignora outros custos negativos em vez de somar lucro do nada", () => {
    expect(margemDePrecoECusto(100, 60, -20)).toBe(40);
  });

  it("fecha o ciclo com o ROAS de equilíbrio", () => {
    // 100 de preço e 80 de custo dão 20% de margem, que é ROAS 5.
    const margem = margemDePrecoECusto(100, 80) as number;
    expect(margem).toBe(20);
    expect(roasEquilibrio(margem)).toBe(5);
  });
});
