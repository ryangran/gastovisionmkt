/** Número que recebe contato de venda e de mentoria, em formato internacional. */
export const WHATSAPP_DESTINO = "5511944804280";

export function linkWhatsApp(mensagem: string, destino = WHATSAPP_DESTINO): string {
  return `https://wa.me/${destino}?text=${encodeURIComponent(mensagem)}`;
}
