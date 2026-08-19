import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { calcularAmazon, freteFBA, freteFBAOnsite, freteDBA, buscarCategoriaAmazon,
         calcularPesoCubadoFBA, descricaoTaxaAmazon, AMAZON_TAXAS,
         type AmazonModelo, type AmazonDBAZona } from "@/lib/pricing/amazon";
import { calcularShopee, faixaShopee, SHOPEE_TAXAS } from "@/lib/pricing/shopee";
import { calcularTikTok, faixaTiktok, TIKTOK_FRETE_GRATIS_PERCENTUAL } from "@/lib/pricing/tiktok";
import { calcularShein, calcularFreteShein, SHEIN_TAXAS } from "@/lib/pricing/shein";
import { calcularMercadoLivre, custoFixoMercadoLivre, pesoIdx, faixaPrecoIdx,
         MERCADOLIVRE_TAXAS } from "@/lib/pricing/mercadolivre";
import { calcularMagalu, calcularPesoCubadoMagalu, faixaFreteMagalu, MAGALU_TAXAS,
         type MagaluTipoProduto, type MagaluDescontoFrete } from "@/lib/pricing/magalu";
import { MarketplaceLogo } from "@/components/MarketplaceLogo";
import { SalvarProdutoDialog } from "@/components/SalvarProdutoDialog";
import { MargemSlider } from "@/components/MargemSlider";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoHorizontalLight from "@/assets/logo-horizontal-light.png";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, ShoppingBag, LogOut, Plus, Trash2, Sun, Moon, Shield, BookmarkPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Tabela de comissões Shopee (baseada na imagem enviada)
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(0) + "%";
}

function parseNum(val: string): number {
  return parseFloat(val.replace(",", ".")) || 0;
}

