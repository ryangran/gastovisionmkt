import { describe, expect, it } from "vitest";
import { mensagemErroCadastro } from "./erroCadastro";

const GENERICA = "Não consegui criar a conta. Confira o email e tente de novo.";

describe("mensagemErroCadastro", () => {
  it("mantém genérica quando o email já tem conta, para não virar verificador de emails", () => {
    expect(mensagemErroCadastro({ code: "user_already_exists" })).toBe(GENERICA);
    expect(mensagemErroCadastro({ status: 422 })).toBe(GENERICA);
    expect(mensagemErroCadastro({ message: "User already registered" })).toBe(GENERICA);
  });

  it("não deixa outra regra vazar o email existente", () => {
    // Status 422 com texto de senha fraca continua genérico: a existência do
    // email pesa mais que a dica sobre a senha.
    expect(
      mensagemErroCadastro({ status: 422, message: "Password should be at least 6 characters" }),
    ).toBe(GENERICA);
  });

  it("diz quando o cadastro está desligado no servidor", () => {
    const msg = mensagemErroCadastro({ message: "Signups not allowed for this instance" });
    expect(msg).toContain("Allow new users to sign up");
  });

  it("reconhece o código de cadastro desligado", () => {
    expect(mensagemErroCadastro({ code: "signup_disabled" })).toContain("desligado");
  });

  it("diz quando o provedor de email está desligado", () => {
    expect(mensagemErroCadastro({ code: "email_provider_disabled" })).toContain("provedor Email");
  });

  it("explica senha fraca", () => {
    expect(mensagemErroCadastro({ code: "weak_password" })).toContain("fraca");
  });

  it("explica email inválido", () => {
    expect(mensagemErroCadastro({ code: "email_address_invalid" })).toContain("escrito certo");
  });

  it("explica excesso de tentativas", () => {
    expect(mensagemErroCadastro({ status: 429 })).toContain("Espere");
    expect(mensagemErroCadastro({ code: "over_email_send_rate_limit" })).toContain("Espere");
  });

  it("orienta quando o email de confirmação falha", () => {
    const msg = mensagemErroCadastro({ message: "Error sending confirmation email" });
    expect(msg).toContain("Esqueci minha senha");
  });

  it("cai na genérica no que não conhece", () => {
    expect(mensagemErroCadastro({ message: "boom" })).toBe(GENERICA);
    expect(mensagemErroCadastro(null)).toBe(GENERICA);
    expect(mensagemErroCadastro(undefined)).toBe(GENERICA);
  });
});
