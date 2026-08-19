import { useMemo } from "react";
import { Trophy, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketplaceLogo } from "@/components/MarketplaceLogo";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useTaxas } from "@/components/layout/TaxasProvider";
import { calcular, PLATFORM_KEYS, PLATFORM_LABELS, type PlatformKey } from "@/lib/pricing";
import type { PricingResult } from "@/lib/pricing/types";
import { AMAZON_TAXAS, type AmazonModelo, type AmazonDBAZona } from "@/lib/pricing/amazon";
import type { MagaluTipoProduto, MagaluDescontoFrete } from "@/lib/pricing/magalu";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseNum(val: string): number {
  return parseFloat(val.replace(",", ".")) || 0;
}

interface Linha {
  key: PlatformKey;
  resultado: PricingResult;
  premissa: string;
  /** true quando a linha depende de um número que o lojista ainda não confirmou. */
  premissaIncerta: boolean;
}

const Comparador = () => {
  const taxas = useTaxas();
  // Entradas comuns às seis plataformas
  const [precoVenda, setPrecoVenda] = usePersistedState("comp_preco", "");
  const [custoProduto, setCustoProduto] = usePersistedState("comp_custo", "");
  const [imposto, setImposto] = usePersistedState("comp_imposto", "");
  const [pesoGramas, setPesoGramas] = usePersistedState("comp_peso", "");
  const [comprimento, setComprimento] = usePersistedState("comp_comp", "");
  const [largura, setLargura] = usePersistedState("comp_larg", "");
  const [altura, setAltura] = usePersistedState("comp_alt", "");

  // Premissas por plataforma — visíveis e editáveis, nunca escondidas
  const [subsidioPix, setSubsidioPix] = usePersistedState("comp_shopee_pix", false);
  const [mlComissao, setMlComissao] = usePersistedState("comp_ml_comissao", "");
  const [mlFrete, setMlFrete] = usePersistedState("comp_ml_frete", true);
  const [amzCategoria, setAmzCategoria] = usePersistedState("comp_amz_cat", "Casa");
  const [amzModelo, setAmzModelo] = usePersistedState<AmazonModelo>("comp_amz_modelo", "dba");
  const [amzZona, setAmzZona] = usePersistedState<AmazonDBAZona>("comp_amz_zona", "sp");
  const [magTipo, setMagTipo] = usePersistedState<MagaluTipoProduto>("comp_mag_tipo", "leves");
  const [magDesconto, setMagDesconto] = usePersistedState<MagaluDescontoFrete>(
    "comp_mag_desc",
    "sem_desconto",
  );
  const [tkFreteGratis, setTkFreteGratis] = usePersistedState("comp_tk_frete", false);
  const [tkIncentivo, setTkIncentivo] = usePersistedState("comp_tk_incentivo", false);

  const preco = parseNum(precoVenda);
  const custo = parseNum(custoProduto);
  const impostoPerc = parseNum(imposto);
  const pesoKg = parseNum(pesoGramas) / 1000;
  const comp = parseNum(comprimento);
  const larg = parseNum(largura);
  const alt = parseNum(altura);
  const mlComissaoPerc = parseNum(mlComissao);

  const linhas = useMemo<Linha[]>(() => {
    const base = {
      precoVenda: preco,
      custoProduto: custo,
      impostoPercent: impostoPerc,
      marketingPercent: 0,
    };

    const construir = (key: PlatformKey): Linha => {
      switch (key) {
        case "shopee":
          return {
            key,
            resultado: calcular("shopee", { ...base, usarSubsidioPix: subsidioPix }, taxas.shopee),
            premissa: subsidioPix ? "Com subsídio Pix" : "Sem subsídio Pix",
            premissaIncerta: false,
          };
        case "mercadolivre": {
          const frac = mlComissaoPerc / 100;
          return {
            key,
            resultado: calcular("mercadolivre", {
              ...base,
              tipoAnuncio: "classico",
              produto: "Comparador",
              categorias: [
                { nome: "Comparador", classicoPerc: frac, premiumPerc: frac },
              ],
              pesoKg,
              usarFrete: mlFrete,
            }, taxas.mercadolivre),
            premissa:
              mlComissaoPerc > 0
                ? `Comissão ${mlComissaoPerc}% (informada por você)`
                : "Comissão não informada",
            premissaIncerta: mlComissaoPerc <= 0,
          };
        }
        case "amazon":
          return {
            key,
            resultado: calcular("amazon", {
              ...base,
              categoria: amzCategoria,
              modelo: amzModelo,
              dbaZona: amzZona,
              pesoKg,
              alturaCm: alt,
              larguraCm: larg,
              comprimentoCm: comp,
            }, taxas.amazon),
            premissa: `${amzCategoria} · ${amzModelo.toUpperCase().replace("_", " ")}`,
            premissaIncerta: false,
          };
        case "magalu":
          return {
            key,
            resultado: calcular("magalu", {
              ...base,
              tipoProduto: magTipo,
              descontoFrete: magDesconto,
              pesoKg,
              comprimento: comp,
              largura: larg,
              altura: alt,
              taxaFixa: 0,
              usarFrete: true,
            }, taxas.magalu),
            premissa: `${magTipo === "leves" ? "Leves" : "Pesados"} · sem taxa fixa`,
            premissaIncerta: false,
          };
        case "tiktok":
          return {
            key,
            resultado: calcular("tiktok", {
              ...base,
              freteGratis: tkFreteGratis,
              incentivoComissao: tkIncentivo,
            }, taxas.tiktok),
            premissa: tkIncentivo ? "Com incentivo de comissão" : "Comissão padrão",
            premissaIncerta: false,
          };
        case "shein":
          return {
            key,
            resultado: calcular("shein", {
              ...base,
              pesoKg,
              comprimento: comp,
              largura: larg,
              altura: alt,
            }, taxas.shein),
            premissa: pesoKg > 1.5 ? "Acima de 1,5 kg: frete estimado" : "Frete por faixa de peso",
            premissaIncerta: pesoKg > 1.5,
          };
      }
    };

    return PLATFORM_KEYS.map(construir).sort((a, b) => b.resultado.lucro - a.resultado.lucro);
  }, [
    taxas,
    preco, custo, impostoPerc, pesoKg, comp, larg, alt,
    subsidioPix, mlComissaoPerc, mlFrete,
    amzCategoria, amzModelo, amzZona, magTipo, magDesconto,
    tkFreteGratis, tkIncentivo,
  ]);

  const temResultado = preco > 0;
  const melhor = temResultado ? linhas[0] : null;

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Comparador</h1>
        <p className="text-sm text-muted-foreground">
          O mesmo produto nos seis marketplaces, lado a lado
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="comp-preco">Preço de venda (R$)</Label>
                  <Input id="comp-preco" inputMode="decimal" value={precoVenda}
                    onChange={(e) => setPrecoVenda(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-custo">Custo (R$)</Label>
                  <Input id="comp-custo" inputMode="decimal" value={custoProduto}
                    onChange={(e) => setCustoProduto(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-imposto">Imposto (%)</Label>
                  <Input id="comp-imposto" inputMode="decimal" value={imposto}
                    onChange={(e) => setImposto(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-peso">Peso (g)</Label>
                  <Input id="comp-peso" inputMode="decimal" value={pesoGramas}
                    onChange={(e) => setPesoGramas(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="comp-c">Compr. (cm)</Label>
                  <Input id="comp-c" inputMode="decimal" value={comprimento}
                    onChange={(e) => setComprimento(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-l">Larg. (cm)</Label>
                  <Input id="comp-l" inputMode="decimal" value={largura}
                    onChange={(e) => setLargura(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comp-a">Alt. (cm)</Label>
                  <Input id="comp-a" inputMode="decimal" value={altura}
                    onChange={(e) => setAltura(e.target.value)} placeholder="0" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Premissas</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cada marketplace cobra por regras próprias. Estes são os valores usados na
                comparação — ajuste para bater com a sua conta.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="comp-ml">Comissão do Mercado Livre (%)</Label>
                <Input id="comp-ml" inputMode="decimal" value={mlComissao}
                  onChange={(e) => setMlComissao(e.target.value)} placeholder="Ex.: 12" />
                <p className="text-xs text-muted-foreground">
                  Varia por categoria. Sem esse número o Mercado Livre aparece sem comissão e
                  parece melhor do que é.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="comp-mlfrete" className="font-normal">
                  Mercado Livre: eu ofereço o frete
                </Label>
                <Switch id="comp-mlfrete" checked={mlFrete} onCheckedChange={setMlFrete} />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="comp-pix" className="font-normal">Shopee: subsídio Pix</Label>
                <Switch id="comp-pix" checked={subsidioPix} onCheckedChange={setSubsidioPix} />
              </div>

              <div className="space-y-1.5">
                <Label>Categoria na Amazon</Label>
                <Select value={amzCategoria} onValueChange={setAmzCategoria}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AMAZON_TAXAS.categorias.map((c) => (
                      <SelectItem key={c.nome} value={c.nome}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Envio Amazon</Label>
                  <Select value={amzModelo} onValueChange={(v) => setAmzModelo(v as AmazonModelo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dba">DBA</SelectItem>
                      <SelectItem value="fba">FBA</SelectItem>
                      <SelectItem value="fba_onsite">FBA Onsite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Zona DBA</Label>
                  <Select value={amzZona} onValueChange={(v) => setAmzZona(v as AmazonDBAZona)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sp">SP - Zona 1</SelectItem>
                      <SelectItem value="zona1">Zona 1</SelectItem>
                      <SelectItem value="zona2">Zona 2</SelectItem>
                      <SelectItem value="centro_norte">Centro-Oeste/Norte/Nordeste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Magalu: tipo</Label>
                  <Select value={magTipo} onValueChange={(v) => setMagTipo(v as MagaluTipoProduto)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leves">Leves</SelectItem>
                      <SelectItem value="pesados">Pesados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Magalu: desconto</Label>
                  <Select value={magDesconto}
                    onValueChange={(v) => setMagDesconto(v as MagaluDescontoFrete)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem_desconto">Sem desconto</SelectItem>
                      <SelectItem value="desconto_25">25%</SelectItem>
                      <SelectItem value="desconto_50">50%</SelectItem>
                      <SelectItem value="desconto_75">75%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="comp-tkfrete" className="font-normal">
                  TikTok: taxa de frete grátis
                </Label>
                <Switch id="comp-tkfrete" checked={tkFreteGratis}
                  onCheckedChange={setTkFreteGratis} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="comp-tkinc" className="font-normal">
                  TikTok: incentivo de comissão
                </Label>
                <Switch id="comp-tkinc" checked={tkIncentivo} onCheckedChange={setTkIncentivo} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resultado</CardTitle>
            {temResultado && melhor && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Trophy className="h-4 w-4 text-primary" />
                Maior lucro em{" "}
                <span className="font-medium text-foreground">
                  {PLATFORM_LABELS[melhor.key]}
                </span>
                : {formatCurrency(melhor.resultado.lucro)} por unidade
              </p>
            )}
          </CardHeader>
          <CardContent>
            {!temResultado ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Informe o preço de venda para comparar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2.5 text-left font-medium">Marketplace</th>
                      <th className="px-2 py-2.5 text-right font-medium">Comissão</th>
                      <th className="px-2 py-2.5 text-right font-medium">Frete</th>
                      <th className="px-2 py-2.5 text-right font-medium">Imposto</th>
                      <th className="px-2 py-2.5 text-right font-medium">Receita líq.</th>
                      <th className="px-2 py-2.5 text-right font-medium">Lucro</th>
                      <th className="px-2 py-2.5 text-right font-medium">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l, i) => {
                      const r = l.resultado;
                      const cor = r.lucrativo ? "text-success" : "text-destructive";
                      return (
                        <tr
                          key={l.key}
                          className={`border-b border-border last:border-0 ${
                            i === 0 ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2">
                              <MarketplaceLogo platform={l.key} className="h-4 w-auto max-w-12" />
                              <div className="min-w-0">
                                <p className="truncate text-foreground">
                                  {PLATFORM_LABELS[l.key]}
                                </p>
                                <p
                                  className={`flex items-center gap-1 text-xs ${
                                    l.premissaIncerta ? "text-warning" : "text-muted-foreground"
                                  }`}
                                >
                                  {l.premissaIncerta && <Info className="h-3 w-3 shrink-0" />}
                                  {l.premissa}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(r.valorComissao)}
                          </td>
                          <td className="px-2 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(r.valorFrete)}
                          </td>
                          <td className="px-2 py-3 text-right font-mono text-muted-foreground">
                            {formatCurrency(r.valorImposto)}
                          </td>
                          <td className="px-2 py-3 text-right font-mono text-foreground">
                            {formatCurrency(r.receitaLiquida)}
                          </td>
                          <td className={`px-2 py-3 text-right font-mono font-semibold ${cor}`}>
                            {formatCurrency(r.lucro)}
                          </td>
                          <td className={`px-2 py-3 text-right font-mono ${cor}`}>
                            {r.margemPercent.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <p className="mt-4 text-xs text-muted-foreground">
                  A coluna abaixo de cada marketplace mostra a premissa usada. Marketplaces
                  cobram por regras diferentes, então comparação sem premissa explícita engana.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Comparador;
