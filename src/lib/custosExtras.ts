/**
 * Convenção das chaves de sessão usadas pelo seletor de embalagens.
 *
 * Mora fora do componente porque quem carrega um produto salvo precisa marcar
 * as embalagens dele antes do seletor montar.
 */
export function chaveIdsCustosExtras(chave: string): string {
  return `${chave}_ids`;
}

/**
 * Marca estas embalagens no seletor da plataforma indicada. Escreve direto na
 * sessão porque o seletor lê a seleção só ao montar — quem chama deve remontá-lo
 * (trocando a prop `key`) para a mudança aparecer.
 */
export function aplicarCustosExtras(chave: string, ids: string[]): void {
  try {
    sessionStorage.setItem(chaveIdsCustosExtras(chave), JSON.stringify(ids));
  } catch (e) {
    console.error("Não foi possível aplicar as embalagens do produto:", e);
  }
}
