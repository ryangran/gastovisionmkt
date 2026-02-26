import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, ShoppingBag, LogOut } from "lucide-react";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Tabela de comissões Shopee (baseada na imagem enviada)
type ShopeeComissao = {
  max: number;
  percentual: number;
  fixo: number;
  subsidioPix: number;
};

const SHOPEE_COMISSOES: ShopeeComissao[] = [
  { max: 79.99,    percentual: 0.20, fixo: 4,  subsidioPix: 0    },
  { max: 99.99,    percentual: 0.14, fixo: 16, subsidioPix: 0.05 },
  { max: 199.99,   percentual: 0.14, fixo: 20, subsidioPix: 0.05 },
  { max: 499.99,   percentual: 0.14, fixo: 26, subsidioPix: 0.05 },
  { max: Infinity, percentual: 0.14, fixo: 26, subsidioPix: 0.08 },
];

function getShopeeComissao(preco: number): ShopeeComissao {
  return SHOPEE_COMISSOES.find((c) => preco <= c.max) ?? SHOPEE_COMISSOES[SHOPEE_COMISSOES.length - 1];
}

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

  const comissao = preco > 0 ? getShopeeComissao(preco) : null;

  const valorComissao  = comissao ? preco * comissao.percentual + comissao.fixo : 0;
  const valorImposto   = preco * (impostoPerc / 100);
  const valorMarketing = usarMarketing ? preco * (marketingPerc / 100) : 0;
  const subsidio       = comissao && usarSubsidioPix ? preco * comissao.subsidioPix : 0;

  const receitaLiquida = preco + subsidio - valorComissao - valorImposto - valorMarketing;
  const lucro          = receitaLiquida - custo;
  const margemLucro    = preco > 0 ? (lucro / preco) * 100 : 0;
  const isLucrativo    = lucro > 0;

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
                  {formatPercent(comissao.percentual)} + R${comissao.fixo}
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
                  { label: "Até R$79,99",         comissao: "20% + R$4",  pix: "—",  idx: 0 },
                  { label: "R$80 – R$99,99",       comissao: "14% + R$16", pix: "5%", idx: 1 },
                  { label: "R$100 – R$199,99",     comissao: "14% + R$20", pix: "5%", idx: 2 },
                  { label: "R$200 – R$499,99",     comissao: "14% + R$26", pix: "5%", idx: 3 },
                  { label: "Acima de R$500",       comissao: "14% + R$26", pix: "8%", idx: 4 },
                ].map((row) => {
                  const faixaAtiva = comissao && preco > 0 && SHOPEE_COMISSOES[row.idx] === comissao;
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
type AmazonCategoria = {
  nome: string;
  percentual?: number;           // taxa única
  tiered?: { ate: number; taxa: number; taxaExcedente: number }; // escalonada
  taxaFixa: number;              // valor fixo somado à comissão percentual
};

const AMAZON_CATEGORIAS: AmazonCategoria[] = [
  { nome: "Roupas e acessórios",                       percentual: 0.14, taxaFixa: 1 },
  { nome: "Sapatos e óculos escuros",                  percentual: 0.14, taxaFixa: 1 },
  { nome: "Bagagem, bolsas e acessórios de viagem",    percentual: 0.14, taxaFixa: 1 },
  { nome: "Relógios",                                  percentual: 0.13, taxaFixa: 1 },
  { nome: "Joias",                                     percentual: 0.14, taxaFixa: 1 },
  { nome: "Livros",                                    percentual: 0.15, taxaFixa: 1 },
  { nome: "TV, áudio e cinema em casa",                percentual: 0.10, taxaFixa: 1 },
  { nome: "Eletrônicos portáteis",                     percentual: 0.13, taxaFixa: 1 },
  { nome: "Celulares",                                 percentual: 0.11, taxaFixa: 1 },
  { nome: "Câmera e fotografia",                       percentual: 0.11, taxaFixa: 1 },
  { nome: "Acessórios para eletrônicos e para PC",     tiered: { ate: 100, taxa: 0.15, taxaExcedente: 0.10 }, taxaFixa: 1 },
  { nome: "Videogames e consoles",                     percentual: 0.11, taxaFixa: 1 },
  { nome: "Casa",                                      percentual: 0.12, taxaFixa: 1 },
  { nome: "Reforma de casa",                           percentual: 0.11, taxaFixa: 1 },
  { nome: "Cozinha",                                   percentual: 0.12, taxaFixa: 1 },
  { nome: "Computadores",                              percentual: 0.12, taxaFixa: 1 },
  { nome: "Papelaria e escritório",                    percentual: 0.13, taxaFixa: 1 },
  { nome: "Esportes, aventura e lazer",                percentual: 0.12, taxaFixa: 1 },
  { nome: "Eletrodomésticos de linha branca",          percentual: 0.11, taxaFixa: 1 },
  { nome: "Móveis",                                    tiered: { ate: 200, taxa: 0.15, taxaExcedente: 0.10 }, taxaFixa: 1 },
  { nome: "Brinquedos e jogos",                        percentual: 0.12, taxaFixa: 1 },
  { nome: "Produtos para bebês",                       percentual: 0.12, taxaFixa: 1 },
  { nome: "Saúde e cuidado pessoal",                   percentual: 0.12, taxaFixa: 1 },
  { nome: "Beleza",                                    percentual: 0.13, taxaFixa: 1 },
  { nome: "Produtos de beleza de luxo",                percentual: 0.14, taxaFixa: 1 },
  { nome: "Aparelhos para cuidados pessoais",          percentual: 0.12, taxaFixa: 1 },
  { nome: "Plantas e jardim",                          percentual: 0.12, taxaFixa: 1 },
  { nome: "Vídeo e DVD",                               percentual: 0.15, taxaFixa: 1 },
  { nome: "Música",                                    percentual: 0.15, taxaFixa: 1 },
  { nome: "Instrumentos musicais e acessórios",        percentual: 0.12, taxaFixa: 1 },
  { nome: "Peças e acessórios automotivos",            percentual: 0.12, taxaFixa: 1 },
  { nome: "Pneus e rodas",                             percentual: 0.10, taxaFixa: 1 },
  { nome: "Produtos para animais de estimação",        percentual: 0.12, taxaFixa: 1 },
  { nome: "Comidas e bebidas",                         percentual: 0.10, taxaFixa: 1 },
  { nome: "Bebidas alcoólicas",                        percentual: 0.11, taxaFixa: 1 },
  { nome: "Indústria e Ciência",                       percentual: 0.12, taxaFixa: 2 },
  { nome: "Outros",                                    percentual: 0.15, taxaFixa: 1 },
];

function calcularComissaoAmazon(preco: number, categoria: AmazonCategoria): number {
  let comissaoPercentual = 0;
  if (categoria.tiered) {
    const { ate, taxa, taxaExcedente } = categoria.tiered;
    if (preco <= ate) {
      comissaoPercentual = preco * taxa;
    } else {
      comissaoPercentual = ate * taxa + (preco - ate) * taxaExcedente;
    }
  } else if (categoria.percentual) {
    comissaoPercentual = preco * categoria.percentual;
  }
  // Comissão total = percentual + taxa fixa adicional
  return comissaoPercentual + categoria.taxaFixa;
}

function descricaoTaxa(categoria: AmazonCategoria): string {
  if (categoria.tiered) {
    return `${(categoria.tiered.taxa * 100).toFixed(0)}% até R$${categoria.tiered.ate} / ${(categoria.tiered.taxaExcedente * 100).toFixed(0)}% acima`;
  }
  return `${((categoria.percentual ?? 0) * 100).toFixed(0)}%`;
}

const AmazonCalculadora = () => {
  const [nomeProduto, setNomeProduto]         = usePersistedState("calc_amazon_nome", "");
  const [categoriaNome, setCategoriaNome]   = usePersistedState("calc_amazon_cat", AMAZON_CATEGORIAS[0].nome);
  const [precoVenda, setPrecoVenda]         = usePersistedState("calc_amazon_preco", "");
  const [custoProduto, setCustoProduto]     = usePersistedState("calc_amazon_custo", "");
  const [imposto, setImposto]               = usePersistedState("calc_amazon_imposto", "");
  const [marketing, setMarketing]           = usePersistedState("calc_amazon_marketing", "");
  const [usarMarketing, setUsarMarketing]   = usePersistedState("calc_amazon_usarMkt", false);

  const categoria      = AMAZON_CATEGORIAS.find((c) => c.nome === categoriaNome)!;
  const preco          = parseNum(precoVenda);
  const custo          = parseNum(custoProduto);
  const impostoPerc    = parseNum(imposto);
  const marketingPerc  = parseNum(marketing);

  const valorComissao  = preco > 0 ? calcularComissaoAmazon(preco, categoria) : 0;
  const valorImposto   = preco * (impostoPerc / 100);
  const valorMarketing = usarMarketing ? preco * (marketingPerc / 100) : 0;

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing;
  const lucro          = receitaLiquida - custo;
  const margemLucro    = preco > 0 ? (lucro / preco) * 100 : 0;
  const isLucrativo    = lucro > 0;

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
              {AMAZON_CATEGORIAS.map((c) => (
                <option key={c.nome} value={c.nome}>{c.nome}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Taxa: <span className="font-medium text-primary">{descricaoTaxa(categoria)}</span>
              {" "}· Taxa fixa: <span className="font-medium">+ {formatCurrency(categoria.taxaFixa)}</span>
            </p>
          </div>

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
                <Badge variant="secondary" className="font-mono">{descricaoTaxa(categoria)}</Badge>
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
                  {AMAZON_CATEGORIAS.map((cat) => {
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
                          {descricaoTaxa(cat)}
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
      </div>
    </div>
  );
};

// ─── Calculadora Magalu ───────────────────────────────────────────────────────
const MAGALU_COMISSAO = 0.18; // 18% fixo
const MAGALU_ENTREGA_FIXA = 5.00; // R$5 para pedidos >= R$10 com Magalu Entregas

const MagaluCalculadora = () => {
  const [nomeProduto, setNomeProduto]         = usePersistedState("calc_magalu_nome", "");
  const [precoVenda, setPrecoVenda]         = usePersistedState("calc_magalu_preco", "");
  const [custoProduto, setCustoProduto]     = usePersistedState("calc_magalu_custo", "");
  const [imposto, setImposto]               = usePersistedState("calc_magalu_imposto", "");
  const [marketing, setMarketing]           = usePersistedState("calc_magalu_marketing", "");
  const [usarMarketing, setUsarMarketing]   = usePersistedState("calc_magalu_usarMkt", false);
  const [usarMagaluEntregas, setUsarMagaluEntregas] = usePersistedState("calc_magalu_entregas", false);

  const preco          = parseNum(precoVenda);
  const custo          = parseNum(custoProduto);
  const impostoPerc    = parseNum(imposto);
  const marketingPerc  = parseNum(marketing);

  const valorComissao       = preco > 0 ? preco * MAGALU_COMISSAO : 0;
  const valorImposto        = preco * (impostoPerc / 100);
  const valorMarketing      = usarMarketing ? preco * (marketingPerc / 100) : 0;
  const valorEntrega        = usarMagaluEntregas && preco >= 10 ? MAGALU_ENTREGA_FIXA : 0;

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing - valorEntrega;
  const lucro          = receitaLiquida - custo;
  const margemLucro    = preco > 0 ? (lucro / preco) * 100 : 0;
  const isLucrativo    = lucro > 0;

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

          {/* Magalu Entregas */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground font-medium">Magalu Entregas</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                +R$5,00 fixo para pedidos ≥ R$10,00
              </p>
            </div>
            <Switch
              checked={usarMagaluEntregas}
              onCheckedChange={setUsarMagaluEntregas}
            />
          </div>

          {usarMagaluEntregas && preco > 0 && preco < 10 && (
            <p className="text-xs text-destructive">⚠️ Taxa de entrega não se aplica a pedidos abaixo de R$10,00</p>
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
                {usarMagaluEntregas && preco >= 10 && (
                  <p>+ Taxa Magalu Entregas = <span className="font-semibold text-foreground">{formatCurrency(MAGALU_ENTREGA_FIXA)}</span></p>
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
              {valorEntrega > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Magalu Entregas</span>
                  <span className="text-destructive font-medium">−{formatCurrency(valorEntrega)}</span>
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

        {preco === 0 && (
          <Card className="border-dashed border-border bg-card/50">
            <CardContent className="text-center py-16">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Insira o preço de venda para calcular</p>
            </CardContent>
          </Card>
        )}

        {/* Info Magalu Entregas */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Sobre a Comissão Magalu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Comissão base</span>
              <Badge variant="secondary" className="font-mono">18% sobre o preço</Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">🚚 Magalu Entregas</p>
              <p className="text-xs text-muted-foreground">
                Lojistas que utilizam Magalu Entregas: para pedidos vendidos com valores a partir de R$10,00 será cobrado um custo fixo de <span className="font-semibold text-foreground">R$5,00</span>, além da remuneração percentual da categoria.
              </p>
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

const ML_PRODUTOS: MLProduto[] = [
  { nome: "Brinquedos",            classicoPerc: 0.115, premiumPerc: 0.13 },
  { nome: "Protetores Eletrônicos", classicoPerc: 0.13,  premiumPerc: 0.18 },
  { nome: "Terra Lux",             classicoPerc: 0.115, premiumPerc: 0.165 },
  { nome: "Filtro de Linha",       classicoPerc: 0.115, premiumPerc: 0.165 },
  { nome: "Módulo Isolador",       classicoPerc: 0.13,  premiumPerc: 0.18 },
];

// Faixas de peso (kg) — limites superiores
const ML_PESOS = [
  { label: "Até 0,3 kg",       min: 0,    max: 0.3  },
  { label: "De 0,3 a 0,5 kg",  min: 0.3,  max: 0.5  },
  { label: "De 0,5 a 1 kg",    min: 0.5,  max: 1    },
  { label: "De 1 a 1,5 kg",    min: 1,    max: 1.5  },
  { label: "De 1,5 a 2 kg",    min: 1.5,  max: 2    },
  { label: "De 2 a 3 kg",      min: 2,    max: 3    },
  { label: "De 3 a 4 kg",      min: 3,    max: 4    },
  { label: "De 4 a 5 kg",      min: 4,    max: 5    },
  { label: "De 5 a 6 kg",      min: 5,    max: 6    },
  { label: "De 6 a 7 kg",      min: 6,    max: 7    },
  { label: "De 7 a 8 kg",      min: 7,    max: 8    },
  { label: "De 8 a 9 kg",      min: 8,    max: 9    },
  { label: "De 9 a 11 kg",     min: 9,    max: 11   },
  { label: "De 11 a 13 kg",    min: 11,   max: 13   },
  { label: "De 13 a 15 kg",    min: 13,   max: 15   },
  { label: "De 15 a 17 kg",    min: 15,   max: 17   },
  { label: "De 17 a 20 kg",    min: 17,   max: 20   },
];

// Tabela de frete por [pesoIdx][faixaPrecoIdx]
// Faixas de preço: 0-18.99 | 19-48.99 | 49-78.99 | 79-99.99 | 100-119.99 | 120-149.99 | 150-199.99 | 200+
const ML_FRETE_TABELA: number[][] = [
  [5.65, 6.55, 7.75, 12.35, 14.35, 16.45, 18.45, 20.95],
  [5.95, 6.65, 7.85, 13.25, 15.45, 17.65, 19.85, 22.55],
  [6.05, 6.75, 7.95, 13.85, 16.15, 18.45, 20.75, 23.65],
  [6.15, 6.85, 8.05, 14.15, 16.45, 18.85, 21.15, 24.65],
  [6.25, 6.95, 8.15, 14.45, 16.85, 19.25, 21.65, 24.65],
  [6.35, 7.95, 8.55, 15.75, 18.35, 21.05, 23.65, 26.25],
  [6.45, 8.15, 8.95, 17.05, 19.85, 22.65, 25.55, 28.35],
  [6.55, 8.35, 9.75, 18.45, 21.55, 24.65, 27.75, 30.75],
  [6.65, 8.55, 9.95, 25.45, 28.55, 32.65, 35.75, 39.75],
  [6.75, 8.75, 10.15, 27.05, 31.05, 36.05, 40.05, 44.05],
  [6.85, 8.95, 10.35, 28.85, 33.65, 38.45, 43.25, 48.05],
  [6.95, 9.15, 10.55, 29.65, 34.55, 39.55, 44.45, 49.35],
  [7.05, 9.55, 10.95, 41.25, 48.05, 54.95, 61.75, 68.65],
  [7.15, 9.95, 11.35, 42.15, 49.25, 56.25, 63.25, 70.25],
  [7.25, 10.15, 11.55, 45.05, 52.45, 59.95, 67.45, 74.95],
  [7.35, 10.35, 11.75, 48.55, 56.05, 63.55, 70.75, 78.65],
  [7.45, 10.55, 11.95, 54.75, 63.85, 72.95, 82.05, 91.15],
];

function getMLFaixaPrecoIdx(preco: number): number {
  if (preco <= 18.99) return 0;
  if (preco <= 48.99) return 1;
  if (preco <= 78.99) return 2;
  if (preco <= 99.99) return 3;
  if (preco <= 119.99) return 4;
  if (preco <= 149.99) return 5;
  if (preco <= 199.99) return 6;
  return 7;
}

function getMLPesoIdx(peso: number): number {
  for (let i = 0; i < ML_PESOS.length; i++) {
    if (peso <= ML_PESOS[i].max) return i;
  }
  return ML_PESOS.length - 1;
}

function getMLFrete(preco: number, peso: number): number {
  const pesoIdx = getMLPesoIdx(peso);
  const precoIdx = getMLFaixaPrecoIdx(preco);
  return ML_FRETE_TABELA[pesoIdx][precoIdx];
}

// Custo fixo ML por faixa de preço
function getMLCustoFixo(preco: number): number {
  if (preco < 12.50) return preco * 0.5; // metade do preço
  if (preco <= 29) return 6.25;
  if (preco <= 50) return 6.50;
  if (preco <= 79) return 6.75;
  return 0; // acima de R$79 não tem custo fixo
}

const ML_FAIXA_PRECO_LABELS = [
  "R$0–18,99", "R$19–48,99", "R$49–78,99", "R$79–99,99",
  "R$100–119,99", "R$120–149,99", "R$150–199,99", "A partir de R$200"
];

const MercadoLivreCalculadora = () => {
  const [nomeProduto, setNomeProduto] = usePersistedState("calc_ml_nome", "");
  const [produtoNome, setProdutoNome] = usePersistedState("calc_ml_produto", ML_PRODUTOS[0].nome);
  const [tipoAnuncio, setTipoAnuncio] = usePersistedState<"classico" | "premium">("calc_ml_tipo", "premium");
  const [precoVenda, setPrecoVenda]   = usePersistedState("calc_ml_preco", "");
  const [custoProduto, setCustoProduto] = usePersistedState("calc_ml_custo", "");
  const [imposto, setImposto]         = usePersistedState("calc_ml_imposto", "");
  const [marketing, setMarketing]     = usePersistedState("calc_ml_marketing", "");
  const [usarMarketing, setUsarMarketing] = usePersistedState("calc_ml_usarMkt", false);
  const [usarFrete, setUsarFrete]     = usePersistedState("calc_ml_usarFrete", false);
  const [peso, setPeso]               = usePersistedState("calc_ml_peso", "");

  const produto      = ML_PRODUTOS.find((p) => p.nome === produtoNome)!;
  const preco        = parseNum(precoVenda);
  const custo        = parseNum(custoProduto);
  const impostoPerc  = parseNum(imposto);
  const marketingPerc = parseNum(marketing);
  const pesoNum      = parseNum(peso);

  const comissaoPerc   = tipoAnuncio === "classico" ? produto.classicoPerc : produto.premiumPerc;
  const valorComissao  = preco > 0 ? preco * comissaoPerc : 0;
  const valorImposto   = preco * (impostoPerc / 100);
  const valorMarketing = usarMarketing ? preco * (marketingPerc / 100) : 0;
  const valorFrete     = usarFrete && preco > 0 && pesoNum > 0 ? getMLFrete(preco, pesoNum) : 0;
  const valorCustoFixo = preco > 0 ? getMLCustoFixo(preco) : 0;

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing - valorFrete - valorCustoFixo;
  const lucro          = receitaLiquida - custo;
  const margemLucro    = preco > 0 ? (lucro / preco) * 100 : 0;
  const isLucrativo    = lucro > 0;

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
            <Label className="text-foreground font-medium">Produto</Label>
            <select
              value={produtoNome}
              onChange={(e) => setProdutoNome(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ML_PRODUTOS.map((p) => (
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
                  {(produto.classicoPerc * 100).toFixed(1)}%
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
                  {(produto.premiumPerc * 100).toFixed(1)}%
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
                  Faixa: <span className="font-medium text-foreground">{ML_PESOS[getMLPesoIdx(pesoNum)].label}</span>
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
                <span className="text-foreground text-sm">{produto.nome}</span>
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
                  <p>+ Frete ({ML_PESOS[getMLPesoIdx(pesoNum)].label}) = <span className="font-semibold text-foreground">{formatCurrency(valorFrete)}</span></p>
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
              Comissões por Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Produto</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Clássico</th>
                  <th className="text-center px-4 py-2 text-muted-foreground font-medium">Premium</th>
                </tr>
              </thead>
              <tbody>
                {ML_PRODUTOS.map((p) => {
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
                    {ML_PESOS.map((p, pi) => {
                      const pesoAtivo = pesoNum > 0 && getMLPesoIdx(pesoNum) === pi;
                      const precoIdx = preco > 0 ? getMLFaixaPrecoIdx(preco) : -1;
                      return (
                        <tr key={pi} className={`border-b border-border last:border-0 ${pesoAtivo ? "bg-primary/5" : ""}`}>
                          <td className={`px-2 py-1.5 whitespace-nowrap ${pesoAtivo ? "text-primary font-semibold" : "text-foreground"}`}>
                            {p.label}
                          </td>
                          {ML_FRETE_TABELA[pi].map((val, fi) => {
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

// Placeholder para plataformas futuras
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

// ─── Página Principal ──────────────────────────────────────────────────────────
const Calculadora = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, plan_type, expires_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!purchases || purchases.length === 0) {
        toast.error("Você não possui acesso. Adquira a calculadora primeiro.");
        await supabase.auth.signOut();
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
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      setAuthorized(true);
      setLoading(false);
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
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Gasto Vision
                </h1>
                <p className="text-xs text-muted-foreground">Simule margens por plataforma</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UserProfileDialog />
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="shopee">
          <TabsList className="mb-6 flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="shopee">🛒 Shopee</TabsTrigger>
            <TabsTrigger value="mercadolivre">🛍️ Mercado Livre</TabsTrigger>
            <TabsTrigger value="amazon">📦 Amazon</TabsTrigger>
            <TabsTrigger value="magalu">🏪 Magalu</TabsTrigger>
            <TabsTrigger value="tiktok">🎵 TikTok</TabsTrigger>
          </TabsList>

          <TabsContent value="shopee">
            <ShopeeCalculadora />
          </TabsContent>
          <TabsContent value="mercadolivre">
            <MercadoLivreCalculadora />
          </TabsContent>
          <TabsContent value="amazon">
            <AmazonCalculadora />
          </TabsContent>
          <TabsContent value="magalu">
            <MagaluCalculadora />
          </TabsContent>
          <TabsContent value="tiktok">
            <PlaceholderPlatform nome="TikTok" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Calculadora;
