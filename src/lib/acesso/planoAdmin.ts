import { ORDEM_PLANOS, planoPorId, type PlanoId } from "@/lib/acesso/planos";

/**
 * Leitura de assinatura no painel admin.
 *
 * O painel lê `plan_type` cru da tabela `purchases`, então precisa repetir a
 * tradução que `nivel_do_plan_type` faz no banco — sem ela, um assinante
 * antigo apareceria como "sem plano" para quem administra.
 *
 * Manter em módulo próprio, com teste, é o que garante que os dois lados não
 * se desencontrem em silêncio quando um plano novo aparecer.
 */

export interface AssinaturaBruta {
  plan_type: string | null;
  expires_at: string | null;
}

/** Espelha `nivel_do_plan_type` do banco. */
export function nivelDoPlanType(planType: string | null): PlanoId | null {
  switch ((planType ?? "").toLowerCase()) {
    case "deluxe":
    case "lifetime":
      return "deluxe";
    case "plus":
    case "monthly":
    case "daily":
      return "plus";
    case "essencial":
      return "essencial";
    default:
      return null;
  }
}

/** `plan_type` que não é mais oferecido, mas continua valendo para quem tem. */
export function ehLegado(planType: string | null): boolean {
  const v = (planType ?? "").toLowerCase();
  return v === "lifetime" || v === "monthly" || v === "daily";
}

/** Dias até expirar. Null quando não expira ou não há data. */
export function diasRestantes(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export type Situacao = "sem-plano" | "vitalicio" | "ativo" | "expirando" | "expirado";

/** Quantos dias antes de vencer a assinatura entra em "expirando". */
export const LIMIAR_EXPIRANDO = 7;

export function situacao(a: AssinaturaBruta): Situacao {
  const nivel = nivelDoPlanType(a.plan_type);
  if (!nivel) return "sem-plano";
  // Deluxe não tem validade. Tratar como ativo comum faria toda conta
  // vitalícia aparecer como expirada, já que expires_at é nulo nelas.
  if (nivel === "deluxe") return "vitalicio";

  const dias = diasRestantes(a.expires_at);
  if (dias === null) return "ativo";
  if (dias <= 0) return "expirado";
  if (dias <= LIMIAR_EXPIRANDO) return "expirando";
  return "ativo";
}

/** Assinatura que ainda dá acesso. Expirada não conta. */
export function estaAtiva(a: AssinaturaBruta): boolean {
  const s = situacao(a);
  return s === "vitalicio" || s === "ativo" || s === "expirando";
}

/**
 * Receita recorrente mensal das assinaturas vigentes.
 *
 * O Deluxe fica de fora de propósito: é pagamento único, e somá-lo ao MRR
 * inflaria um número que só faz sentido como recorrência.
 */
export function receitaRecorrente(assinaturas: AssinaturaBruta[]): number {
  let total = 0;
  for (const a of assinaturas) {
    if (!estaAtiva(a)) continue;
    const nivel = nivelDoPlanType(a.plan_type);
    if (!nivel || nivel === "deluxe") continue;
    total += planoPorId(nivel).preco;
  }
  return Math.round(total * 100) / 100;
}

/** Conta por nível, já na ordem dos planos, só de quem está vigente. */
export function distribuicao(assinaturas: AssinaturaBruta[]): Record<PlanoId, number> {
  const mapa = Object.fromEntries(ORDEM_PLANOS.map((p) => [p, 0])) as Record<PlanoId, number>;
  for (const a of assinaturas) {
    if (!estaAtiva(a)) continue;
    const nivel = nivelDoPlanType(a.plan_type);
    if (nivel) mapa[nivel] += 1;
  }
  return mapa;
}

/** Nome curto para caber em coluna de tabela. */
export function rotuloCurto(planType: string | null): string {
  const nivel = nivelDoPlanType(planType);
  if (!nivel) return "Sem plano";
  return planoPorId(nivel).nome.replace("Vetrex ", "");
}
