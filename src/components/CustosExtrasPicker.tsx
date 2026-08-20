import { useEffect, useState } from "react";
import { Package2, Plus, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useCustosExtras } from "@/hooks/useCustosExtras";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseNum(val: string): number {
  return parseFloat(val.replace(",", ".")) || 0;
}

interface CustosExtrasPickerProps {
  /** Prefixo das chaves de sessão, para cada calculadora lembrar a própria escolha. */
  chave: string;
  /** Recebe o total selecionado, já somado com o valor avulso. */
  onChange: (total: number) => void;
}

export const CustosExtrasPicker = ({ chave, onChange }: CustosExtrasPickerProps) => {
  const { custos, carregando, criar, remover } = useCustosExtras();
  const [marcados, setMarcados] = usePersistedState<string[]>(`${chave}_ids`, []);
  const [avulso, setAvulso] = usePersistedState(`${chave}_avulso`, "");
  const [aberto, setAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const selecionados = custos.filter((c) => marcados.includes(c.id));
  const total = selecionados.reduce((s, c) => s + c.valor, 0) + parseNum(avulso);

  // Avisa o pai sempre que o total muda, inclusive quando a lista termina de
  // carregar e os itens marcados passam a ter valor.
  useEffect(() => {
    onChange(total);
  }, [total, onChange]);

  const alternar = (id: string, marcado: boolean) => {
    setMarcados((prev) => (marcado ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const adicionar = async () => {
    setSalvando(true);
    const ok = await criar(novoNome, parseNum(novoValor));
    setSalvando(false);
    if (ok) {
      setNovoNome("");
      setNovoValor("");
    }
  };

  const apagar = async (id: string) => {
    await remover(id);
    setMarcados((prev) => prev.filter((x) => x !== id));
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Package2 className="h-4 w-4 text-primary" />
          Embalagem e etiqueta
        </Label>
        <span className="font-mono text-sm tabular-nums text-foreground">
          {formatCurrency(total)}
        </span>
      </div>

      {custos.length > 0 && (
        <ul className="mb-3 space-y-2">
          {custos.map((c) => (
            <li key={c.id} className="flex items-center gap-2.5">
              <Checkbox
                id={`${chave}-${c.id}`}
                checked={marcados.includes(c.id)}
                onCheckedChange={(v) => alternar(c.id, v === true)}
              />
              <Label
                htmlFor={`${chave}-${c.id}`}
                className="flex flex-1 cursor-pointer items-center justify-between gap-2 font-normal"
              >
                <span className="truncate text-sm text-foreground">{c.nome}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {formatCurrency(c.valor)}
                </span>
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => apagar(c.id)}
                aria-label={`Remover ${c.nome}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!carregando && custos.length === 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          Salve suas caixas e etiquetas aqui para reaproveitar em qualquer produto.
        </p>
      )}

      <Collapsible open={aberto} onOpenChange={setAberto}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Cadastrar embalagem
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`${chave}-nome`} className="text-xs">Nome</Label>
              <Input
                id={`${chave}-nome`}
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Caixa 20x15x10"
                className="h-9"
              />
            </div>
            <div className="w-24 space-y-1.5">
              <Label htmlFor={`${chave}-valor`} className="text-xs">Valor (R$)</Label>
              <Input
                id={`${chave}-valor`}
                inputMode="decimal"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                placeholder="0,00"
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              className="h-9"
              onClick={adicionar}
              disabled={salvando || !novoNome.trim()}
            >
              Salvar
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`${chave}-avulso`} className="text-xs">
          Outro custo, só para este produto (R$)
        </Label>
        <Input
          id={`${chave}-avulso`}
          inputMode="decimal"
          value={avulso}
          onChange={(e) => setAvulso(e.target.value)}
          placeholder="0,00"
          className="h-9"
        />
      </div>
    </div>
  );
};