// ─── Calculadora Shopee ────────────────────────────────────────────────────────
const ShopeeCalculadora = () => {
  const [nomeProduto, setNomeProduto]   = usePersistedState("calc_shopee_nome", "");
  const [precoVenda, setPrecoVenda]     = usePersistedState("calc_shopee_preco", "");
  const [custoProduto, setCustoProduto] = usePersistedState("calc_shopee_custo", "");
  const [imposto, setImposto]           = usePersistedState("calc_shopee_imposto", "");
  const [marketing, setMarketing]       = usePersistedState("calc_shopee_marketing", "");
  const [usarMarketing, setUsarMarketing]     = usePersistedState("calc_shopee_usarMkt", false);
  const [usarSubsidioPix, setUsarSubsidioPix] = usePersistedState("calc_shopee_subsidioPix", false);

  const preco         = parseNum(precoVenda);
  const custo         = parseNum(custoProduto);
  const impostoPerc   = parseNum(imposto);
  const marketingPerc = parseNum(marketing);

  const comissao = preco > 0 ? faixaShopee(preco) : null;

  const inputs = {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent: impostoPerc,
    marketingPercent: usarMarketing ? marketingPerc : 0,
    usarSubsidioPix,
  };
  const resultado = calcularShopee(inputs);
  const { valorComissao, valorImposto, valorMarketing, subsidio, receitaLiquida, lucro } = resultado;
  const margemLucro = resultado.margemPercent;
  const isLucrativo = resultado.lucrativo;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Entradas */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Dados do Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Nome do Produto</Label>
            <Input
              type="text"
              placeholder="Ex: Protetor de tomada"
              value={nomeProduto}
              onChange={(e) => setNomeProduto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Preço de Venda (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          <MargemSlider
            platform="shopee"
            inputs={inputs}
            onPreco={(p) => setPrecoVenda(String(p))}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Custo do Produto (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={custoProduto}
              onChange={(e) => setCustoProduto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Imposto (%)</Label>
            <Input
              type="number"
              placeholder="0"
              value={imposto}
              onChange={(e) => setImposto(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ex: Simples Nacional, MEI, etc.</p>
          </div>

          <Separator />

          {/* Subsídio Pix */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Incluir Subsídio Pix</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {comissao && comissao.subsidioPix > 0
                  ? `${formatPercent(comissao.subsidioPix)} disponível nesta faixa`
                  : "Não disponível nesta faixa"}
              </p>
            </div>
            <Switch
              checked={usarSubsidioPix}
              onCheckedChange={setUsarSubsidioPix}
              disabled={!comissao || comissao.subsidioPix === 0}
            />
          </div>

          {/* Marketing (opcional) */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Marketing (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Inclui custo de anúncios</p>
            </div>
            <Switch
              checked={usarMarketing}
              onCheckedChange={setUsarMarketing}
            />
          </div>

          {usarMarketing && (
            <div className="space-y-2">
              <Label className="text-foreground">Taxa de Marketing (%)</Label>
              <Input
                type="number"
                placeholder="0"
                value={marketing}
                onChange={(e) => setMarketing(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="space-y-4">
        {/* Faixa de comissão ativa */}
        {comissao && preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Faixa de Comissão Shopee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Comissão</span>
                <Badge variant="secondary" className="font-mono">
                  {comissao.fixoPercentual
                    ? `${formatPercent(comissao.percentual)} + ${formatPercent(comissao.fixoPercentual)} do item`
                    : `${formatPercent(comissao.percentual)} + R$${comissao.fixo}`}
                </Badge>

              </div>
              {usarSubsidioPix && comissao.subsidioPix > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Subsídio Pix</span>
                  <Badge className="bg-primary/20 text-primary font-mono border-0">
                    +{formatPercent(comissao.subsidioPix)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Breakdown */}
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="text-foreground font-medium">{formatCurrency(preco)}</span>
              </div>

              {usarSubsidioPix && subsidio > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">+ Subsídio Pix</span>
                  <span className="text-success font-medium">+{formatCurrency(subsidio)}</span>
                </div>
              )}

              {valorComissao > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Comissão Shopee</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorComissao)}</span>
                </div>
              )}

              {valorImposto > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Imposto ({impostoPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorImposto)}</span>
                </div>
              )}

              {usarMarketing && valorMarketing > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Marketing ({marketingPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorMarketing)}</span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">= Receita Líquida</span>
                <span className="text-foreground">{formatCurrency(receitaLiquida)}</span>
              </div>

              {custo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Custo do Produto</span>
                  <span className="text-destructive font-medium">−{formatCurrency(custo)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado final */}
        {preco > 0 && (
          <Card
            className={`border-2 ${
              isLucrativo
                ? "border-success bg-success/5"
                : "border-destructive bg-destructive/5"
            }`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lucro Estimado</p>
                  <p
                    className={`text-3xl font-bold ${
                      isLucrativo ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(lucro)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Margem</p>
                  <p
                    className={`text-2xl font-bold ${
                      isLucrativo ? "text-success" : "text-destructive"
                    }`}
                  >
                    {margemLucro.toFixed(1)}%
                  </p>
                </div>
              </div>

              {!isLucrativo && (
                <p className="text-sm text-destructive mt-3 font-medium">
                  ⚠️ Este preço não cobre os custos. Revise o valor de venda.
                </p>
              )}
              {isLucrativo && (
                <p className="text-sm text-success mt-3 font-medium">
                  ✓ Produto rentável neste preço.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nomeProduto || <span className="text-muted-foreground italic text-xs">Sem nome definido</span>}</p>
                <p className="text-xs text-muted-foreground">
                  Margem: <span className={isLucrativo ? "text-success font-medium" : "text-destructive font-medium"}>{margemLucro.toFixed(1)}%</span>
                  {" · "}{formatCurrency(lucro)}
                </p>
              </div>
              <SalvarProdutoDialog
                platform="Shopee"
                inputs={inputs}
                resultado={resultado}
                nomeInicial={nomeProduto}
              />
            </CardContent>
          </Card>
        )}

        {preco === 0 && (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="text-center py-16">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Insira o preço de venda para calcular</p>
            </CardContent>
          </Card>
        )}

        {/* Tabela de referência */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tabela de Comissões Shopee
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Faixa</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Comissão</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Subsídio Pix</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Abaixo de R$8,00",     comissao: "20% + 50% do item", pix: "—",  idx: 0 },
                  { label: "R$8 – R$79,99",        comissao: "20% + R$4",  pix: "—",  idx: 1 },
                  { label: "R$80 – R$99,99",       comissao: "14% + R$16", pix: "5%", idx: 2 },
                  { label: "R$100 – R$199,99",     comissao: "14% + R$20", pix: "5%", idx: 3 },
                  { label: "R$200 – R$499,99",     comissao: "14% + R$26", pix: "5%", idx: 4 },
                  { label: "Acima de R$500",       comissao: "14% + R$26", pix: "8%", idx: 5 },
                ].map((row) => {
                  const faixaAtiva = comissao && preco > 0 && SHOPEE_TAXAS[row.idx] === comissao;
                  return (
                    <tr
                      key={row.idx}
                      className={`border-b border-border last:border-0 transition-colors ${
                        faixaAtiva ? "bg-primary/10" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className={`px-4 py-2.5 ${faixaAtiva ? "text-primary font-semibold" : "text-foreground"}`}>
                        {row.label}
                      </td>
                      <td className={`px-4 py-2.5 text-center font-mono ${faixaAtiva ? "text-primary font-semibold" : "text-foreground"}`}>
                        {row.comissao}
                      </td>
                      <td className={`px-4 py-2.5 text-center ${
                        row.pix === "—"
                          ? "text-muted-foreground"
                          : faixaAtiva
                          ? "text-primary font-semibold"
                          : "text-foreground"
                      }`}>
                        {row.pix}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Calculadora Amazon ───────────────────────────────────────────────────────
const AMAZON_DBA_ZONAS: { value: AmazonDBAZona; label: string }[] = [
  { value: "sp", label: "SP - Zona 1" },
  { value: "zona1", label: "Zona 1 (outros Sul e Sudeste)" },
  { value: "zona2", label: "Zona 2 (do Sul e Sudeste)" },
  { value: "centro_norte", label: "Centro-Oeste, Norte e Nordeste" },
];

const AmazonCalculadora = () => {
  const [nomeProduto, setNomeProduto]         = usePersistedState("calc_amazon_nome", "");
  const [categoriaNome, setCategoriaNome]   = usePersistedState("calc_amazon_cat", AMAZON_TAXAS.categorias[0].nome);
  const [precoVenda, setPrecoVenda]         = usePersistedState("calc_amazon_preco", "");
  const [custoProduto, setCustoProduto]     = usePersistedState("calc_amazon_custo", "");
  const [imposto, setImposto]               = usePersistedState("calc_amazon_imposto", "");
  const [marketing, setMarketing]           = usePersistedState("calc_amazon_marketing", "");
  const [usarMarketing, setUsarMarketing]   = usePersistedState("calc_amazon_usarMkt", false);
  const [modelo, setModelo]                 = usePersistedState<AmazonModelo>("calc_amazon_modelo", "dba");
  const [pesoFBA, setPesoFBA]               = usePersistedState("calc_amazon_peso_fba", "");
  const [alturaFBA, setAlturaFBA]           = usePersistedState("calc_amazon_altura_fba", "");
  const [larguraFBA, setLarguraFBA]         = usePersistedState("calc_amazon_largura_fba", "");
  const [comprimentoFBA, setComprimentoFBA] = usePersistedState("calc_amazon_comprimento_fba", "");
  const [dbaZona, setDbaZona]               = usePersistedState<AmazonDBAZona>("calc_amazon_dba_zona", "sp");

  const categoria      = buscarCategoriaAmazon(categoriaNome, AMAZON_TAXAS);
  const preco          = parseNum(precoVenda);
  const custo          = parseNum(custoProduto);
  const impostoPerc    = parseNum(imposto);
  const marketingPerc  = parseNum(marketing);
  const pesoRealFBA    = parseNum(pesoFBA);
  const altCm          = parseNum(alturaFBA);
  const largCm         = parseNum(larguraFBA);
  const compCm         = parseNum(comprimentoFBA);

  const pesoCubadoFBA  = (altCm > 0 && largCm > 0 && compCm > 0) ? calcularPesoCubadoFBA(altCm, largCm, compCm) : 0;
  const pesoFinalFBA   = Math.max(pesoRealFBA, pesoCubadoFBA);
  const fbaFreteInfo      = modelo === "fba" && pesoFinalFBA > 0 && preco > 0 ? freteFBA(pesoFinalFBA, preco) : null;
  const fbaOnsiteInfo     = modelo === "fba_onsite" && pesoFinalFBA > 0 ? freteFBAOnsite(pesoFinalFBA) : null;
  const dbaFreteInfo      = modelo === "dba" && preco > 0 ? freteDBA(pesoFinalFBA, preco, dbaZona) : null;

  const inputs = {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent: impostoPerc,
    marketingPercent: usarMarketing ? marketingPerc : 0,
    categoria: categoriaNome,
    modelo,
    dbaZona,
    pesoKg: pesoRealFBA,
    alturaCm: altCm,
    larguraCm: largCm,
    comprimentoCm: compCm,
  };
  const resultado = calcularAmazon(inputs);
  const { valorComissao, valorImposto, valorMarketing, valorFrete, receitaLiquida, lucro } = resultado;
  const margemLucro = resultado.margemPercent;
  const isLucrativo = resultado.lucrativo;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Entradas */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Dados do Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Nome do Produto</Label>
            <input
              type="text"
              placeholder="Ex: Protetor de tomada"
              value={nomeProduto}
              onChange={(e) => setNomeProduto(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Categoria Amazon</Label>
            <select
              value={categoriaNome}
              onChange={(e) => setCategoriaNome(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {AMAZON_TAXAS.categorias.map((c) => (
                <option key={c.nome} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Taxa: <span className="font-medium text-primary">{descricaoTaxaAmazon(categoria)}</span>
              {" "}· Taxa fixa: <span className="font-medium">+ {formatCurrency(categoria.taxaFixa)}</span>
            </p>
          </div>

          {/* Modelo DBA / FBA */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Modelo de Envio</Label>
            <select
              value={modelo}
              onChange={(e) => setModelo(e.target.value as AmazonModelo)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="dba">DBA (Entrega pelo vendedor)</option>
              <option value="fba">FBA (Fulfillment by Amazon)</option>
              <option value="fba_onsite">FBA Onsite</option>
            </select>
          </div>

          {/* DBA freight section */}
          {modelo === "dba" && (
            <div className="space-y-4 p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-foreground">🚚 Frete DBA (Preço Certo)</p>
              {preco > 0 && preco < 79 && (
                <div className="text-xs bg-muted/30 rounded p-2">
                  <p>Tarifa fixa: <span className="font-semibold text-primary">{formatCurrency(dbaFreteInfo?.valor ?? 0)}</span></p>
                  <p className="text-muted-foreground">{dbaFreteInfo?.tipo}</p>
                </div>
              )}
              {preco >= 79 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs font-medium">Zona de Entrega</Label>
                    <select
                      value={dbaZona}
                      onChange={(e) => setDbaZona(e.target.value as AmazonDBAZona)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {AMAZON_DBA_ZONAS.map((z) => (
                        <option key={z.value} value={z.value}>{z.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs font-medium">Peso Real (kg)</Label>
                    <Input type="number" placeholder="0" value={pesoFBA} onChange={(e) => setPesoFBA(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Altura (cm)</Label>
                      <Input type="number" placeholder="0" value={alturaFBA} onChange={(e) => setAlturaFBA(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Largura (cm)</Label>
                      <Input type="number" placeholder="0" value={larguraFBA} onChange={(e) => setLarguraFBA(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Compr. (cm)</Label>
                      <Input type="number" placeholder="0" value={comprimentoFBA} onChange={(e) => setComprimentoFBA(e.target.value)} />
                    </div>
                  </div>
                  {pesoCubadoFBA > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
                      <p>Peso cubado (C×L×A÷6000): <span className="font-semibold text-foreground">{pesoCubadoFBA.toFixed(2)} kg</span></p>
                      <p>Peso real: <span className="font-semibold text-foreground">{pesoRealFBA.toFixed(2)} kg</span></p>
                      <p>Peso considerado: <span className="font-semibold text-primary">{pesoFinalFBA.toFixed(2)} kg</span></p>
                    </div>
                  )}
                  {dbaFreteInfo && (
                    <div className="text-xs bg-muted/30 rounded p-2">
                      <p>{dbaFreteInfo.tipo}</p>
                      {dbaFreteInfo.valor > 0 ? (
                        <p>Frete DBA: <span className="font-semibold text-primary">{formatCurrency(dbaFreteInfo.valor)}</span></p>
                      ) : (
                        <p className="text-warning">
                          Sem o peso o frete entra como zero e o lucro acima fica maior do que o real.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {(modelo === "fba" || modelo === "fba_onsite") && (
            <div className="space-y-4 p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs font-semibold text-foreground">📦 Dados para cálculo de frete {modelo === "fba" ? "FBA" : "FBA Onsite"}</p>
              <div className="space-y-2">
                <Label className="text-foreground text-xs font-medium">Peso Real (kg)</Label>
                <Input type="number" placeholder="0" value={pesoFBA} onChange={(e) => setPesoFBA(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Altura (cm)</Label>
                  <Input type="number" placeholder="0" value={alturaFBA} onChange={(e) => setAlturaFBA(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Largura (cm)</Label>
                  <Input type="number" placeholder="0" value={larguraFBA} onChange={(e) => setLarguraFBA(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Compr. (cm)</Label>
                  <Input type="number" placeholder="0" value={comprimentoFBA} onChange={(e) => setComprimentoFBA(e.target.value)} />
                </div>
              </div>
              {pesoCubadoFBA > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
                  <p>Peso cubado (C×L×A÷6000): <span className="font-semibold text-foreground">{pesoCubadoFBA.toFixed(2)} kg</span></p>
                  <p>Peso real: <span className="font-semibold text-foreground">{pesoRealFBA.toFixed(2)} kg</span></p>
                  <p>Peso considerado: <span className="font-semibold text-primary">{pesoFinalFBA.toFixed(2)} kg</span></p>
                </div>
              )}
              {fbaFreteInfo && (
                <div className="text-xs bg-muted/30 rounded p-2">
                  <p>Faixa: <span className="font-semibold text-foreground">{fbaFreteInfo.faixa?.label ?? "Acima de 10kg"}</span></p>
                  <p>Coluna: <span className="font-semibold text-foreground">{preco <= 50 ? "Até R$50" : "Acima de R$50"}</span></p>
                  <p>Frete FBA: <span className="font-semibold text-primary">{formatCurrency(fbaFreteInfo.valor)}</span></p>
                </div>
              )}
              {fbaOnsiteInfo && (
                <div className="text-xs bg-muted/30 rounded p-2">
                  <p>Faixa: <span className="font-semibold text-foreground">{fbaOnsiteInfo.faixa?.label ?? "Acima de 10kg"}</span></p>
                  <p>Frete FBA Onsite: <span className="font-semibold text-primary">{formatCurrency(fbaOnsiteInfo.valor)}</span></p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Preço de Venda (R$)</Label>
            <input
              type="number"
              placeholder="0,00"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <MargemSlider
            platform="amazon"
            inputs={inputs}
            onPreco={(p) => setPrecoVenda(String(p))}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Custo do Produto (R$)</Label>
            <input
              type="number"
              placeholder="0,00"
              value={custoProduto}
              onChange={(e) => setCustoProduto(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Imposto (%)</Label>
            <input
              type="number"
              placeholder="0"
              value={imposto}
              onChange={(e) => setImposto(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Ex: Simples Nacional, MEI, etc.</p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Marketing (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Inclui custo de anúncios</p>
            </div>
            <Switch checked={usarMarketing} onCheckedChange={setUsarMarketing} />
          </div>

          {usarMarketing && (
            <div className="space-y-2">
              <Label className="text-foreground">Taxa de Marketing (%)</Label>
              <input
                type="number"
                placeholder="0"
                value={marketing}
                onChange={(e) => setMarketing(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="space-y-4">
        {/* Comissão ativa */}
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Comissão Amazon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">{categoria.nome}</span>
                <Badge variant="secondary" className="font-mono">{descricaoTaxaAmazon(categoria)}</Badge>
              </div>
              {categoria.tiered && preco > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
                  {preco <= categoria.tiered.ate ? (
                    <p>Inteiramente na faixa de {(categoria.tiered.taxa * 100).toFixed(0)}% (até R${categoria.tiered.ate})</p>
                  ) : (
                    <>
                      <p>R${categoria.tiered.ate.toFixed(2)} × {(categoria.tiered.taxa * 100).toFixed(0)}% = {formatCurrency(categoria.tiered.ate * categoria.tiered.taxa)}</p>
                      <p>{formatCurrency(preco - categoria.tiered.ate)} × {(categoria.tiered.taxaExcedente * 100).toFixed(0)}% = {formatCurrency((preco - categoria.tiered.ate) * categoria.tiered.taxaExcedente)}</p>
                    </>
                  )}
                  <p className="font-semibold text-foreground">
                    Comissão aplicada: {formatCurrency(valorComissao)}
                    {" "}(inclui taxa fixa de {formatCurrency(categoria.taxaFixa)})
                  </p>
                </div>
              )}
              {!categoria.tiered && preco > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                  <p className="font-semibold text-foreground">
                    Comissão aplicada: {formatCurrency(valorComissao)}
                    {" "}(inclui taxa fixa de {formatCurrency(categoria.taxaFixa)})
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Breakdown */}
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="text-foreground font-medium">{formatCurrency(preco)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">− Comissão Amazon</span>
                <span className="text-destructive font-medium">−{formatCurrency(valorComissao)}</span>
              </div>
              {valorFrete > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Frete {modelo === "dba" ? "DBA" : modelo === "fba" ? "FBA" : "FBA Onsite"}</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorFrete)}</span>
                </div>
              )}
              {valorImposto > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Imposto ({impostoPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorImposto)}</span>
                </div>
              )}
              {usarMarketing && valorMarketing > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Marketing ({marketingPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorMarketing)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">= Receita Líquida</span>
                <span className="text-foreground">{formatCurrency(receitaLiquida)}</span>
              </div>
              {custo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Custo do Produto</span>
                  <span className="text-destructive font-medium">−{formatCurrency(custo)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado final */}
        {preco > 0 && (
          <Card className={`border-2 ${isLucrativo ? "border-success bg-success/5" : "border-destructive bg-destructive/5"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lucro Estimado</p>
                  <p className={`text-3xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(lucro)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Margem</p>
                  <p className={`text-2xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>
                    {margemLucro.toFixed(1)}%
                  </p>
                </div>
              </div>
              {!isLucrativo && (
                <p className="text-sm text-destructive mt-3 font-medium">⚠️ Este preço não cobre os custos. Revise o valor de venda.</p>
              )}
              {isLucrativo && (
                <p className="text-sm text-success mt-3 font-medium">✓ Produto rentável neste preço.</p>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nomeProduto || <span className="text-muted-foreground italic text-xs">Sem nome definido</span>}</p>
                <p className="text-xs text-muted-foreground">
                  Margem: <span className={isLucrativo ? "text-success font-medium" : "text-destructive font-medium"}>{margemLucro.toFixed(1)}%</span>
                  {" · "}{formatCurrency(lucro)}
                </p>
              </div>
              <SalvarProdutoDialog
                platform="Amazon"
                inputs={inputs}
                resultado={resultado}
                nomeInicial={nomeProduto}
              />
            </CardContent>
          </Card>
        )}

        {preco === 0 && (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="text-center py-16">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Selecione a categoria e insira o preço de venda para calcular</p>
            </CardContent>
          </Card>
        )}

        {/* Tabela de referência resumida */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tabela de Comissões Amazon
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">Categoria</th>
                    <th className="text-center px-4 py-2 text-muted-foreground font-medium">Taxa</th>
                    <th className="text-center px-4 py-2 text-muted-foreground font-medium">Mín.</th>
                  </tr>
                </thead>
                <tbody>
                  {AMAZON_TAXAS.categorias.map((cat) => {
                    const ativa = cat.nome === categoriaNome;
                    return (
                      <tr
                        key={cat.nome}
                        onClick={() => setCategoriaNome(cat.nome)}
                        className={`border-b border-border last:border-0 cursor-pointer transition-colors ${ativa ? "bg-primary/10" : "hover:bg-muted/30"}`}
                      >
                        <td className={`px-4 py-2 ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>
                          {cat.nome}
                        </td>
                        <td className={`px-4 py-2 text-center font-mono text-xs ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>
                          {descricaoTaxaAmazon(cat)}
                        </td>
                        <td className={`px-4 py-2 text-center font-mono text-xs ${ativa ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                          +R${cat.taxaFixa},00
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela FBA */}
        {modelo === "fba" && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Tabela de Frete FBA - Preço Certo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Faixa</th>
                      <th className="text-center px-2 py-2 text-muted-foreground font-medium">Até R$50</th>
                      <th className="text-center px-2 py-2 text-muted-foreground font-medium">{">"} R$50</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AMAZON_TAXAS.fbaTabela.map((faixa) => {
                      const ativa = fbaFreteInfo?.faixa === faixa;
                      return (
                        <tr key={faixa.label} className={`border-b border-border last:border-0 transition-colors ${ativa ? "bg-primary/10" : "hover:bg-muted/30"}`}>
                          <td className={`px-3 py-1.5 ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>{faixa.label}</td>
                          <td className={`px-2 py-1.5 text-center font-mono ${ativa && preco <= 50 ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(faixa.ate50)}</td>
                          <td className={`px-2 py-1.5 text-center font-mono ${ativa && preco > 50 ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(faixa.acima50)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td className="px-3 py-1.5 font-semibold text-foreground">Quilo adicional</td>
                      <td className="px-2 py-1.5 text-center font-mono text-foreground">{formatCurrency(AMAZON_TAXAS.fbaQuiloAdicional.ate50)}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-foreground">{formatCurrency(AMAZON_TAXAS.fbaQuiloAdicional.acima50)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 text-xs text-muted-foreground border-t border-border">
                <p>Cubagem FBA: Comprimento × Largura × Altura (cm) ÷ <span className="font-mono text-primary">6000</span></p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela FBA Onsite */}
        {modelo === "fba_onsite" && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Tabela de Frete FBA Onsite
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Faixa</th>
                      <th className="text-center px-2 py-2 text-muted-foreground font-medium">Todas as regiões</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AMAZON_TAXAS.fbaOnsiteTabela.map((faixa) => {
                      const ativa = fbaOnsiteInfo?.faixa === faixa;
                      return (
                        <tr key={faixa.label} className={`border-b border-border last:border-0 transition-colors ${ativa ? "bg-primary/10" : "hover:bg-muted/30"}`}>
                          <td className={`px-3 py-1.5 ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>{faixa.label}</td>
                          <td className={`px-2 py-1.5 text-center font-mono ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(faixa.valor)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-border bg-muted/20">
                      <td className="px-3 py-1.5 font-semibold text-foreground">Quilo adicional</td>
                      <td className="px-2 py-1.5 text-center font-mono text-foreground">{formatCurrency(AMAZON_TAXAS.fbaOnsiteQuiloAdicional)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 text-xs text-muted-foreground border-t border-border">
                <p>Cubagem: Comprimento × Largura × Altura (cm) ÷ <span className="font-mono text-primary">6000</span></p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// ─── Calculadora Magalu ───────────────────────────────────────────────────────
const MagaluCalculadora = () => {
  const [nomeProduto, setNomeProduto]         = usePersistedState("calc_magalu_nome", "");
  const [precoVenda, setPrecoVenda]         = usePersistedState("calc_magalu_preco", "");
  const [custoProduto, setCustoProduto]     = usePersistedState("calc_magalu_custo", "");
  const [imposto, setImposto]               = usePersistedState("calc_magalu_imposto", "");
  const [marketing, setMarketing]           = usePersistedState("calc_magalu_marketing", "");
  const [usarMarketing, setUsarMarketing]   = usePersistedState("calc_magalu_usarMkt", false);
  const [usarFrete, setUsarFrete]           = usePersistedState("calc_magalu_usarFrete", false);
  const [pesoReal, setPesoReal]             = usePersistedState("calc_magalu_peso", "");
  const [altura, setAltura]                 = usePersistedState("calc_magalu_altura", "");
  const [largura, setLargura]               = usePersistedState("calc_magalu_largura", "");
  const [comprimento, setComprimento]       = usePersistedState("calc_magalu_comprimento", "");
  const [tipoProduto, setTipoProduto]       = usePersistedState<MagaluTipoProduto>("calc_magalu_tipo", "leves");
  const [descontoFrete, setDescontoFrete]   = usePersistedState<MagaluDescontoFrete>("calc_magalu_desconto", "sem_desconto");
  const [taxaFixa, setTaxaFixa]             = usePersistedState("calc_magalu_taxaFixa", "");

  const preco          = parseNum(precoVenda);
  const custo          = parseNum(custoProduto);
  const impostoPerc    = parseNum(imposto);
  const marketingPerc  = parseNum(marketing);
  const pesoRealKg     = parseNum(pesoReal);
  const alturaCm       = parseNum(altura);
  const larguraCm      = parseNum(largura);
  const comprimentoCm  = parseNum(comprimento);
  const alturaM        = alturaCm / 100;
  const larguraM       = larguraCm / 100;
  const comprimentoM   = comprimentoCm / 100;

  const pesoCubado     = (alturaM > 0 && larguraM > 0 && comprimentoM > 0) ? calcularPesoCubadoMagalu(alturaM, larguraM, comprimentoM, tipoProduto) : 0;
  const pesoFinal      = Math.max(pesoRealKg, pesoCubado);
  const valorTaxaFixa  = parseNum(taxaFixa);

  const inputs = {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent: impostoPerc,
    marketingPercent: usarMarketing ? marketingPerc : 0,
    tipoProduto,
    descontoFrete,
    pesoKg: pesoRealKg,
    comprimento: comprimentoCm,
    largura: larguraCm,
    altura: alturaCm,
    taxaFixa: valorTaxaFixa,
    usarFrete,
  };
  const resultado = calcularMagalu(inputs);
  const { valorComissao, valorImposto, valorMarketing, valorFrete, receitaLiquida, lucro } = resultado;
  const margemLucro = resultado.margemPercent;
  const isLucrativo = resultado.lucrativo;
  const freteInfo = usarFrete && pesoFinal > 0
    ? { faixa: faixaFreteMagalu(pesoFinal), valor: valorFrete }
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Entradas */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Dados do Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Nome do Produto</Label>
            <Input
              type="text"
              placeholder="Ex: Protetor de tomada"
              value={nomeProduto}
              onChange={(e) => setNomeProduto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Preço de Venda (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          <MargemSlider
            platform="magalu"
            inputs={inputs}
            onPreco={(p) => setPrecoVenda(String(p))}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Custo do Produto (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={custoProduto}
              onChange={(e) => setCustoProduto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Imposto (%)</Label>
            <Input
              type="number"
              placeholder="0"
              value={imposto}
              onChange={(e) => setImposto(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ex: Simples Nacional, MEI, etc.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Taxa Fixa (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={taxaFixa}
              onChange={(e) => setTaxaFixa(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Tarifa fixa cobrada por pedido (ex: R$ 5,00 em vendas abaixo de R$ 79).</p>
          </div>

          <Separator />

          {/* Cálculo de Frete */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Calcular Frete (Preço Certo)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inclui cubagem e tabela de frete Magalu
              </p>
            </div>
            <Switch
              checked={usarFrete}
              onCheckedChange={setUsarFrete}
            />
          </div>

          {usarFrete && (
            <div className="space-y-4 p-3 rounded-lg bg-muted/20 border border-border">
              <div className="space-y-2">
                <Label className="text-foreground font-medium text-xs">Tipo de Produto</Label>
                <select
                  value={tipoProduto}
                  onChange={(e) => setTipoProduto(e.target.value as MagaluTipoProduto)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="leves">Leves (fator cubagem: 167)</option>
                  <option value="pesados">Pesados (fator cubagem: 300)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-medium text-xs">Peso Real (kg)</Label>
                <Input type="number" placeholder="0" value={pesoReal} onChange={(e) => setPesoReal(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Altura (cm)</Label>
                  <Input type="number" placeholder="0" value={altura} onChange={(e) => setAltura(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Largura (cm)</Label>
                  <Input type="number" placeholder="0" value={largura} onChange={(e) => setLargura(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Compr. (cm)</Label>
                  <Input type="number" placeholder="0" value={comprimento} onChange={(e) => setComprimento(e.target.value)} />
                </div>
              </div>

              {pesoCubado > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
                  <p>Peso cubado: <span className="font-semibold text-foreground">{pesoCubado.toFixed(2)} kg</span></p>
                  <p>Peso real: <span className="font-semibold text-foreground">{pesoRealKg.toFixed(2)} kg</span></p>
                  <p>Peso considerado (maior): <span className="font-semibold text-primary">{pesoFinal.toFixed(2)} kg</span></p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-foreground font-medium text-xs">Faixa de Desconto</Label>
                <select
                  value={descontoFrete}
                  onChange={(e) => setDescontoFrete(e.target.value as MagaluDescontoFrete)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="sem_desconto">{"< 87% (Sem desconto)"}</option>
                  <option value="desconto_25">Entre 87% e 97% (Desconto 25%)</option>
                  <option value="desconto_50">{"> 97% (Desconto 50%)"}</option>
                  <option value="desconto_75">Full Magalu (Desconto 75%)</option>
                </select>
                <p className="text-xs text-muted-foreground">Baseado na reputação do vendedor</p>
              </div>

              {freteInfo && (
                <div className="text-xs bg-muted/30 rounded p-2">
                  <p>Faixa: <span className="font-semibold text-foreground">{freteInfo.faixa.label}</span></p>
                  <p>Valor do frete: <span className="font-semibold text-primary">{formatCurrency(freteInfo.valor)}</span></p>
                </div>
              )}
            </div>
          )}

          {/* Marketing (opcional) */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Marketing (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Inclui custo de anúncios</p>
            </div>
            <Switch checked={usarMarketing} onCheckedChange={setUsarMarketing} />
          </div>

          {usarMarketing && (
            <div className="space-y-2">
              <Label className="text-foreground">Taxa de Marketing (%)</Label>
              <Input
                type="number"
                placeholder="0"
                value={marketing}
                onChange={(e) => setMarketing(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="space-y-4">
        {/* Comissão ativa */}
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Comissão Magalu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">Taxa de comissão</span>
                <Badge variant="secondary" className="font-mono">18%</Badge>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
                <p>{formatCurrency(preco)} × 18% = <span className="font-semibold text-foreground">{formatCurrency(valorComissao)}</span></p>
                {valorFrete > 0 && (
                  <p>+ Frete Preço Certo = <span className="font-semibold text-foreground">{formatCurrency(valorFrete)}</span></p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Breakdown */}
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="text-foreground font-medium">{formatCurrency(preco)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">− Comissão Magalu (18%)</span>
                <span className="text-destructive font-medium">−{formatCurrency(valorComissao)}</span>
              </div>
              {valorTaxaFixa > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Taxa Fixa</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorTaxaFixa)}</span>
                </div>
              )}
              {valorFrete > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Frete Preço Certo</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorFrete)}</span>
                </div>
              )}
              {valorImposto > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Imposto ({impostoPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorImposto)}</span>
                </div>
              )}
              {usarMarketing && valorMarketing > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Marketing ({marketingPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorMarketing)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">= Receita Líquida</span>
                <span className="text-foreground">{formatCurrency(receitaLiquida)}</span>
              </div>
              {custo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Custo do Produto</span>
                  <span className="text-destructive font-medium">−{formatCurrency(custo)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado final */}
        {preco > 0 && (
          <Card className={`border-2 ${isLucrativo ? "border-success bg-success/5" : "border-destructive bg-destructive/5"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lucro Estimado</p>
                  <p className={`text-3xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(lucro)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Margem</p>
                  <p className={`text-2xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>
                    {margemLucro.toFixed(1)}%
                  </p>
                </div>
              </div>
              {!isLucrativo && (
                <p className="text-sm text-destructive mt-3 font-medium">⚠️ Este preço não cobre os custos. Revise o valor de venda.</p>
              )}
              {isLucrativo && (
                <p className="text-sm text-success mt-3 font-medium">✓ Produto rentável neste preço.</p>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nomeProduto || <span className="text-muted-foreground italic text-xs">Sem nome definido</span>}</p>
                <p className="text-xs text-muted-foreground">
                  Margem: <span className={isLucrativo ? "text-success font-medium" : "text-destructive font-medium"}>{margemLucro.toFixed(1)}%</span>
                  {" · "}{formatCurrency(lucro)}
                </p>
              </div>
              <SalvarProdutoDialog
                platform="Magalu"
                inputs={inputs}
                resultado={resultado}
                nomeInicial={nomeProduto}
              />
            </CardContent>
          </Card>
        )}

        {preco === 0 && (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="text-center py-16">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Insira o preço de venda para calcular</p>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Frete Magalu */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tabela de Frete Preço Certo - Magalu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                     <th className="text-left px-3 py-2 text-muted-foreground font-medium">Faixa</th>
                     <th className="text-center px-2 py-2 text-muted-foreground font-medium">Sem desc.</th>
                     <th className="text-center px-2 py-2 text-muted-foreground font-medium">25%</th>
                     <th className="text-center px-2 py-2 text-muted-foreground font-medium">50%</th>
                     <th className="text-center px-2 py-2 text-muted-foreground font-medium">75%</th>
                  </tr>
                </thead>
                <tbody>
                  {MAGALU_TAXAS.freteTabela.map((faixa) => {
                    const ativa = freteInfo?.faixa === faixa;
                    return (
                      <tr key={faixa.label} className={`border-b border-border last:border-0 transition-colors ${ativa ? "bg-primary/10" : "hover:bg-muted/30"}`}>
                        <td className={`px-3 py-1.5 ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>{faixa.label}</td>
                        <td className={`px-2 py-1.5 text-center font-mono ${ativa && descontoFrete === "sem_desconto" ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(faixa.semDesconto)}</td>
                        <td className={`px-2 py-1.5 text-center font-mono ${ativa && descontoFrete === "desconto_25" ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(faixa.desconto25)}</td>
                        <td className={`px-2 py-1.5 text-center font-mono ${ativa && descontoFrete === "desconto_50" ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(faixa.desconto50)}</td>
                        <td className={`px-2 py-1.5 text-center font-mono ${ativa && descontoFrete === "desconto_75" ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(faixa.desconto75)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Regra de cubagem */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Regra de Cubagem Magalu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>A Magalu considera o <span className="font-semibold text-foreground">maior peso</span> entre o peso real e o peso cubado.</p>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Leves:</p>
              <p>Altura × Largura × Comprimento × <span className="font-mono text-primary">167</span> = Peso cubado</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Pesados:</p>
              <p>Altura × Largura × Comprimento × <span className="font-mono text-primary">300</span> = Peso cubado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Calculadora Mercado Livre ─────────────────────────────────────────────────

type MLProduto = {
  nome: string;
  classicoPerc: number;
  premiumPerc: number;
};

const ML_PRODUTOS_DEFAULT: MLProduto[] = [];

const ML_FAIXA_PRECO_LABELS = [
  "R$0–18,99", "R$19–48,99", "R$49–78,99", "R$79–99,99",
  "R$100–119,99", "R$120–149,99", "R$150–199,99", "A partir de R$200"
];

const MercadoLivreCalculadora = () => {
  const [mlCategorias, setMlCategorias] = usePersistedState<MLProduto[]>("calc_ml_categorias", ML_PRODUTOS_DEFAULT);
  const [nomeProduto, setNomeProduto] = usePersistedState("calc_ml_nome", "");
  const [produtoNome, setProdutoNome] = usePersistedState("calc_ml_produto", mlCategorias[0]?.nome || "");
  const [tipoAnuncio, setTipoAnuncio] = usePersistedState<"classico" | "premium">("calc_ml_tipo", "premium");
  const [precoVenda, setPrecoVenda]   = usePersistedState("calc_ml_preco", "");
  const [custoProduto, setCustoProduto] = usePersistedState("calc_ml_custo", "");
  const [imposto, setImposto]         = usePersistedState("calc_ml_imposto", "");
  const [marketing, setMarketing]     = usePersistedState("calc_ml_marketing", "");
  const [usarMarketing, setUsarMarketing] = usePersistedState("calc_ml_usarMkt", false);
  const [usarFrete, setUsarFrete]     = usePersistedState("calc_ml_usarFrete", false);
  const [peso, setPeso]               = usePersistedState("calc_ml_peso", "");

  // Dialog para adicionar categoria
  const [showAddCategoria, setShowAddCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaClassico, setNovaCategoriaClassico] = useState("");
  const [novaCategoriaPremium, setNovaCategoriaPremium] = useState("");

  const produto      = mlCategorias.find((p) => p.nome === produtoNome) ?? mlCategorias[0] ?? null;
  const preco        = parseNum(precoVenda);
  const custo        = parseNum(custoProduto);
  const impostoPerc  = parseNum(imposto);
  const marketingPerc = parseNum(marketing);
  const pesoNum      = parseNum(peso);

  const comissaoPerc   = tipoAnuncio === "classico" ? (produto?.classicoPerc ?? 0) : (produto?.premiumPerc ?? 0);
  const inputs = {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent: impostoPerc,
    marketingPercent: usarMarketing ? marketingPerc : 0,
    tipoAnuncio,
    produto: produtoNome,
    categorias: mlCategorias,
    pesoKg: pesoNum,
    usarFrete,
  };
  const resultado = calcularMercadoLivre(inputs);
  const { valorImposto, valorMarketing, valorFrete, receitaLiquida, lucro } = resultado;
  const margemLucro = resultado.margemPercent;
  const isLucrativo = resultado.lucrativo;
  // A UI exibe comissão e custo fixo em linhas separadas; o módulo soma os dois
  // em valorComissao, então o custo fixo é recuperado aqui para a exibição.
  const valorCustoFixo = preco > 0 ? custoFixoMercadoLivre(preco, MERCADOLIVRE_TAXAS.custoFixo) : 0;
  const valorComissao  = resultado.valorComissao - valorCustoFixo;

  const handleAddCategoria = () => {
    const nome = novaCategoriaNome.trim();
    const classico = parseNum(novaCategoriaClassico) / 100;
    const premium = parseNum(novaCategoriaPremium) / 100;
    if (!nome || classico <= 0 || premium <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }
    if (mlCategorias.some(c => c.nome.toLowerCase() === nome.toLowerCase())) {
      toast.error("Categoria já existe");
      return;
    }
    const nova: MLProduto = { nome, classicoPerc: classico, premiumPerc: premium };
    setMlCategorias([...mlCategorias, nova]);
    setProdutoNome(nome);
    setNovaCategoriaNome("");
    setNovaCategoriaClassico("");
    setNovaCategoriaPremium("");
    setShowAddCategoria(false);
    toast.success("Categoria adicionada!");
  };

  const handleDeleteCategoria = (nome: string) => {
    if (mlCategorias.length <= 1) {
      toast.error("Deve haver pelo menos uma categoria");
      return;
    }
    const novas = mlCategorias.filter(c => c.nome !== nome);
    setMlCategorias(novas);
    if (produtoNome === nome) setProdutoNome(novas[0]?.nome || "");
    toast.success("Categoria removida");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dialog adicionar categoria */}
      <Dialog open={showAddCategoria} onOpenChange={setShowAddCategoria}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Nome da Categoria</Label>
              <Input
                placeholder="Ex: Eletrônicos"
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Comissão Clássico (%)</Label>
              <Input
                type="number"
                placeholder="Ex: 11.5"
                value={novaCategoriaClassico}
                onChange={(e) => setNovaCategoriaClassico(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Comissão Premium (%)</Label>
              <Input
                type="number"
                placeholder="Ex: 16.5"
                value={novaCategoriaPremium}
                onChange={(e) => setNovaCategoriaPremium(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoria(false)}>Cancelar</Button>
            <Button onClick={handleAddCategoria}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entradas */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Dados do Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Nome do produto */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Nome do Produto</Label>
            <Input
              type="text"
              placeholder="Ex: Protetor de tomada"
              value={nomeProduto}
              onChange={(e) => setNomeProduto(e.target.value)}
            />
          </div>

          {/* Categoria ML */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground font-medium">Categoria</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowAddCategoria(true)}
              >
                <Plus className="w-3 h-3" />
                Adicionar Categoria
              </Button>
            </div>
            <select
              value={produtoNome}
              onChange={(e) => setProdutoNome(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {mlCategorias.map((p) => (
                <option key={p.nome} value={p.nome}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Tipo de anúncio */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Tipo de Anúncio</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipoAnuncio("classico")}
                className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                  tipoAnuncio === "classico"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-muted/30"
                }`}
              >
                Clássico (C)
                <span className="block text-xs mt-0.5 font-mono">
                  {((produto?.classicoPerc ?? 0) * 100).toFixed(1)}%
                </span>
              </button>
              <button
                onClick={() => setTipoAnuncio("premium")}
                className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                  tipoAnuncio === "premium"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:bg-muted/30"
                }`}
              >
                Premium (P)
                <span className="block text-xs mt-0.5 font-mono">
                  {((produto?.premiumPerc ?? 0) * 100).toFixed(1)}%
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Preço de Venda (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          <MargemSlider
            platform="mercadolivre"
            inputs={inputs}
            onPreco={(p) => setPrecoVenda(String(p))}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Custo do Produto (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={custoProduto}
              onChange={(e) => setCustoProduto(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Imposto (%)</Label>
            <Input
              type="number"
              placeholder="0"
              value={imposto}
              onChange={(e) => setImposto(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ex: Simples Nacional, MEI, etc.</p>
          </div>

          <Separator />

          {/* Frete opcional */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Nós oferecemos entrega</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Calcular frete por peso e preço</p>
            </div>
            <Switch checked={usarFrete} onCheckedChange={setUsarFrete} />
          </div>

          {usarFrete && (
            <div className="space-y-2">
              <Label className="text-foreground">Peso do Produto (kg)</Label>
              <Input
                type="number"
                placeholder="0,5"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                step="0.1"
              />
              {pesoNum > 0 && preco > 0 && (
                <p className="text-xs text-muted-foreground">
                  Faixa: <span className="font-medium text-foreground">{MERCADOLIVRE_TAXAS.pesos[pesoIdx(pesoNum, MERCADOLIVRE_TAXAS.pesos)].label}</span>
                  {" "}· Frete: <span className="font-medium text-primary">{formatCurrency(valorFrete)}</span>
                </p>
              )}
            </div>
          )}

          {/* Marketing */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Marketing (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Inclui custo de anúncios</p>
            </div>
            <Switch checked={usarMarketing} onCheckedChange={setUsarMarketing} />
          </div>

          {usarMarketing && (
            <div className="space-y-2">
              <Label className="text-foreground">Taxa de Marketing (%)</Label>
              <Input
                type="number"
                placeholder="0"
                value={marketing}
                onChange={(e) => setMarketing(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      <div className="space-y-4">
        {/* Comissão ativa */}
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Comissão Mercado Livre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">{produto?.nome ?? "Sem categoria"}</span>
                <Badge variant="secondary" className="font-mono">
                  {tipoAnuncio === "classico" ? "Clássico" : "Premium"} · {(comissaoPerc * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
                <p>{formatCurrency(preco)} × {(comissaoPerc * 100).toFixed(1)}% = <span className="font-semibold text-foreground">{formatCurrency(valorComissao)}</span></p>
                {valorCustoFixo > 0 && (
                  <p>+ Custo fixo = <span className="font-semibold text-foreground">{formatCurrency(valorCustoFixo)}</span>
                    {preco < 12.50 && <span className="text-muted-foreground"> (metade do preço)</span>}
                  </p>
                )}
                {usarFrete && valorFrete > 0 && (
                  <p>+ Frete ({MERCADOLIVRE_TAXAS.pesos[pesoIdx(pesoNum, MERCADOLIVRE_TAXAS.pesos)].label}) = <span className="font-semibold text-foreground">{formatCurrency(valorFrete)}</span></p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Breakdown */}
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="text-foreground font-medium">{formatCurrency(preco)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">− Comissão ML ({(comissaoPerc * 100).toFixed(1)}%)</span>
                <span className="text-destructive font-medium">−{formatCurrency(valorComissao)}</span>
              </div>
              {valorCustoFixo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Custo Fixo{preco < 12.50 ? " (50% do preço)" : ""}</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorCustoFixo)}</span>
                </div>
              )}
              {usarFrete && valorFrete > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Frete</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorFrete)}</span>
                </div>
              )}
              {valorImposto > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Imposto ({impostoPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorImposto)}</span>
                </div>
              )}
              {usarMarketing && valorMarketing > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Marketing ({marketingPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorMarketing)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">= Receita Líquida</span>
                <span className="text-foreground">{formatCurrency(receitaLiquida)}</span>
              </div>
              {custo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Custo do Produto</span>
                  <span className="text-destructive font-medium">−{formatCurrency(custo)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resultado final */}
        {preco > 0 && (
          <Card className={`border-2 ${isLucrativo ? "border-success bg-success/5" : "border-destructive bg-destructive/5"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lucro Estimado</p>
                  <p className={`text-3xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>
                    {formatCurrency(lucro)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Margem</p>
                  <p className={`text-2xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>
                    {margemLucro.toFixed(1)}%
                  </p>
                </div>
              </div>
              {!isLucrativo && (
                <p className="text-sm text-destructive mt-3 font-medium">⚠️ Este preço não cobre os custos. Revise o valor de venda.</p>
              )}
              {isLucrativo && (
                <p className="text-sm text-success mt-3 font-medium">✓ Produto rentável neste preço.</p>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nomeProduto || <span className="text-muted-foreground italic text-xs">Sem nome definido</span>}</p>
                <p className="text-xs text-muted-foreground">
                  Margem: <span className={isLucrativo ? "text-success font-medium" : "text-destructive font-medium"}>{margemLucro.toFixed(1)}%</span>
                  {" · "}{formatCurrency(lucro)}
                </p>
              </div>
              <SalvarProdutoDialog
                platform="Mercado Livre"
                inputs={inputs}
                resultado={resultado}
                nomeInicial={nomeProduto}
              />
            </CardContent>
          </Card>
        )}

        {preco === 0 && (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="text-center py-16">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Selecione o produto e insira o preço para calcular</p>
            </CardContent>
          </Card>
        )}

        {/* Tabela de comissões por produto */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Comissões por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Categoria</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Clássico</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Premium</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {mlCategorias.map((p) => {
                  const ativa = p.nome === produtoNome;
                  return (
                    <tr
                      key={p.nome}
                      onClick={() => setProdutoNome(p.nome)}
                      className={`border-b border-border last:border-0 cursor-pointer transition-colors ${ativa ? "bg-primary/10" : "hover:bg-muted/30"}`}
                    >
                      <td className={`px-4 py-2.5 ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>
                        {p.nome}
                      </td>
                      <td className={`px-4 py-2.5 text-center font-mono ${ativa && tipoAnuncio === "classico" ? "text-primary font-semibold" : "text-foreground"}`}>
                        {(p.classicoPerc * 100).toFixed(1)}%
                      </td>
                      <td className={`px-4 py-2.5 text-center font-mono ${ativa && tipoAnuncio === "premium" ? "text-primary font-semibold" : "text-foreground"}`}>
                        {(p.premiumPerc * 100).toFixed(1)}%
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategoria(p.nome); }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="Remover categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Tabela de frete (colapsável) */}
        {usarFrete && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Tabela de Frete ML (por peso × preço)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left px-2 py-1.5 text-muted-foreground font-medium whitespace-nowrap">Peso</th>
                      {ML_FAIXA_PRECO_LABELS.map((l, i) => (
                        <th key={i} className="text-center px-2 py-1.5 text-muted-foreground font-medium whitespace-nowrap">{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MERCADOLIVRE_TAXAS.pesos.map((p, pi) => {
                      const pesoAtivo = pesoNum > 0 && pesoIdx(pesoNum, MERCADOLIVRE_TAXAS.pesos) === pi;
                      const precoIdx = preco > 0 ? faixaPrecoIdx(preco, MERCADOLIVRE_TAXAS.faixasPreco) : -1;
                      return (
                        <tr key={pi} className={`border-b border-border last:border-0 ${pesoAtivo ? "bg-primary/5" : ""}`}>
                          <td className={`px-2 py-1.5 whitespace-nowrap ${pesoAtivo ? "text-primary font-semibold" : "text-foreground"}`}>
                            {p.label}
                          </td>
                          {MERCADOLIVRE_TAXAS.freteTabela[pi].map((val, fi) => {
                            const celAtiva = pesoAtivo && fi === precoIdx;
                            return (
                              <td key={fi} className={`px-2 py-1.5 text-center font-mono ${celAtiva ? "text-primary font-bold bg-primary/10 rounded" : "text-muted-foreground"}`}>
                                R${val.toFixed(2).replace(".", ",")}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
// ─── Calculadora TikTok Shop ──────────────────────────────────────────────────
// Novas taxas vigentes a partir de 15/07/2026:
// - Preço < R$50: comissão 10% + taxa fixa R$4,00
// - Preço ≥ R$50: comissão 6%  + taxa fixa R$6,00
const TikTokCalculadora = () => {
  const [nomeProduto, setNomeProduto]       = usePersistedState("calc_tiktok_nome", "");
  const [precoVenda, setPrecoVenda]         = usePersistedState("calc_tiktok_preco", "");
  const [custoProduto, setCustoProduto]     = usePersistedState("calc_tiktok_custo", "");
  const [imposto, setImposto]               = usePersistedState("calc_tiktok_imposto", "");
  const [marketing, setMarketing]           = usePersistedState("calc_tiktok_marketing", "");
  const [usarMarketing, setUsarMarketing]   = usePersistedState("calc_tiktok_usarMkt", false);
  const [incentivoComissao, setIncentivoComissao] = usePersistedState("calc_tiktok_incentivo", false);
  const [usarFreteGratis, setUsarFreteGratis] = usePersistedState("calc_tiktok_fretegratis", false);

  const preco          = parseNum(precoVenda);
  const custo          = parseNum(custoProduto);
  const impostoPerc    = parseNum(imposto);
  const marketingPerc  = parseNum(marketing);

  const faixaTk = faixaTiktok(preco);
  const TIKTOK_COMISSAO = faixaTk.comissao;
  const TIKTOK_TAXA_FIXA = faixaTk.taxaFixa;
  const comissaoPerc   = incentivoComissao ? 0 : TIKTOK_COMISSAO;
  const freteGratisPerc = usarFreteGratis ? TIKTOK_FRETE_GRATIS_PERCENTUAL : 0;
  const valorComissao  = preco > 0 ? preco * comissaoPerc : 0;
  const valorFreteGratis = preco > 0 ? preco * freteGratisPerc : 0;
  const valorTaxaFixa  = preco > 0 ? TIKTOK_TAXA_FIXA : 0;

  const inputs = {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent: impostoPerc,
    marketingPercent: usarMarketing ? marketingPerc : 0,
    freteGratis: usarFreteGratis,
    incentivoComissao,
  };
  const resultado = calcularTikTok(inputs);
  const { valorImposto, valorMarketing, receitaLiquida, lucro } = resultado;
  const margemLucro = resultado.margemPercent;
  const isLucrativo = resultado.lucrativo;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Dados do Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Nome do Produto</Label>
            <Input type="text" placeholder="Ex: Protetor de tomada" value={nomeProduto} onChange={(e) => setNomeProduto(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Preço de Venda (R$)</Label>
            <Input type="number" placeholder="0,00" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} className="text-lg font-semibold" />
          </div>

          <MargemSlider
            platform="tiktok"
            inputs={inputs}
            onPreco={(p) => setPrecoVenda(String(p))}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Custo do Produto (R$)</Label>
            <Input type="number" placeholder="0,00" value={custoProduto} onChange={(e) => setCustoProduto(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Imposto (%)</Label>
            <Input type="number" placeholder="0" value={imposto} onChange={(e) => setImposto(e.target.value)} />
            <p className="text-xs text-muted-foreground">Ex: Simples Nacional, MEI, etc.</p>
          </div>

          <Separator />

          {/* Incentivo de Comissão */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Incentivo de Comissão</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {incentivoComissao ? "Comissão zerada (0%)" : "Ative se estiver no Programa de Incentivo"}
              </p>
            </div>
            <Switch checked={incentivoComissao} onCheckedChange={setIncentivoComissao} />
          </div>

          {/* Frete Grátis */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Frete Grátis</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {usarFreteGratis ? "Taxa adicional de 6% ativa" : "Ative se utilizar frete grátis (+6%)"}
              </p>
            </div>
            <Switch checked={usarFreteGratis} onCheckedChange={setUsarFreteGratis} />
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Marketing (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Inclui custo de anúncios</p>
            </div>
            <Switch checked={usarMarketing} onCheckedChange={setUsarMarketing} />
          </div>

          {usarMarketing && (
            <div className="space-y-2">
              <Label className="text-foreground">Taxa de Marketing (%)</Label>
              <Input type="number" placeholder="0" value={marketing} onChange={(e) => setMarketing(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Comissão TikTok Shop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">Comissão</span>
                <Badge variant="secondary" className="font-mono">
                  {incentivoComissao ? "0% (incentivo)" : `${(TIKTOK_COMISSAO * 100).toFixed(0)}%`}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">Taxa fixa por item</span>
                <Badge variant="secondary" className="font-mono">{formatCurrency(TIKTOK_TAXA_FIXA)}</Badge>
              </div>

              {usarFreteGratis && (
                <div className="flex items-center justify-between">
                  <span className="text-foreground text-sm">Taxa Frete Grátis</span>
                  <Badge className="bg-primary/20 text-primary font-mono border-0">+6%</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="text-foreground font-medium">{formatCurrency(preco)}</span>
              </div>
              {valorComissao > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Comissão ({(TIKTOK_COMISSAO * 100).toFixed(0)}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorComissao)}</span>
                </div>
              )}

              {incentivoComissao && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Comissão (incentivo)</span>
                  <span className="text-success font-medium">R$0,00</span>
                </div>
              )}
              {usarFreteGratis && valorFreteGratis > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Frete Grátis (6%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorFreteGratis)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">− Taxa fixa por item</span>
                <span className="text-destructive font-medium">−{formatCurrency(valorTaxaFixa)}</span>
              </div>
              {valorImposto > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Imposto ({impostoPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorImposto)}</span>
                </div>
              )}
              {usarMarketing && valorMarketing > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Marketing ({marketingPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorMarketing)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">= Receita Líquida</span>
                <span className="text-foreground">{formatCurrency(receitaLiquida)}</span>
              </div>
              {custo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Custo do Produto</span>
                  <span className="text-destructive font-medium">−{formatCurrency(custo)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className={`border-2 ${isLucrativo ? "border-success bg-success/5" : "border-destructive bg-destructive/5"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lucro Estimado</p>
                  <p className={`text-3xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>{formatCurrency(lucro)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Margem</p>
                  <p className={`text-2xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>{margemLucro.toFixed(1)}%</p>
                </div>
              </div>
              {!isLucrativo && <p className="text-sm text-destructive mt-3 font-medium">⚠️ Este preço não cobre os custos. Revise o valor de venda.</p>}
              {isLucrativo && <p className="text-sm text-success mt-3 font-medium">✓ Produto rentável neste preço.</p>}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nomeProduto || <span className="text-muted-foreground italic text-xs">Sem nome definido</span>}</p>
                <p className="text-xs text-muted-foreground">
                  Margem: <span className={isLucrativo ? "text-success font-medium" : "text-destructive font-medium"}>{margemLucro.toFixed(1)}%</span>
                  {" · "}{formatCurrency(lucro)}
                </p>
              </div>
              <SalvarProdutoDialog
                platform="TikTok Shop"
                inputs={inputs}
                resultado={resultado}
                nomeInicial={nomeProduto}
              />
            </CardContent>
          </Card>
        )}

        {preco === 0 && (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="text-center py-16">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Insira o preço de venda para calcular</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Sobre as Taxas TikTok Shop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">💰 Comissão</p>
              <p>Novas tarifas vigentes a partir de <span className="font-semibold text-foreground">15/07/2026</span>:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Preço &lt; R$50,00 → comissão <span className="font-semibold text-foreground">10%</span></li>
                <li>Preço ≥ R$50,00 → comissão <span className="font-semibold text-foreground">6%</span></li>
              </ul>
              <p>Com o <span className="font-semibold text-primary">incentivo de comissão</span> ativo, a comissão é <span className="font-semibold text-success">0%</span>.</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">🏷️ Taxa fixa por item</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Preço &lt; R$50,00 → <span className="font-semibold text-foreground">R$4,00</span></li>
                <li>Preço ≥ R$50,00 → <span className="font-semibold text-foreground">R$6,00</span></li>
              </ul>
            </div>

            <Separator />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">🚚 Frete Grátis</p>
              <p>Ao utilizar o frete grátis, é cobrada uma taxa adicional de <span className="font-semibold text-foreground">6%</span> sobre o preço de venda.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


// ─── Calculadora Shein ─────────────────────────────────────────────────────────
const SheinCalculadora = () => {
  const [nomeProduto, setNomeProduto]       = usePersistedState("calc_shein_nome", "");
  const [precoVenda, setPrecoVenda]         = usePersistedState("calc_shein_preco", "");
  const [custoProduto, setCustoProduto]     = usePersistedState("calc_shein_custo", "");
  const [imposto, setImposto]               = usePersistedState("calc_shein_imposto", "");
  const [marketing, setMarketing]           = usePersistedState("calc_shein_marketing", "");
  const [usarMarketing, setUsarMarketing]   = usePersistedState("calc_shein_usarMkt", false);
  const [pesoGramas, setPesoGramas]         = usePersistedState("calc_shein_peso", "");
  const [comprimento, setComprimento]       = usePersistedState("calc_shein_comp", "");
  const [largura, setLargura]               = usePersistedState("calc_shein_larg", "");
  const [altura, setAltura]                 = usePersistedState("calc_shein_alt", "");

  const preco          = parseNum(precoVenda);
  const custo          = parseNum(custoProduto);
  const impostoPerc    = parseNum(imposto);
  const marketingPerc  = parseNum(marketing);
  const pesoKg         = parseNum(pesoGramas) / 1000;
  const comp           = parseNum(comprimento);
  const larg           = parseNum(largura);
  const alt            = parseNum(altura);

  const freteInfo      = calcularFreteShein(pesoKg, comp, larg, alt);

  const inputs = {
    precoVenda: preco,
    custoProduto: custo,
    impostoPercent: impostoPerc,
    marketingPercent: usarMarketing ? marketingPerc : 0,
    pesoKg,
    comprimento: comp,
    largura: larg,
    altura: alt,
  };
  const resultado = calcularShein(inputs);
  const { valorComissao, valorImposto, valorMarketing, valorFrete, receitaLiquida, lucro } = resultado;
  const margemLucro = resultado.margemPercent;
  const isLucrativo = resultado.lucrativo;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Dados do Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Nome do Produto</Label>
            <Input type="text" placeholder="Ex: Camiseta básica" value={nomeProduto} onChange={(e) => setNomeProduto(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Preço de Venda (R$)</Label>
            <Input type="number" placeholder="0,00" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} className="text-lg font-semibold" />
          </div>

          <MargemSlider
            platform="shein"
            inputs={inputs}
            onPreco={(p) => setPrecoVenda(String(p))}
          />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Custo do Produto (R$)</Label>
            <Input type="number" placeholder="0,00" value={custoProduto} onChange={(e) => setCustoProduto(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Imposto (%)</Label>
            <Input type="number" placeholder="0" value={imposto} onChange={(e) => setImposto(e.target.value)} />
            <p className="text-xs text-muted-foreground">Ex: Simples Nacional, MEI, etc.</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Peso (gramas)</Label>
            <Input type="number" placeholder="Ex: 500" value={pesoGramas} onChange={(e) => setPesoGramas(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-foreground text-xs">Comprimento (cm)</Label>
              <Input type="number" placeholder="0" value={comprimento} onChange={(e) => setComprimento(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground text-xs">Largura (cm)</Label>
              <Input type="number" placeholder="0" value={largura} onChange={(e) => setLargura(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground text-xs">Altura (cm)</Label>
              <Input type="number" placeholder="0" value={altura} onChange={(e) => setAltura(e.target.value)} />
            </div>
          </div>

          {valorFrete > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso real</span>
                <span className="text-foreground font-mono">{(pesoKg * 1000).toFixed(0)}g ({pesoKg.toFixed(3)}kg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso cúbico</span>
                <span className="text-foreground font-mono">{(freteInfo.pesoCubico * 1000).toFixed(0)}g ({freteInfo.pesoCubico.toFixed(3)}kg)</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Peso considerado</span>
                <span className="text-primary font-mono">{(freteInfo.pesoUsado * 1000).toFixed(0)}g</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Frete Shein</span>
                <span className="text-primary font-mono">{formatCurrency(valorFrete)}</span>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Marketing (opcional)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Inclui custo de anúncios</p>
            </div>
            <Switch checked={usarMarketing} onCheckedChange={setUsarMarketing} />
          </div>

          {usarMarketing && (
            <div className="space-y-2">
              <Label className="text-foreground">Taxa de Marketing (%)</Label>
              <Input type="number" placeholder="0" value={marketing} onChange={(e) => setMarketing(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Taxas Shein
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">Comissão</span>
                <Badge variant="secondary" className="font-mono">16%</Badge>
              </div>
              {valorFrete > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-foreground text-sm">Frete</span>
                  <Badge variant="secondary" className="font-mono">{formatCurrency(valorFrete)}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Detalhamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="text-foreground font-medium">{formatCurrency(preco)}</span>
              </div>
              {valorComissao > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Comissão (16%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorComissao)}</span>
                </div>
              )}
              {valorFrete > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Frete Shein</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorFrete)}</span>
                </div>
              )}
              {valorImposto > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Imposto ({impostoPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorImposto)}</span>
                </div>
              )}
              {usarMarketing && valorMarketing > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Marketing ({marketingPerc}%)</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorMarketing)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-foreground">= Receita Líquida</span>
                <span className="text-foreground">{formatCurrency(receitaLiquida)}</span>
              </div>
              {custo > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Custo do Produto</span>
                  <span className="text-destructive font-medium">−{formatCurrency(custo)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className={`border-2 ${isLucrativo ? "border-success bg-success/5" : "border-destructive bg-destructive/5"}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lucro Estimado</p>
                  <p className={`text-3xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>{formatCurrency(lucro)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Margem</p>
                  <p className={`text-2xl font-bold ${isLucrativo ? "text-success" : "text-destructive"}`}>{margemLucro.toFixed(1)}%</p>
                </div>
              </div>
              {!isLucrativo && <p className="text-sm text-destructive mt-3 font-medium">⚠️ Este preço não cobre os custos. Revise o valor de venda.</p>}
              {isLucrativo && <p className="text-sm text-success mt-3 font-medium">✓ Produto rentável neste preço.</p>}
            </CardContent>
          </Card>
        )}

        {preco > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{nomeProduto || <span className="text-muted-foreground italic text-xs">Sem nome definido</span>}</p>
                <p className="text-xs text-muted-foreground">
                  Margem: <span className={isLucrativo ? "text-success font-medium" : "text-destructive font-medium"}>{margemLucro.toFixed(1)}%</span>
                  {" · "}{formatCurrency(lucro)}
                </p>
              </div>
              <SalvarProdutoDialog
                platform="Shein"
                inputs={inputs}
                resultado={resultado}
                nomeInicial={nomeProduto}
              />
            </CardContent>
          </Card>
        )}

        {preco === 0 && (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="text-center py-16">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Insira o preço de venda para calcular</p>
            </CardContent>
          </Card>
        )}

        {/* Tabela de frete */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tabela de Frete Shein
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Faixa de Peso</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Frete</th>
                </tr>
              </thead>
              <tbody>
                {SHEIN_TAXAS.frete.map((f, idx) => {
                  const ativa = freteInfo.faixa === f && valorFrete > 0;
                  return (
                    <tr key={idx} className={`border-b border-border last:border-0 transition-colors ${ativa ? "bg-primary/10" : "hover:bg-muted/30"}`}>
                      <td className={`px-4 py-2.5 ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>{f.label}</td>
                      <td className={`px-4 py-2.5 text-center font-mono ${ativa ? "text-primary font-semibold" : "text-foreground"}`}>{formatCurrency(f.valor)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground px-4 py-2">Peso cúbico: (C × L × A) / 6000. Considera-se o maior entre peso real e cúbico.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


const PlaceholderPlatform = ({ nome }: { nome: string }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <Calculator className="w-16 h-16 text-muted-foreground/40 mb-4" />
    <h3 className="text-lg font-semibold text-foreground mb-2">Calculadora {nome}</h3>
    <p className="text-muted-foreground max-w-sm">
      Em breve! A calculadora para {nome} será implementada aqui.
    </p>
    <Badge variant="outline" className="mt-4">Em desenvolvimento</Badge>
  </div>
);

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <Sun className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        className="scale-90 md:scale-100"
      />
      <Moon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
    </div>
  );
};

// ─── Página Principal ──────────────────────────────────────────────────────────
const Calculadora = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("shopee");
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout ao validar sessão")), 8000),
          ),
        ]);

        const { data: { session } } = sessionResult;

        if (!session) {
          navigate("/auth");
          return;
        }

        const purchasesResult = await Promise.race([
          supabase
            .from("purchases")
            .select("id, plan_type, expires_at")
            .eq("status", "approved")
            .eq("user_email", session.user.email ?? "")
            .order("created_at", { ascending: false }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout ao verificar compras")), 8000),
          ),
        ]);

        const { data: purchases, error } = purchasesResult;

        if (error) {
          console.error("Erro ao verificar compras:", error);
          toast.error("Erro ao verificar acesso. Tente novamente.");
          navigate("/auth");
          return;
        }

        if (!purchases || purchases.length === 0) {
          toast.error("Você não possui acesso. Adquira a calculadora primeiro.");
          supabase.auth.signOut();
          navigate("/");
          return;
        }

        const now = new Date();
        const hasActive = purchases.some((p: any) => {
          if (p.plan_type === "lifetime") return true;
          if (p.expires_at && new Date(p.expires_at) > now) return true;
          return false;
        });

        if (!hasActive) {
          toast.error("Seu plano expirou. Renove para continuar usando.");
          supabase.auth.signOut();
          navigate("/");
          return;
        }

        setAuthorized(true);
        if (session.user.email === "ryanzinho.gran@gmail.com") {
          setIsAdminUser(true);
        }
      } catch (err) {
        console.error("Erro inesperado ao verificar acesso:", err);
        toast.error("Não foi possível carregar seu acesso. Tente novamente.");
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading && !authorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1>
                  <img src={logoHorizontal} alt="Vetrex" className="h-8 w-auto hidden dark:block" />
                  <img src={logoHorizontalLight} alt="Vetrex" className="h-8 w-auto block dark:hidden" />
                </h1>
                <p className="text-xs text-muted-foreground mt-1">Simule margens por plataforma</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="md:hidden">
                <UserProfileDialog />
              </div>
              {isAdminUser && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin-panel")} className="gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/produtos-salvos")} className="gap-2 md:hidden">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 md:hidden">
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform} orientation="vertical" className="flex flex-col md:flex-row gap-6">
          {/* Mobile: Select dropdown */}
          <div className="md:hidden">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-full border-border bg-card">
                <SelectValue placeholder="Selecione a plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shopee"><div className="flex items-center gap-2"><MarketplaceLogo platform="shopee" className="h-4 w-auto max-w-12" /> Shopee</div></SelectItem>
                <SelectItem value="mercadolivre"><div className="flex items-center gap-2"><MarketplaceLogo platform="mercadolivre" className="h-4 w-auto max-w-12" /> Mercado Livre</div></SelectItem>
                <SelectItem value="amazon"><div className="flex items-center gap-2"><MarketplaceLogo platform="amazon" className="h-4 w-auto max-w-12" /> Amazon</div></SelectItem>
                <SelectItem value="magalu"><div className="flex items-center gap-2"><MarketplaceLogo platform="magalu" className="h-4 w-auto max-w-12" /> Magalu</div></SelectItem>
                <SelectItem value="tiktok"><div className="flex items-center gap-2"><MarketplaceLogo platform="tiktok" className="h-4 w-auto max-w-12" /> TikTok</div></SelectItem>
                <SelectItem value="shein"><div className="flex items-center gap-2"><MarketplaceLogo platform="shein" className="h-4 w-auto max-w-12" /> Shein</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Sidebar vertical */}
          <div className="hidden md:flex md:flex-col md:justify-between gap-1 md:w-48 md:min-w-48 md:sticky md:top-6 md:self-start md:h-[calc(100vh-6rem)]">
            <TabsList className="flex flex-col gap-1 h-auto bg-transparent p-0 w-full">
              <TabsTrigger value="shopee" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><MarketplaceLogo platform="shopee" className="h-4 w-auto max-w-12 mr-2" /> Shopee</TabsTrigger>
              <TabsTrigger value="mercadolivre" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><MarketplaceLogo platform="mercadolivre" className="h-4 w-auto max-w-12 mr-2" /> Mercado Livre</TabsTrigger>
              <TabsTrigger value="amazon" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><MarketplaceLogo platform="amazon" className="h-4 w-auto max-w-12 mr-2" /> Amazon</TabsTrigger>
              <TabsTrigger value="magalu" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><MarketplaceLogo platform="magalu" className="h-4 w-auto max-w-12 mr-2" /> Magalu</TabsTrigger>
              <TabsTrigger value="tiktok" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><MarketplaceLogo platform="tiktok" className="h-4 w-auto max-w-12 mr-2" /> TikTok</TabsTrigger>
              <TabsTrigger value="shein" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><MarketplaceLogo platform="shein" className="h-4 w-auto max-w-12 mr-2" /> Shein</TabsTrigger>
            </TabsList>

            {/* Perfil e Sair fixo no rodapé */}
            <div className="flex flex-col gap-1 pt-4 border-t border-border mt-auto">
              <Button variant="outline" size="sm" onClick={() => navigate("/produtos-salvos")} className="gap-2 w-full justify-start">
                <BookmarkPlus className="w-4 h-4" />
                Produtos Salvos
              </Button>
              {isAdminUser && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin-panel")} className="gap-2 w-full justify-start">
                  <Shield className="w-4 h-4" />
                  Painel Admin
                </Button>
              )}
              <UserProfileDialog />
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 w-full justify-start">
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <TabsContent value="shopee" className="mt-0">
              <ShopeeCalculadora />
            </TabsContent>
            <TabsContent value="mercadolivre" className="mt-0">
              <MercadoLivreCalculadora />
            </TabsContent>
            <TabsContent value="amazon" className="mt-0">
              <AmazonCalculadora />
            </TabsContent>
            <TabsContent value="magalu" className="mt-0">
              <MagaluCalculadora />
            </TabsContent>
            <TabsContent value="tiktok" className="mt-0">
              <TikTokCalculadora />
            </TabsContent>
            <TabsContent value="shein" className="mt-0">
              <SheinCalculadora />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Calculadora;
