import { describe, it, expect } from "vitest";
import { impostoParaPreencher } from "./impostoPadrao";

const base = { regime: "nao_informado" as const, impostoPercent: 0 };

describe("impostoParaPreencher", () => {
  it("preenche o percentual salvo no perfil", () => {
    expect(impostoParaPreencher("", { ...base, impostoPercent: 7 })).toBe("7");
  });

  it("preenche mesmo sem regime escolhido, se há percentual salvo", () => {
    // Quem digitou 7% e deixou o regime como "Ainda não sei" também quer os 7%.
    expect(impostoParaPreencher("", { regime: "nao_informado", impostoPercent: 7 })).toBe("7");
  });

  it("usa ponto decimal: o campo da calculadora é input type=number", () => {
    // Com vírgula o navegador descarta o valor e o campo aparece vazio.
    expect(impostoParaPreencher("", { ...base, impostoPercent: 5.32 })).toBe("5.32");
  });

  it("o valor devolvido é aceito por um input numérico", () => {
    for (const p of [7, 5.32, 4, 0.5]) {
      const v = impostoParaPreencher("", { ...base, impostoPercent: p });
      expect(v).not.toBeNull();
      expect(Number.isNaN(Number(v)), String(p)).toBe(false);
    }
  });

  it("preenche zero no MEI, porque zero é resposta e não ausência", () => {
    expect(impostoParaPreencher("", { regime: "mei", impostoPercent: 0 })).toBe("0");
  });

  it("não preenche nada quando não há percentual nem regime que o justifique", () => {
    expect(impostoParaPreencher("", { regime: "nao_informado", impostoPercent: 0 })).toBeNull();
    expect(impostoParaPreencher("", { regime: "cpf", impostoPercent: 0 })).toBeNull();
  });

  it("nunca sobrescreve o que já está no campo", () => {
    expect(impostoParaPreencher("12", { ...base, impostoPercent: 7 })).toBeNull();
    expect(impostoParaPreencher("0", { ...base, impostoPercent: 7 })).toBeNull();
  });

  it("trata espaço em branco como campo vazio", () => {
    expect(impostoParaPreencher("   ", { ...base, impostoPercent: 7 })).toBe("7");
  });

  it("não preenche quando o perfil ainda não carregou", () => {
    expect(impostoParaPreencher("", null)).toBeNull();
  });

  it("ignora percentual inválido em vez de escrever NaN no campo", () => {
    expect(
      impostoParaPreencher("", { ...base, impostoPercent: Number.NaN }),
    ).toBeNull();
  });
});
