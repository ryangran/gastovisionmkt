/**
 * Traduz o erro do signup do Supabase para o que dá para mostrar na tela.
 *
 * A regra: erro de configuração ou de dado inválido pode e deve aparecer, ou
 * a pessoa fica travada sem saber o motivo. Só o caso "esse email já tem
 * conta" fica genérico, porque uma mensagem diferente ali transforma o
 * formulário num verificador de quais emails estão cadastrados.
 *
 * A ORDEM DAS CHECAGENS IMPORTA, e já custou caro uma vez. O Supabase devolve
 * 422 para várias coisas — senha fraca, email inválido, conta existente. A
 * versão anterior tratava todo 422 como conta existente ANTES de olhar o
 * código específico, então quem escolhia uma senha comum era informado de que
 * o problema era o email. O cliente tentava outro email, falhava de novo e
 * desistia.
 *
 * Agora o específico vem primeiro; o 422 sem código reconhecível é que cai no
 * genérico de existência, que continua sendo o padrão seguro.
 */

const GENERICA = "Não consegui criar a conta. Confira o email e tente de novo.";

/**
 * Mensagem para o caso de conta já existente.
 *
 * Continua sem confirmar que o email está cadastrado — diz "se você já tem",
 * não "você já tem" —, mas para de mandar a pessoa conferir um email que está
 * certo. Quem compra pela Cakto cai aqui sempre: o webhook cria a conta na
 * hora do pagamento, então a primeira coisa que ela tenta, criar conta, falha.
 */
const TALVEZ_EXISTENTE =
  "Não consegui criar a conta com esse email. Se você já tem conta aqui — inclusive se comprou um plano, porque a conta é criada junto — entre com 'Esqueci minha senha'.";

/**
 * O projeto tem a proteção contra senha vazada ligada, então não basta ter 6
 * caracteres: senha que já apareceu em vazamento é recusada por mais longa que
 * seja. Dizer só "tente uma mais longa" faz a pessoa aumentar uma senha comum
 * e apanhar de novo.
 */
const SENHA_FRACA =
  "Essa senha não foi aceita: precisa de pelo menos 6 caracteres e não pode ser uma senha comum, dessas que já apareceram em vazamentos. Misture letras, números e um símbolo.";

interface ErroSupabase {
  message?: string;
  code?: string;
  status?: number;
}

function normaliza(e: ErroSupabase) {
  return {
    m: (e.message ?? "").toLowerCase(),
    c: (e.code ?? "").toLowerCase(),
    s: e.status,
  };
}

function ehSenhaFraca(e: ErroSupabase): boolean {
  const { m, c } = normaliza(e);
  return (
    c === "weak_password" ||
    m.includes("weak password") ||
    m.includes("known to be weak") ||
    m.includes("password should be")
  );
}

/** Sinais explícitos de que o email já existe. */
function ehEmailExistente(e: ErroSupabase): boolean {
  const { m, c } = normaliza(e);
  return (
    c === "user_already_exists" ||
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("already exists")
  );
}

/**
 * Verdadeiro quando o erro sugere conta já existente, para a tela poder
 * oferecer o atalho da recuperação de senha em vez de só mostrar o texto.
 *
 * Inclui o 422 sem código reconhecível, que é o padrão seguro — mas só depois
 * de descartar senha fraca, que também usa 422.
 */
export function ehProvavelContaExistente(erro: unknown): boolean {
  const e = (erro ?? {}) as ErroSupabase;
  if (ehSenhaFraca(e)) return false;
  if (ehEmailExistente(e)) return true;
  return e.status === 422;
}

export function mensagemErroCadastro(erro: unknown): string {
  const e = (erro ?? {}) as ErroSupabase;
  const { m, c, s } = normaliza(e);

  // Específicos primeiro. Todos podem vir com 422.
  if (ehSenhaFraca(e)) return SENHA_FRACA;

  if (c === "email_address_invalid" || m.includes("invalid email") || m.includes("unable to validate email")) {
    return "Esse email não foi aceito. Confira se está escrito certo.";
  }
  if (c === "signup_disabled" || m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "O cadastro está desligado no servidor. Ligue 'Allow new users to sign up' nas configurações de autenticação do Supabase.";
  }
  if (c === "email_provider_disabled" || m.includes("email logins are disabled")) {
    return "O login por email está desligado no servidor. Ligue o provedor Email nas configurações de autenticação do Supabase.";
  }
  if (c.includes("rate_limit") || m.includes("rate limit") || s === 429) {
    return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
  }
  if (m.includes("error sending confirmation") || m.includes("smtp")) {
    return "A conta pode ter sido criada, mas o email de confirmação não saiu. Use 'Esqueci minha senha' para entrar.";
  }

  // Conta existente, e o 422 que sobrou sem código reconhecível.
  if (ehEmailExistente(e) || s === 422) return TALVEZ_EXISTENTE;

  return GENERICA;
}
