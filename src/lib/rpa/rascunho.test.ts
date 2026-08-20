import { describe, it, expect } from "vitest";
import { migrarRascunho } from "./rascunho";

describe("migrarRascunho", () => {
  it("aceita o formato atual", () => {
    expect(migrarRascunho({ razaoSocial: "ACME", cnpj: "1" })?.razaoSocial).toBe("ACME");
  });

  it("recupera o rascunho gravado no formato antigo, por slot", () => {
    expect(migrarRascunho({ "1": { razaoSocial: "ACME", cnpj: "1" } })?.razaoSocial).toBe("ACME");
  });

  it("devolve null para null, texto ou objeto irreconhecível", () => {
    expect(migrarRascunho(null)).toBeNull();
    expect(migrarRascunho("x")).toBeNull();
    expect(migrarRascunho({})).toBeNull();
  });

  it("não devolve o objeto por slot como se fosse a empresa", () => {
    // Era o bug: {"1": {...}} passava adiante sem razaoSocial e quebrava no trim.
    expect(migrarRascunho({ "1": { razaoSocial: "ACME" } })).not.toHaveProperty("1");
  });
});
