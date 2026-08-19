import { useState } from "react";
import { Target } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { precoParaMargem } from "@/lib/pricing/reverse";
import type { PlatformInputMap } from "@/lib/pricing";
import type { PlatformKey } from "@/lib/pricing/types";

const MARGEM_MAXIMA = 50;

interface MargemSliderProps<K extends PlatformKey> {
  platform: K;
  /** As mesmas entradas passadas à calculadora; o preço é ignorado. */
  inputs: PlatformInputMap[K];
  /** Recebe o preço encontrado, já arredondado ao centavo. */
  onPreco: (preco: number) => void;
}

export function MargemSlider<K extends PlatformKey>({
  platform,
  inputs,
  onPreco,
}: MargemSliderProps<K>) {
  const [alvo, setAlvo] = useState(0);
  const [inalcancavel, setInalcancavel] = useState(false);

  const custo = Number((inputs as { custoProduto?: number }).custoProduto) || 0;
  const desabilitado = custo <= 0;

  const aplicar = (valores: number[]) => {
    const novoAlvo = valores[0];
    setAlvo(novoAlvo);

    if (novoAlvo <= 0) {
      setInalcancavel(false);
      return;
    }

    const { precoVenda: _ignorado, ...entrada } = inputs as PlatformInputMap[K] & {
      precoVenda: number;
    };
    const preco = precoParaMargem(platform, novoAlvo, entrada as never);

    if (preco === null) {
      setInalcancavel(true);
      return;
    }
    setInalcancavel(false);
    onPreco(preco);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-primary" />
          Quero lucrar
        </Label>
        <span className="font-mono text-sm tabular-nums text-primary">
          {alvo.toFixed(1)}%
        </span>
      </div>

      <Slider
        value={[alvo]}
        onValueChange={aplicar}
        min={0}
        max={MARGEM_MAXIMA}
        step={0.5}
        disabled={desabilitado}
        aria-label="Margem de lucro desejada"
      />

      <p className="mt-2 text-xs text-muted-foreground">
        {desabilitado
          ? "Informe o custo do produto para calcular o preço pela margem."
          : inalcancavel
            ? `Não existe preço que entregue ${alvo.toFixed(1)}% nesta plataforma com esse custo. As taxas consomem a margem antes disso.`
            : "Arraste para o lucro que você quer e o preço de venda se ajusta sozinho."}
      </p>
    </div>
  );
}
