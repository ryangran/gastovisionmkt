/**
 * Telefone brasileiro: normalização, validação e link de WhatsApp.
 *
 * Fica num módulo só porque a mesma conta aparece no cadastro, no painel admin
 * e no catálogo de fornecedores. Três implementações da mesma regra divergem na
 * primeira correção, e o erro aqui manda a pessoa conversar com um estranho.
 */

/** Só os dígitos, sem máscara. */
export function apenasDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

/**
 * Verdadeiro para DDD + número com 10 ou 11 dígitos.
 *
 * Não aceita DDD abaixo de 11: não existe no plano de numeração brasileiro, e
 * é o erro típico de quem digita o número sem o zero ou perde um dígito.
 */
export function telefoneValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  // Celular tem 11 dígitos e começa com 9 depois do DDD.
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** Fixo é o de 10 dígitos começando de 2 a 5 — costuma não ter WhatsApp. */
export function pareceFixo(valor: string): boolean {
  const d = apenasDigitos(valor);
  return d.length === 10 && /^[2-5]/.test(d.slice(2));
}

/** Aplica a máscara conforme a pessoa digita, sem atrapalhar o apagar. */
export function formatarTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Link do WhatsApp. Null quando o número não é válido — botão desabilitado é
 * melhor que abrir conversa com quem não tem nada a ver.
 */
export function linkWhatsApp(valor: string, mensagem?: string): string | null {
  if (!telefoneValido(valor)) return null;
  const base = `https://wa.me/55${apenasDigitos(valor)}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
