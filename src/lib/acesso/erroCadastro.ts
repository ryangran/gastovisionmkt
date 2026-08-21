/**
 * Traduz o erro do signup do Supabase para o que dá para mostrar na tela.
 *
 * A regra: erro de configuração ou de dado inválido pode e deve aparecer, ou
 * a pessoa fica travada sem saber o motivo. Só o caso "esse email já tem
 * conta" continua genérico, porque uma mensagem diferente ali transforma o
 * formulário num verificador de quais emails estão cadastrados.
 */

const GENERICA = "Não consegui criar a conta. Confira o email e tente de novo.";

interface ErroSupabase {
  message?: string;
  code?: string;
  status?: number;
}

/** Sinais de que o email já existe. Estes ficam sempre na mensagem genérica. */
function ehEmailExistente(e: ErroSupabase): boolean {
  const m = (e.message ?? "").toLowerCase();
  return (
    e.code === "user_already_exists" ||
    e.status === 422 ||
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("already exists")
  );
}

export function mensagemErroCadastro(erro: unknown): string {
  const e = (erro ?? {}) as ErroSupabase;
  if (ehEmailExistente(e)) return GENERICA;

  const m = (e.message ?? "").toLowerCase();
  const c = e.code ?? "";

  if (c === "signup_disabled" || m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "O cadastro está desligado no servidor. Ligue 'Allow new users to sign up' nas configurações de autenticação do Supabase.";
  }
  if (c === "email_provider_disabled" || m.includes("email logins are disabled")) {
    return "O login por email está desligado no servidor. Ligue o provedor Email nas configurações de autenticação do Supabase.";
  }
  if (c === "weak_password" || m.includes("password should be") || m.includes("weak password")) {
    return "Essa senha é fraca demais para o servidor. Tente uma mais longa, misturando letras e números.";
  }
  if (c === "email_address_invalid" || m.includes("invalid email") || m.includes("unable to validate email")) {
    return "Esse email não foi aceito. Confira se está escrito certo.";
  }
  if (c.includes("rate_limit") || m.includes("rate limit") || e.status === 429) {
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  }
  if (m.includes("error sending confirmation") || m.includes("smtp")) {
    return "A conta pode ter sido criada, mas o email de confirmação não saiu. Use 'Esqueci minha senha' para entrar.";
  }

  return GENERICA;
}
