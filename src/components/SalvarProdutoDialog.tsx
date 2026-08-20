import { useState } from "react";
import { BookmarkPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSavedCalculations } from "@/hooks/useSavedCalculations";
import type { PricingResult } from "@/lib/pricing/types";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface SalvarProdutoDialogProps {
  /** Nome de exibição da plataforma, como já gravado no banco ("Mercado Livre"). */
  platform: string;
  /** Entradas exatas passadas à calculadora, guardadas para recálculo futuro. */
  inputs: Record<string, unknown>;
  resultado: PricingResult;
  nomeInicial: string;
  disabled?: boolean;
  /** Só o ícone, para caber numa linha de tabela. */
  compacto?: boolean;
}

export const SalvarProdutoDialog = ({
  platform,
  inputs,
  resultado,
  nomeInicial,
  disabled,
  compacto,
}: SalvarProdutoDialogProps) => {
  const { saveCalculation } = useSavedCalculations();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(nomeInicial);
  const [quantidade, setQuantidade] = useState("0");
  const [salvando, setSalvando] = useState(false);

  const qtd = Number.parseInt(quantidade, 10);
  const qtdValida = Number.isInteger(qtd) && qtd >= 0;
  const custoImobilizado = qtdValida ? qtd * resultado.custoProduto : 0;
  const lucroPotencial = qtdValida ? qtd * resultado.lucro : 0;

  const abrir = (estado: boolean) => {
    if (estado) {
      setNome(nomeInicial);
      setQuantidade("0");
    }
    setAberto(estado);
  };

  const salvar = async () => {
    setSalvando(true);
    const ok = await saveCalculation({
      platform,
      product_name: nome,
      sale_price: resultado.precoVenda,
      cost: resultado.custoProduto,
      profit_margin_percent: resultado.margemPercent,
      profit_margin_value: resultado.lucro,
      inputs,
      stock_quantity: qtdValida ? qtd : 0,
    });
    setSalvando(false);
    if (ok) setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={abrir}>
      <DialogTrigger asChild>
        {compacto ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
            disabled={disabled}
            aria-label={`Salvar este produto em ${platform}`}
            title={`Salvar em ${platform}`}
          >
            <BookmarkPlus className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" className="gap-2 shrink-0" disabled={disabled}>
            <BookmarkPlus className="w-4 h-4" />
            Salvar produto
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar produto</DialogTitle>
          <DialogDescription>
            O cálculo fica guardado com as entradas usadas, para poder ser refeito se a
            taxa da plataforma mudar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="salvar-nome">Nome do produto</Label>
            <Input
              id="salvar-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Fone Bluetooth TWS"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salvar-estoque">Quantidade em estoque</Label>
            <Input
              id="salvar-estoque"
              type="number"
              min={0}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
            {qtdValida && qtd > 0 ? (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(custoImobilizado)} imobilizados, com lucro potencial de{" "}
                <span className={lucroPotencial >= 0 ? "text-success" : "text-destructive"}>
                  {formatCurrency(lucroPotencial)}
                </span>
                .
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Deixe em zero se ainda não comprou o estoque.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plataforma</span>
              <span className="text-foreground font-medium">{platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço de venda</span>
              <span className="text-foreground font-mono">
                {formatCurrency(resultado.precoVenda)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lucro por unidade</span>
              <span
                className={`font-mono ${resultado.lucrativo ? "text-success" : "text-destructive"}`}
              >
                {formatCurrency(resultado.lucro)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margem</span>
              <span
                className={`font-mono ${resultado.lucrativo ? "text-success" : "text-destructive"}`}
              >
                {resultado.margemPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || !nome.trim() || !qtdValida}>
            {salvando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
