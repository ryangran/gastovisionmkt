import type { BlocoLegal, DocumentoLegal, SecaoLegal } from "@/lib/legal/documentos";

/**
 * Renderiza um DocumentoLegal. Usado pelo modal de aceite e pelas páginas
 * públicas, para os dois nunca mostrarem textos diferentes.
 */

const Bloco = ({ bloco }: { bloco: BlocoLegal }) => {
  if (bloco.tipo === "destaque") {
    return (
      <p className="rounded-lg border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm font-medium text-foreground">
        {bloco.texto}
      </p>
    );
  }

  if (bloco.tipo === "lista") {
    return (
      <ul className="space-y-2 pl-1">
        {bloco.itens.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm leading-relaxed text-muted-foreground">{bloco.texto}</p>;
};

const Secao = ({ secao }: { secao: SecaoLegal }) => (
  <section className="space-y-3">
    <h3 className="font-display text-base font-semibold text-foreground">{secao.titulo}</h3>
    {secao.blocos.map((bloco, i) => (
      <Bloco key={i} bloco={bloco} />
    ))}
  </section>
);

interface ConteudoLegalProps {
  documento: DocumentoLegal;
  /** Vira o alvo da âncora do sumário do modal. */
  id?: string;
  /** No modal os documentos vêm em sequência e o cabeçalho precisa ser menor. */
  compacto?: boolean;
}

export const ConteudoLegal = ({ documento, id, compacto = false }: ConteudoLegalProps) => (
  <article id={id} className="space-y-6 scroll-mt-4">
    <header className="space-y-2 border-b border-border pb-4">
      <h2
        className={
          compacto
            ? "font-display text-lg font-bold text-foreground"
            : "font-display text-2xl font-bold text-foreground sm:text-3xl"
        }
      >
        {documento.titulo}
      </h2>
      <p className="text-xs text-muted-foreground">
        Versão {documento.versao} · Atualizado em {documento.atualizadoEm}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">{documento.resumo}</p>
    </header>

    <div className="space-y-6">
      {documento.secoes.map((secao) => (
        <Secao key={secao.titulo} secao={secao} />
      ))}
    </div>
  </article>
);
