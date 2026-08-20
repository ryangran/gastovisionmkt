import { useState } from "react";
import { BookmarkCheck, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MarketplaceLogo } from "@/components/MarketplaceLogo";
import { useCarteira } from "@/hooks/useCarteira";
import { chaveDaPlataforma } from "@/lib/pricing/recalcular";
import type { ProdutoSalvo } from "@/lib/carteira";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface CargaProduto {
  nome: string;
  precoVenda: number;
  custo: number;
  /** Ids das embalagens que estavam marcadas quando o produto foi salvo. */
  custosExtrasIds: string[];
}

interface SeletorProdutoSalvoProps {
  nome: string;
  onNome: (nome: string) => void;
  /** Chamado ao escolher um produto já salvo. */
  onCarregar: (carga: CargaProduto) => void;
}

/**
 * Campo de nome do produto com atalho para os produtos já salvos: digitar cria
 * um produto novo, escolher da lista traz preço, custo e embalagem para
 * recalcular a mesma peça em outra plataforma.
 */
export const SeletorProdutoSalvo = ({
  nome,
  onNome,
  onCarregar,
}: SeletorProdutoSalvoProps) => {
  const { produtos, carregando } = useCarteira();
  const [aberto, setAberto] = useState(false);

  const escolher = (p: ProdutoSalvo) => {
    const inputs = (p.inputs ?? {}) as Record<string, unknown>;
    const ids = Array.isArray(inputs.custosExtrasIds)
      ? (inputs.custosExtrasIds as string[])
      : [];
    onCarregar({
      nome: p.product_name,
      precoVenda: p.sale_price,
      custo: p.cost,
      custosExtrasIds: ids,
    });
    setAberto(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Ex: Protetor de tomada"
        value={nome}
        onChange={(e) => onNome(e.target.value)}
        className="flex-1"
      />

      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="shrink-0 gap-2"
            disabled={carregando || produtos.length === 0}
            title={
              produtos.length === 0
                ? "Você ainda não salvou produtos"
                : "Usar um produto já salvo"
            }
          >
            <BookmarkCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Salvos</span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Command>
            <CommandInput placeholder="Buscar produto salvo..." />
            <CommandList>
              <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
              <CommandGroup>
                {produtos.map((p) => {
                  const chave = chaveDaPlataforma(p.platform);
                  return (
                    <CommandItem
                      key={p.id}
                      value={`${p.product_name} ${p.platform}`}
                      onSelect={() => escolher(p)}
                      className="gap-2"
                    >
                      {chave && (
                        <MarketplaceLogo platform={chave} className="h-3.5 w-auto max-w-10" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{p.product_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatCurrency(p.sale_price)} · custo {formatCurrency(p.cost)}
                        </span>
                      </span>
                      {nome === p.product_name && <Check className="h-4 w-4 text-primary" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
