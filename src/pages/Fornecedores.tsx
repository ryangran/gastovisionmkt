import { useMemo, useState } from "react";
import { MapPin, MessageCircle, Phone, Search, Store, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_FORNECEDOR,
  FORNECEDORES_GERAIS,
  linkWhatsApp,
  pareceFixo,
  type CategoriaFornecedor,
  type Fornecedor,
} from "@/lib/fornecedores/dados";
import { FORNECEDORES_MODA } from "@/lib/fornecedores/moda";

type Segmento = "geral" | "moda";

const SEGMENTOS: { id: Segmento; label: string; lista: Fornecedor[] }[] = [
  { id: "geral", label: "Gerais", lista: FORNECEDORES_GERAIS },
  { id: "moda", label: "Moda", lista: FORNECEDORES_MODA },
];

/** Tira acento para a busca casar "eletronico" com "Eletrônicos". */
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/** O segundo campo da lista original mistura endereço e telefone. */
const ehTelefone = (contato: string) => /\(\d{2}\)|^\d{4}\s|^0800/.test(contato);

const CartaoFornecedor = ({ fornecedor }: { fornecedor: Fornecedor }) => {
  const wpp = linkWhatsApp(fornecedor.telefone);
  const fixo = pareceFixo(fornecedor.telefone);

  return (
    <Card className="flex flex-col border-border bg-card/60 transition-colors hover:border-primary/40">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold leading-tight text-foreground">
            {fornecedor.nome}
          </h3>
          <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
            {fornecedor.codigo}
          </Badge>
        </div>

        {fornecedor.categoria ? (
          <Badge variant="secondary" className="w-fit text-xs font-normal">
            {fornecedor.categoria}
          </Badge>
        ) : null}

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {fornecedor.telefone ? (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
              {fornecedor.telefone}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-xs italic">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              Telefone ilegível na lista de origem
            </p>
          )}

          {fornecedor.contato ? (
            <p className="flex items-start gap-2">
              {ehTelefone(fornecedor.contato) ? (
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              {fornecedor.contato}
            </p>
          ) : null}
        </div>

        {fornecedor.especialidades ? (
          <div className="mt-auto border-t border-border pt-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Especialidades
            </p>
            <p className="mt-1 text-sm text-foreground">{fornecedor.especialidades}</p>
          </div>
        ) : (
          <div className="mt-auto" />
        )}

        {wpp ? (
          <Button asChild className="w-full gap-2 bg-[#25D366] text-white hover:bg-[#1faa52]">
            <a href={wpp} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        ) : (
          <Button disabled className="w-full gap-2">
            <MessageCircle className="h-4 w-4" />
            Sem número válido
          </Button>
        )}

        {wpp && fixo ? (
          <p className="text-center text-[11px] text-muted-foreground">
            Número fixo — pode não ter WhatsApp
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Fornecedores = () => {
  const [segmento, setSegmento] = useState<Segmento>("geral");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<CategoriaFornecedor | null>(null);

  const lista = segmento === "moda" ? FORNECEDORES_MODA : FORNECEDORES_GERAIS;

  // Só as categorias que têm alguém, e já com a contagem do filtro.
  const contagem = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const f of lista) {
      if (f.categoria) mapa.set(f.categoria, (mapa.get(f.categoria) ?? 0) + 1);
    }
    return mapa;
  }, [lista]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return lista.filter((f) => {
      if (categoria && f.categoria !== categoria) return false;
      if (!termo) return true;
      const campos = `${f.nome} ${f.especialidades} ${f.categoria ?? ""} ${f.contato} ${f.codigo}`;
      return normalizar(campos).includes(termo);
    });
  }, [busca, categoria, lista]);

  // Trocar de segmento tem que limpar a categoria: as de gerais não existem em moda.
  const trocarSegmento = (novo: Segmento) => {
    setSegmento(novo);
    setCategoria(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">Fornecedores</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {segmento === "moda"
            ? `${FORNECEDORES_MODA.length} fornecedores de moda no Brás.`
            : `${FORNECEDORES_GERAIS.length} fornecedores em ${contagem.size} categorias.`}{" "}
          O botão abre a conversa direto no WhatsApp.
        </p>
      </header>

      {/* Segmento: as duas listas vêm de origens diferentes e não se misturam */}
      <div className="mb-4 inline-flex rounded-lg border border-border p-1">
        {SEGMENTOS.map((seg) => (
          <button
            key={seg.id}
            type="button"
            onClick={() => trocarSegmento(seg.id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              segmento === seg.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {seg.label} ({seg.lista.length})
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, especialidade ou código"
          className="pl-9 pr-9"
        />
        {busca ? (
          <button
            type="button"
            onClick={() => setBusca("")}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Filtro por categoria. A lista de moda não tem categoria na origem. */}
      <div className={cn("mb-6 flex-wrap gap-2", segmento === "geral" ? "flex" : "hidden")}>
        <button
          type="button"
          onClick={() => setCategoria(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            categoria === null
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          Todas ({lista.length})
        </button>

        {CATEGORIAS_FORNECEDOR.map((cat) => {
          const total = contagem.get(cat) ?? 0;
          if (total === 0) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoria(cat)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                categoria === cat
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {cat} ({total})
            </button>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum fornecedor encontrado com esses filtros.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {filtrados.length} {filtrados.length === 1 ? "resultado" : "resultados"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((f) => (
              <CartaoFornecedor key={`${f.codigo}-${f.nome}`} fornecedor={f} />
            ))}
          </div>
        </>
      )}

      <p className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        A Vetrex não verifica, não intermedia e não se responsabiliza pelas negociações feitas com
        os fornecedores desta lista. Confira os dados antes de fechar qualquer compra.
      </p>
    </div>
  );
};

export default Fornecedores;
