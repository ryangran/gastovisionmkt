import {
  FATURAMENTOS,
  OBJETIVOS,
  PLATAFORMAS,
  PRECIFICACAO,
  TEMPOS,
  URGENCIAS,
  WHATSAPP_DESTINO,
  rotuloDe,
  rotulosDe,
  type RespostasMentoria,
} from "./perguntas";

/** A dor vai inteira para o banco, mas cortada no link: URL muito longa é
 *  descartada por parte dos aplicativos de WhatsApp. */
const LIMITE_DOR_NA_MENSAGEM = 500;

export function soNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Máscara de celular brasileiro, tolerante a digitação parcial. */
export function formatarTelefone(valor: string): string {
  const d = soNumeros(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Aceita fixo com 10 dígitos e celular com 11. O DDD válido começa em 11. */
export function telefoneValido(valor: string): boolean {
  const d = soNumeros(valor);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

export function emailValido(valor: string): boolean {
  if (!valor.trim()) return true; // campo opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

function cortar(texto: string, limite: number): string {
  const t = texto.trim();
  return t.length <= limite ? t : `${t.slice(0, limite - 3).trimEnd()}...`;
}

/**
 * Texto que já chega preenchido na conversa. A ordem é a que serve para quem
 * vai atender: primeiro quem é e quanto fatura, depois o que dói.
 */
export function montarMensagem(r: RespostasMentoria): string {
  const linhas = [
    "Olá! Vim pelo formulário da Vetrex e quero agendar meu diagnóstico gratuito.",
    "",
    `Nome: ${r.nome.trim()}`,
    `Faturamento: ${rotuloDe(FATURAMENTOS, r.faturamento)}`,
    `Vendo há: ${rotuloDe(TEMPOS, r.tempo_vendendo)}`,
    `Plataformas: ${rotulosDe(PLATAFORMAS, r.plataformas).join(", ") || "nenhuma ainda"}`,
    `Precifico hoje: ${rotuloDe(PRECIFICACAO, r.precifica_hoje)}`,
  ];

  if (r.objetivos.length) {
    linhas.push(`Quero: ${rotulosDe(OBJETIVOS, r.objetivos).join(", ")}`);
  }

  linhas.push(`Prazo: ${rotuloDe(URGENCIAS, r.urgencia)}`, "", "Minha maior dificuldade hoje:", cortar(r.dor, LIMITE_DOR_NA_MENSAGEM));

  return linhas.join("\n");
}

export function linkWhatsApp(r: RespostasMentoria, destino = WHATSAPP_DESTINO): string {
  return `https://wa.me/${destino}?text=${encodeURIComponent(montarMensagem(r))}`;
}
