import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Target, Zap, TrendingUp, AlertTriangle, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarketplaceLogo, type MarketplaceKey } from "@/components/MarketplaceLogo";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useCarteira } from "@/hooks/useCarteira";
import { recomendarRoas, avaliarRoasAtual, fmtNumero, type Objetivo } from "@/lib/pricing/ads";

function parseNum(val: string): number {
  return parseFloat(val.replace(",", ".")) || 0;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CHAVE_POR_NOME: Record<string, MarketplaceKey> = {
  Shopee: "shopee",
  "Mercado Livre": "mercadolivre",
  Amazon: "amazon",
  Magalu: "magalu",
  "TikTok Shop": "tiktok",
  Shein: "shein",
};

const MANUAL = "__manual__";

interface MetricaProps {
  rotulo: string;
  valor: string;
  apoio: string;
  destaque?: boolean;
}

const Metrica = ({ rotulo, valor, apoio, destaque }: MetricaProps) => (
  <div
    className={`rounded-lg border p-4 ${
      destaque ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
    }`}
  >
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {rotulo}
    </p>
    <p
      className={`mt-1.5 text-2xl font-bold tabular-nums ${
        destaque ? "text-primary" : "text-foreground"
      }`}
    >
      {valor}
    </p>
    <p className="mt-1 text-xs text-muted-foreground">{apoio}</p>
  </div>
);

const CalculadoraAds = () => {
  const navigate = useNavigate();
  const { produtos, carregando } = useCarteira();

  const [selecionado, setSelecionado] = usePersistedState<string>("ads_produto", MANUAL);
  const [precoManual, setPrecoManual] = usePersistedState("ads_preco", "");
  const [margemManual, setMargemManual] = usePersistedState("ads_margem", "");
  const [objetivo, setObjetivo] = usePersistedState<Objetivo>("ads_objetivo", "rentabilidade");
  const [roasAtual, setRoasAtual] = usePersistedState("ads_roas", "");

  const produto = produtos.find((p) => p.id === selecionado) ?? null;

  const margemPercent = produto
    ? produto.profit_margin_percent
    : parseNum(margemManual);
  const precoVenda = produto ? produto.sale_price : parseNum(precoManual);

  const recomendacao = useMemo(
    () => recomendarRoas(margemPercent, objetivo),
    [margemPercent, objetivo],
  );
  const avaliacao = useMemo(() => {
    const r = parseNum(roasAtual);
    return r > 0 ? avaliarRoasAtual(margemPercent, r) : null;
  }, [margemPercent, roasAtual]);

  const temMargem = margemPercent > 0;

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Calculadora de Ads</h1>
        <p className="text-sm text-muted-foreground">
          Até onde vale pagar por anúncio sem comer o lucro do produto
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Escolha um produto salvo</Label>
              <Select value={selecionado} onValueChange={setSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Digitar manualmente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MANUAL}>Digitar manualmente</SelectItem>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.product_name} · {p.profit_margin_percent.toFixed(1)}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!carregando && produtos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Você ainda não salvou produtos.{" "}
                  <button
                    onClick={() => navigate("/calculadora")}
                    className="text-primary hover:underline"
                  >
                    Calcular um agora
                  </button>
                  .
                </p>
              )}
            </div>

            {produto ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div className="mb-2 flex items-center gap-2">
                  {CHAVE_POR_NOME[produto.platform] && (
                    <MarketplaceLogo
                      platform={CHAVE_POR_NOME[produto.platform]}
                      className="h-4 w-auto max-w-12"
                    />
                  )}
                  <span className="truncate text-foreground">{produto.product_name}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Preço de venda</span>
                  <span className="font-mono text-foreground">
                    {formatCurrency(produto.sale_price)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Margem</span>
                  <span className="font-mono text-foreground">
                    {produto.profit_margin_percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ads-preco">Preço de venda (R$)</Label>
                  <Input id="ads-preco" inputMode="decimal" value={precoManual}
                    onChange={(e) => setPrecoManual(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ads-margem">Margem (%)</Label>
                  <Input id="ads-margem" inputMode="decimal" value={margemManual}
                    onChange={(e) => setMargemManual(e.target.value)} placeholder="0" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>O que você quer com esse produto</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={objetivo === "giro" ? "default" : "outline"}
                  onClick={() => setObjetivo("giro")}
                  className="h-auto flex-col items-start gap-1 px-3 py-2.5 text-left"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Zap className="h-3.5 w-3.5" />
                    Giro
                  </span>
                  <span className="text-xs font-normal opacity-80">Vender mais</span>
                </Button>
                <Button
                  type="button"
                  variant={objetivo === "rentabilidade" ? "default" : "outline"}
                  onClick={() => setObjetivo("rentabilidade")}
                  className="h-auto flex-col items-start gap-1 px-3 py-2.5 text-left"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Rentabilidade
                  </span>
                  <span className="text-xs font-normal opacity-80">Lucrar mais</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ads-roas">ROAS atual da campanha (opcional)</Label>
              <Input id="ads-roas" inputMode="decimal" value={roasAtual}
                onChange={(e) => setRoasAtual(e.target.value)} placeholder="Ex.: 4,1" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!temMargem ? (
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="rounded-2xl bg-primary/10 p-4">
                  <Megaphone className="h-8 w-8 text-primary" />
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Escolha um produto salvo ou informe a margem para descobrir o ROAS mínimo
                  que o anúncio precisa entregar.
                </p>
              </CardContent>
            </Card>
          ) : !recomendacao ? (
            <Card className="border-destructive/40 bg-card">
              <CardContent className="flex items-start gap-3 py-8">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-foreground">
                    Este produto já vende no prejuízo
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Com margem de {margemPercent.toFixed(1)}% não existe ROAS que torne o
                    anúncio viável: cada venda já sai no negativo antes de qualquer gasto com
                    tráfego. Ajuste preço ou custo antes de anunciar.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-primary" />
                    Ponto de equilíbrio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Metrica
                      rotulo="ROAS de equilíbrio"
                      valor={`${fmtNumero(recomendacao.roasEquilibrio)}x`}
                      apoio="Abaixo disso o anúncio consome o lucro"
                    />
                    <Metrica
                      rotulo="ACOS de equilíbrio"
                      valor={`${fmtNumero(recomendacao.acosEquilibrio)}%`}
                      apoio="Máximo do preço que pode ir para anúncio"
                    />
                  </div>
                  {precoVenda > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Em dinheiro: numa venda de {formatCurrency(precoVenda)} você pode gastar
                      até{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency((precoVenda * recomendacao.acosEquilibrio) / 100)}
                      </span>{" "}
                      em anúncio antes de empatar.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Alvo para {objetivo === "giro" ? "girar estoque" : "lucrar mais"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Metrica
                      rotulo="ROAS alvo"
                      valor={`${fmtNumero(recomendacao.roasAlvo)}x`}
                      apoio="Mire nisso na campanha"
                      destaque
                    />
                    <Metrica
                      rotulo="ACOS alvo"
                      valor={`${fmtNumero(recomendacao.acosAlvo)}%`}
                      apoio="Do preço de venda"
                    />
                    <Metrica
                      rotulo="Margem que sobra"
                      valor={`${fmtNumero(recomendacao.margemResultante)}%`}
                      apoio="Depois de pagar o anúncio"
                    />
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {recomendacao.texto}
                  </p>
                </CardContent>
              </Card>

              {avaliacao && (
                <Card
                  className={
                    avaliacao.situacao === "prejuizo"
                      ? "border-destructive/40 bg-card"
                      : avaliacao.situacao === "lucro"
                        ? "border-success/40 bg-card"
                        : "border-border bg-card"
                  }
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {avaliacao.situacao === "prejuizo" ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : avaliacao.situacao === "lucro" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      )}
                      Sua campanha hoje
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {avaliacao.texto}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculadoraAds;
