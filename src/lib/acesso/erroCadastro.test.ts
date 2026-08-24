import { describe, expect, it } from "vitest";
import { ehProvavelContaExistente, mensagemErroCadastro } from "./erroCadastro";

const GENERICA = "Não consegui criar a conta. Confira o email e tente de novo.";

/** Sinais que o Supabase manda quando o email já tem conta. */
const SINAIS_EXISTENTE = [
  { code: "user_already_exists" },
  { status: 422 },
  { message: "User already registered" },
  // Caso real, capturado do servidor:
  { status: 422, code: "user_already_exists", message: "User already registered" },
];

/**
 * Respostas reais do servidor para senha fraca, capturadas em teste. O projeto
 * tem a proteção contra senha vazada ligada, então senha comum é recusada por
 * mais longa que seja.
 */
const SINAIS_SENHA_FRACA = [
  {
    status: 422,
    code: "weak_password",
    message: "Password is known to be weak and easy to guess, please choose a different one.",
  },
  {
    status: 422,
    code: "weak_password",
    message: "Password should be at least 6 characters. Password is known to be weak and easy to guess.",
  },
];

describe("mensagemErroCadastro", () => {
  it("diz que o problema é a senha quando o servidor recusa a senha", () => {
    // Era o bug que travou um cliente: 422 de senha fraca caía na regra de
    // email existente, e a tela mandava a pessoa conferir um email que estava
    // certo. Senha longa e comum é recusada igual, então a mensagem não pode
    // falar só de tamanho.
    for (const sinal of SINAIS_SENHA_FRACA) {
      const msg = mensagemErroCadastro(sinal);
      expect(msg).toMatch(/senha/i);
      expect(msg).toMatch(/comum|vazamento/i);
      expect(msg).not.toContain("email");
      expect(ehProvavelContaExistente(sinal)).toBe(false);
    }
  });

  it("senha fraca vence a regra de 422, que é mais genérica", () => {
    expect(mensagemErroCadastro({ status: 422, code: "weak_password" })).not.toBe(
      mensagemErroCadastro({ code: "user_already_exists" }),
    );
  });

  it("responde igual para todo sinal de conta existente, para não virar verificador de emails", () => {
    // O texto pode mudar; o que não pode é variar entre os sinais, senão dá
    // para descobrir quais emails têm conta comparando as respostas.
    const respostas = new Set(SINAIS_EXISTENTE.map(mensagemErroCadastro));
    expect(respostas.size).toBe(1);
  });

  it("não afirma que o email já está cadastrado", () => {
    // Aponta o caminho sem confirmar a existência: "se você já tem conta".
    const msg = mensagemErroCadastro({ code: "user_already_exists" });
    expect(msg).toContain("Se você já tem conta");
    expect(msg).toContain("Esqueci minha senha");
    expect(msg).not.toMatch(/esse email (já|ja) (está|esta|tem)/i);
  });

  it("422 sem código reconhecível continua caindo no genérico de existência", () => {
    // Padrão seguro: sem saber o motivo, não se revela se o email existe.
    expect(mensagemErroCadastro({ status: 422 })).toBe(
      mensagemErroCadastro({ code: "user_already_exists" }),
    );
    expect(ehProvavelContaExistente({ status: 422 })).toBe(true);
  });

  it("a mensagem de conta existente é diferente da genérica de erro desconhecido", () => {
    // Era o bug: erro desconhecido e conta existente diziam a mesma coisa,
    // "confira o email", e mandavam quem já tinha conta tentar outro email.
    expect(mensagemErroCadastro({ code: "user_already_exists" })).not.toBe(GENERICA);
    expect(mensagemErroCadastro({ message: "boom" })).toBe(GENERICA);
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

  it("explica que o problema é a senha", () => {
    // Não prende a palavra 'fraca': o texto precisa poder mudar sem quebrar,
    // desde que continue apontando a senha como causa.
    const msg = mensagemErroCadastro({ code: "weak_password" });
    expect(msg).toMatch(/senha/i);
    expect(msg).toMatch(/6 caracteres/);
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

  it("sinaliza conta existente para a tela poder oferecer a recuperação", () => {
    for (const sinal of SINAIS_EXISTENTE) {
      expect(ehProvavelContaExistente(sinal)).toBe(true);
    }
    expect(ehProvavelContaExistente({ message: "boom" })).toBe(false);
    expect(ehProvavelContaExistente(null)).toBe(false);
  });

  it("cai na genérica no que não conhece", () => {
    expect(mensagemErroCadastro({ message: "boom" })).toBe(GENERICA);
    expect(mensagemErroCadastro(null)).toBe(GENERICA);
    expect(mensagemErroCadastro(undefined)).toBe(GENERICA);
  });
});
