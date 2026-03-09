import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import shopeeLogo from "@/assets/shopee-logo.png";
import mercadolivreLogo from "@/assets/mercadolivre-logo.png";
import amazonLogo from "@/assets/amazon-logo.png";
import tiktokLogo from "@/assets/tiktok-logo.png";
import sheinLogo from "@/assets/shein-logo.png";
import magaluLogo from "@/assets/magalu-logo.png";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, ShoppingBag, LogOut, Plus, Trash2, Sun, Moon, Shield } from "lucide-react";
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

// Tabela de frete FBA Amazon (Preço Certo)
type AmazonFBAFaixa = {
  label: string;
  maxKg: number;
  ate50: number;
  acima50: number;
};

const AMAZON_FBA_TABELA: AmazonFBAFaixa[] = [
  { label: "0 a 100g",       maxKg: 0.1,  ate50: 14.05, acima50: 15.55 },
  { label: "100 a 200g",     maxKg: 0.2,  ate50: 14.55, acima50: 16.05 },
  { label: "200 a 300g",     maxKg: 0.3,  ate50: 15.05, acima50: 16.55 },
  { label: "300 a 400g",     maxKg: 0.4,  ate50: 15.65, acima50: 17.15 },
  { label: "400 a 500g",     maxKg: 0.5,  ate50: 16.25, acima50: 17.85 },
  { label: "500 a 750g",     maxKg: 0.75, ate50: 16.85, acima50: 18.55 },
  { label: "750g a 1kg",     maxKg: 1,    ate50: 17.45, acima50: 19.25 },
  { label: "1 a 1,5kg",      maxKg: 1.5,  ate50: 18.45, acima50: 20.35 },
  { label: "1,5 a 2kg",      maxKg: 2,    ate50: 19.45, acima50: 21.35 },
  { label: "2 a 3kg",        maxKg: 3,    ate50: 20.45, acima50: 22.35 },
  { label: "3 a 4kg",        maxKg: 4,    ate50: 21.45, acima50: 23.35 },
  { label: "4 a 5kg",        maxKg: 5,    ate50: 22.45, acima50: 24.35 },
  { label: "5 a 6kg",        maxKg: 6,    ate50: 27.45, acima50: 30.35 },
  { label: "6 a 7kg",        maxKg: 7,    ate50: 29.45, acima50: 33.35 },
  { label: "7 a 8kg",        maxKg: 8,    ate50: 31.45, acima50: 35.35 },
  { label: "8 a 9kg",        maxKg: 9,    ate50: 33.45, acima50: 37.35 },
  { label: "9 a 10kg",       maxKg: 10,   ate50: 47.45, acima50: 51.35 },
];

const AMAZON_FBA_QUILO_ADICIONAL = { ate50: 3.25, acima50: 3.50 };

// Tabela de frete FBA Onsite
type AmazonFBAOnsiteFaixa = {
  label: string;
  maxKg: number;
  valor: number;
};

const AMAZON_FBA_ONSITE_TABELA: AmazonFBAOnsiteFaixa[] = [
  { label: "0 a 250g",       maxKg: 0.25, valor: 23.95 },
  { label: "250 a 500g",     maxKg: 0.5,  valor: 24.95 },
  { label: "500g a 1kg",     maxKg: 1,    valor: 26.45 },
  { label: "1 a 2kg",        maxKg: 2,    valor: 27.95 },
  { label: "2 a 3kg",        maxKg: 3,    valor: 29.95 },
  { label: "3 a 4kg",        maxKg: 4,    valor: 32.95 },
  { label: "4 a 5kg",        maxKg: 5,    valor: 36.45 },
  { label: "5 a 6kg",        maxKg: 6,    valor: 41.45 },
  { label: "6 a 7kg",        maxKg: 7,    valor: 46.45 },
  { label: "7 a 8kg",        maxKg: 8,    valor: 51.45 },
  { label: "8 a 9kg",        maxKg: 9,    valor: 56.45 },
  { label: "9 a 10kg",       maxKg: 10,   valor: 71.45 },
];

const AMAZON_FBA_ONSITE_QUILO_ADICIONAL = 4.00;

// Tabela de frete DBA Amazon (Novas tarifas a partir de 01/09/2024)
// Produtos até R$30: tarifa fixa R$4,50
// Produtos até R$79: tarifa fixa R$8,00
// Produtos a partir de R$79: tabela por peso e zona

type AmazonDBAZona = "sp" | "zona1" | "zona2" | "centro_norte";

const AMAZON_DBA_ZONAS: { value: AmazonDBAZona; label: string }[] = [
  { value: "sp", label: "SP - Zona 1" },
  { value: "zona1", label: "Zona 1 (outros Sul e Sudeste)" },
  { value: "zona2", label: "Zona 2 (do Sul e Sudeste)" },
  { value: "centro_norte", label: "Centro-Oeste, Norte e Nordeste" },
];

type AmazonDBAFaixa = {
  label: string;
  maxKg: number;
  sp: number;
  zona1: number;
  zona2: number;
  centro_norte: number;
};

const AMAZON_DBA_TABELA: AmazonDBAFaixa[] = [
  { label: "0 a 250g",     maxKg: 0.25, sp: 19.95, zona1: 19.95, zona2: 20.45, centro_norte: 29.45 },
  { label: "250 a 500g",   maxKg: 0.5,  sp: 20.45, zona1: 20.45, zona2: 20.95, centro_norte: 30.45 },
  { label: "500g a 1kg",   maxKg: 1,    sp: 21.45, zona1: 21.45, zona2: 21.95, centro_norte: 33.45 },
  { label: "1 a 2kg",      maxKg: 2,    sp: 22.95, zona1: 22.95, zona2: 23.45, centro_norte: 37.95 },
  { label: "2 a 3kg",      maxKg: 3,    sp: 23.95, zona1: 23.95, zona2: 24.45, centro_norte: 44.45 },
  { label: "3 a 4kg",      maxKg: 4,    sp: 25.95, zona1: 25.95, zona2: 25.95, centro_norte: 46.95 },
  { label: "4 a 5kg",      maxKg: 5,    sp: 27.95, zona1: 27.95, zona2: 27.95, centro_norte: 48.95 },
  { label: "5 a 6kg",      maxKg: 6,    sp: 36.95, zona1: 36.95, zona2: 36.95, centro_norte: 58.45 },
  { label: "6 a 7kg",      maxKg: 7,    sp: 39.45, zona1: 39.45, zona2: 39.45, centro_norte: 59.95 },
  { label: "7 a 8kg",      maxKg: 8,    sp: 40.45, zona1: 40.45, zona2: 40.45, centro_norte: 61.45 },
  { label: "8 a 9kg",      maxKg: 9,    sp: 45.45, zona1: 46.95, zona2: 46.95, centro_norte: 62.95 },
  { label: "9 a 10kg",     maxKg: 10,   sp: 59.95, zona1: 61.45, zona2: 65.95, centro_norte: 87.45 },
];

const AMAZON_DBA_QUILO_ADICIONAL = 4.00; // todas as zonas

function calcularFreteDBA(pesoKg: number, precoVenda: number, zona: AmazonDBAZona): { valor: number; tipo: string; faixa?: AmazonDBAFaixa } {
  // Produtos até R$30: tarifa fixa
  if (precoVenda <= 30) {
    return { valor: 4.50, tipo: "Tarifa fixa (produto até R$30)" };
  }
  // Produtos até R$79: tarifa fixa
  if (precoVenda < 79) {
    return { valor: 8.00, tipo: "Tarifa fixa (produto até R$79)" };
  }
  // Produtos a partir de R$79: tabela por peso e zona
  if (pesoKg <= 0) {
    return { valor: 0, tipo: "Informe o peso para calcular" };
  }
  if (pesoKg <= 10) {
    const faixa = AMAZON_DBA_TABELA.find(f => pesoKg <= f.maxKg) ?? AMAZON_DBA_TABELA[AMAZON_DBA_TABELA.length - 1];
    return { valor: faixa[zona], tipo: `Tabela por peso (${faixa.label})`, faixa };
  }
  const faixaBase = AMAZON_DBA_TABELA[AMAZON_DBA_TABELA.length - 1];
  const quilosExtra = Math.ceil(pesoKg - 10);
  return { valor: faixaBase[zona] + quilosExtra * AMAZON_DBA_QUILO_ADICIONAL, tipo: `Acima de 10kg (+${quilosExtra}kg extra)`, faixa: faixaBase };
}

type AmazonModelo = "dba" | "fba" | "fba_onsite";

function calcularFreteFBA(pesoKg: number, precoVenda: number): { faixa: AmazonFBAFaixa | null; valor: number } {
  const coluna: "ate50" | "acima50" = precoVenda <= 50 ? "ate50" : "acima50";
  if (pesoKg <= 10) {
    const faixa = AMAZON_FBA_TABELA.find(f => pesoKg <= f.maxKg) ?? AMAZON_FBA_TABELA[AMAZON_FBA_TABELA.length - 1];
    return { faixa, valor: faixa[coluna] };
  }
  const faixaBase = AMAZON_FBA_TABELA[AMAZON_FBA_TABELA.length - 1];
  const quilosExtra = Math.ceil(pesoKg - 10);
  const adicional = AMAZON_FBA_QUILO_ADICIONAL[coluna];
  return { faixa: faixaBase, valor: faixaBase[coluna] + quilosExtra * adicional };
}

function calcularFreteFBAOnsite(pesoKg: number): { faixa: AmazonFBAOnsiteFaixa | null; valor: number } {
  if (pesoKg <= 10) {
    const faixa = AMAZON_FBA_ONSITE_TABELA.find(f => pesoKg <= f.maxKg) ?? AMAZON_FBA_ONSITE_TABELA[AMAZON_FBA_ONSITE_TABELA.length - 1];
    return { faixa, valor: faixa.valor };
  }
  const faixaBase = AMAZON_FBA_ONSITE_TABELA[AMAZON_FBA_ONSITE_TABELA.length - 1];
  const quilosExtra = Math.ceil(pesoKg - 10);
  return { faixa: faixaBase, valor: faixaBase.valor + quilosExtra * AMAZON_FBA_ONSITE_QUILO_ADICIONAL };
}

function calcularPesoCubadoFBA(alturaCm: number, larguraCm: number, comprimentoCm: number): number {
  return (comprimentoCm * larguraCm * alturaCm) / 6000;
}

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
  const [modelo, setModelo]                 = usePersistedState<AmazonModelo>("calc_amazon_modelo", "dba");
  const [pesoFBA, setPesoFBA]               = usePersistedState("calc_amazon_peso_fba", "");
  const [alturaFBA, setAlturaFBA]           = usePersistedState("calc_amazon_altura_fba", "");
  const [larguraFBA, setLarguraFBA]         = usePersistedState("calc_amazon_largura_fba", "");
  const [comprimentoFBA, setComprimentoFBA] = usePersistedState("calc_amazon_comprimento_fba", "");
  const [dbaZona, setDbaZona]               = usePersistedState<AmazonDBAZona>("calc_amazon_dba_zona", "sp");

  const categoria      = AMAZON_CATEGORIAS.find((c) => c.nome === categoriaNome)!;
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
  const fbaFreteInfo      = modelo === "fba" && pesoFinalFBA > 0 && preco > 0 ? calcularFreteFBA(pesoFinalFBA, preco) : null;
  const fbaOnsiteInfo     = modelo === "fba_onsite" && pesoFinalFBA > 0 ? calcularFreteFBAOnsite(pesoFinalFBA) : null;
  const dbaFreteInfo      = modelo === "dba" && preco > 0 ? calcularFreteDBA(pesoFinalFBA, preco, dbaZona) : null;
  const valorFrete        = fbaFreteInfo ? fbaFreteInfo.valor : fbaOnsiteInfo ? fbaOnsiteInfo.valor : dbaFreteInfo ? dbaFreteInfo.valor : 0;

  const valorComissao  = preco > 0 ? calcularComissaoAmazon(preco, categoria) : 0;
  const valorImposto   = preco * (impostoPerc / 100);
  const valorMarketing = usarMarketing ? preco * (marketingPerc / 100) : 0;

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing - valorFrete;
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
                  {dbaFreteInfo && dbaFreteInfo.valor > 0 && (
                    <div className="text-xs bg-muted/30 rounded p-2">
                      <p>{dbaFreteInfo.tipo}</p>
                      <p>Frete DBA: <span className="font-semibold text-primary">{formatCurrency(dbaFreteInfo.valor)}</span></p>
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
                    {AMAZON_FBA_TABELA.map((faixa) => {
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
                      <td className="px-2 py-1.5 text-center font-mono text-foreground">{formatCurrency(AMAZON_FBA_QUILO_ADICIONAL.ate50)}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-foreground">{formatCurrency(AMAZON_FBA_QUILO_ADICIONAL.acima50)}</td>
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
                    {AMAZON_FBA_ONSITE_TABELA.map((faixa) => {
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
                      <td className="px-2 py-1.5 text-center font-mono text-foreground">{formatCurrency(AMAZON_FBA_ONSITE_QUILO_ADICIONAL)}</td>
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
const MAGALU_COMISSAO = 0.18; // 18% fixo

// Tabela de frete Magalu Preço Certo
type MagaluFreteFaixa = {
  label: string;
  maxKg: number;
  semDesconto: number;
  desconto25: number;
  desconto50: number;
  desconto75: number;
};

const MAGALU_FRETE_TABELA: MagaluFreteFaixa[] = [
  { label: "Até 500g",           maxKg: 0.5,   semDesconto: 35.90, desconto25: 26.93, desconto50: 17.95, desconto75: 8.98 },
  { label: "De 500g a 1kg",      maxKg: 1,     semDesconto: 40.80, desconto25: 30.68, desconto50: 20.45, desconto75: 10.20 },
  { label: "De 1kg a 2kg",       maxKg: 2,     semDesconto: 42.90, desconto25: 32.18, desconto50: 21.45, desconto75: 10.73 },
  { label: "De 2kg a 5kg",       maxKg: 5,     semDesconto: 50.90, desconto25: 38.18, desconto50: 25.45, desconto75: 12.73 },
  { label: "De 5kg a 9kg",       maxKg: 9,     semDesconto: 77.90, desconto25: 58.43, desconto50: 38.95, desconto75: 19.48 },
  { label: "De 9kg a 13kg",      maxKg: 13,    semDesconto: 98.00, desconto25: 74.18, desconto50: 49.45, desconto75: 24.50 },
  { label: "De 13kg a 17kg",     maxKg: 17,    semDesconto: 111.90, desconto25: 83.93, desconto50: 55.95, desconto75: 27.98 },
  { label: "De 17kg a 23kg",     maxKg: 23,    semDesconto: 134.90, desconto25: 101.18, desconto50: 67.45, desconto75: 33.73 },
  { label: "De 23kg a 30kg",     maxKg: 30,    semDesconto: 148.90, desconto25: 111.68, desconto50: 74.45, desconto75: 37.23 },
  { label: "De 30kg a 40kg",     maxKg: 40,    semDesconto: 179.90, desconto25: 134.93, desconto50: 89.95, desconto75: 44.98 },
  { label: "De 40kg a 50kg",     maxKg: 50,    semDesconto: 189.90, desconto25: 142.43, desconto50: 94.95, desconto75: 47.48 },
  { label: "De 50kg a 60kg",     maxKg: 60,    semDesconto: 199.90, desconto25: 149.93, desconto50: 99.95, desconto75: 49.98 },
  { label: "De 60kg a 70kg",     maxKg: 70,    semDesconto: 209.90, desconto25: 157.43, desconto50: 104.95, desconto75: 52.48 },
  { label: "De 70kg a 80kg",     maxKg: 80,    semDesconto: 219.90, desconto25: 164.93, desconto50: 109.95, desconto75: 54.98 },
  { label: "De 80kg a 90kg",     maxKg: 90,    semDesconto: 229.90, desconto25: 172.43, desconto50: 114.95, desconto75: 57.48 },
  { label: "De 90kg a 100kg",    maxKg: 100,   semDesconto: 239.90, desconto25: 179.93, desconto50: 119.95, desconto75: 59.98 },
  { label: "De 100kg a 110kg",   maxKg: 110,   semDesconto: 249.90, desconto25: 187.43, desconto50: 124.95, desconto75: 62.48 },
  { label: "De 110kg a 120kg",   maxKg: 120,   semDesconto: 259.90, desconto25: 194.93, desconto50: 129.95, desconto75: 64.98 },
  { label: "De 120kg a 130kg",   maxKg: 130,   semDesconto: 269.90, desconto25: 202.43, desconto50: 134.95, desconto75: 67.48 },
  { label: "De 130kg a 140kg",   maxKg: 140,   semDesconto: 279.90, desconto25: 209.93, desconto50: 139.95, desconto75: 69.98 },
  { label: "De 140kg a 150kg",   maxKg: 150,   semDesconto: 289.90, desconto25: 217.43, desconto50: 144.95, desconto75: 72.48 },
  { label: "De 150kg a 160kg",   maxKg: 160,   semDesconto: 299.90, desconto25: 224.93, desconto50: 149.95, desconto75: 74.98 },
  { label: "De 160kg a 170kg",   maxKg: 170,   semDesconto: 309.90, desconto25: 232.43, desconto50: 154.95, desconto75: 77.48 },
  { label: "De 170kg a 180kg",   maxKg: 180,   semDesconto: 319.90, desconto25: 239.93, desconto50: 159.95, desconto75: 79.98 },
  { label: "De 180kg a 190kg",   maxKg: 190,   semDesconto: 329.90, desconto25: 247.43, desconto50: 164.95, desconto75: 82.48 },
  { label: "De 190kg a 200kg",   maxKg: 200,   semDesconto: 339.90, desconto25: 254.93, desconto50: 169.95, desconto75: 84.98 },
  { label: "Acima de 200kg",     maxKg: Infinity, semDesconto: 349.90, desconto25: 262.43, desconto50: 174.95, desconto75: 87.48 },
];

type MagaluDescontoFrete = "sem_desconto" | "desconto_25" | "desconto_50" | "desconto_75";
type MagaluTipoProduto = "leves" | "pesados";

function calcularPesoCubado(alturaM: number, larguraM: number, comprimentoM: number, tipo: MagaluTipoProduto): number {
  const fator = tipo === "leves" ? 167 : 300;
  return alturaM * larguraM * comprimentoM * fator;
}

function getMagaluFrete(pesoKg: number, desconto: MagaluDescontoFrete): { faixa: MagaluFreteFaixa; valor: number } {
  const faixa = MAGALU_FRETE_TABELA.find(f => pesoKg <= f.maxKg) ?? MAGALU_FRETE_TABELA[MAGALU_FRETE_TABELA.length - 1];
  const valor = desconto === "desconto_75" ? faixa.desconto75 : desconto === "desconto_50" ? faixa.desconto50 : desconto === "desconto_25" ? faixa.desconto25 : faixa.semDesconto;
  return { faixa, valor };
}

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

  const preco          = parseNum(precoVenda);
  const custo          = parseNum(custoProduto);
  const impostoPerc    = parseNum(imposto);
  const marketingPerc  = parseNum(marketing);
  const pesoRealKg     = parseNum(pesoReal);
  const alturaM        = parseNum(altura);
  const larguraM       = parseNum(largura);
  const comprimentoM   = parseNum(comprimento);

  const pesoCubado     = (alturaM > 0 && larguraM > 0 && comprimentoM > 0) ? calcularPesoCubado(alturaM, larguraM, comprimentoM, tipoProduto) : 0;
  const pesoFinal      = Math.max(pesoRealKg, pesoCubado);
  const freteInfo      = usarFrete && pesoFinal > 0 ? getMagaluFrete(pesoFinal, descontoFrete) : null;
  const valorFrete     = freteInfo ? freteInfo.valor : 0;

  const valorComissao       = preco > 0 ? preco * MAGALU_COMISSAO : 0;
  const valorImposto        = preco * (impostoPerc / 100);
  const valorMarketing      = usarMarketing ? preco * (marketingPerc / 100) : 0;

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing - valorFrete;
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
                  <Label className="text-foreground text-xs">Altura (m)</Label>
                  <Input type="number" placeholder="0" value={altura} onChange={(e) => setAltura(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Largura (m)</Label>
                  <Input type="number" placeholder="0" value={largura} onChange={(e) => setLargura(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-foreground text-xs">Compr. (m)</Label>
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
                  {MAGALU_FRETE_TABELA.map((faixa) => {
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

  const produto      = mlCategorias.find((p) => p.nome === produtoNome) || mlCategorias[0];
  const preco        = parseNum(precoVenda);
  const custo        = parseNum(custoProduto);
  const impostoPerc  = parseNum(imposto);
  const marketingPerc = parseNum(marketing);
  const pesoNum      = parseNum(peso);

  const comissaoPerc   = tipoAnuncio === "classico" ? produto?.classicoPerc || 0 : produto?.premiumPerc || 0;
  const valorComissao  = preco > 0 ? preco * comissaoPerc : 0;
  const valorImposto   = preco * (impostoPerc / 100);
  const valorMarketing = usarMarketing ? preco * (marketingPerc / 100) : 0;
  const valorFrete     = usarFrete && preco > 0 && pesoNum > 0 ? getMLFrete(preco, pesoNum) : 0;
  const valorCustoFixo = preco > 0 ? getMLCustoFixo(preco) : 0;

  const receitaLiquida = preco - valorComissao - valorImposto - valorMarketing - valorFrete - valorCustoFixo;
  const lucro          = receitaLiquida - custo;
  const margemLucro    = preco > 0 ? (lucro / preco) * 100 : 0;
  const isLucrativo    = lucro > 0;

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
    if (produtoNome === nome) setProdutoNome(novas[0]?.nome || ""e || "");
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
             (produto?.classicoPerc ?? 0)icoPerc * 100).toFixed(1)}%
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
// ─── Calculadora TikTok Shop ──────────────────────────────────────────────────
const TIKTOK_COMISSAO = 0.06; // 6%
const TIKTOK_TAXA_FIXA = 4.00; // R$4 por item

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

  const TIKTOK_FRETE_GRATIS_TAXA = 0.06; // +6%
  const comissaoPerc   = incentivoComissao ? 0 : TIKTOK_COMISSAO;
  const freteGratisPerc = usarFreteGratis ? TIKTOK_FRETE_GRATIS_TAXA : 0;
  const valorComissao  = preco > 0 ? preco * comissaoPerc : 0;
  const valorFreteGratis = preco > 0 ? preco * freteGratisPerc : 0;
  const valorTaxaFixa  = preco > 0 ? TIKTOK_TAXA_FIXA : 0;
  const valorImposto   = preco * (impostoPerc / 100);
  const valorMarketing = usarMarketing ? preco * (marketingPerc / 100) : 0;

  const receitaLiquida = preco - valorComissao - valorFreteGratis - valorTaxaFixa - valorImposto - valorMarketing;
  const lucro          = receitaLiquida - custo;
  const margemLucro    = preco > 0 ? (lucro / preco) * 100 : 0;
  const isLucrativo    = lucro > 0;

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
                  {incentivoComissao ? "0% (incentivo)" : "6%"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">Taxa fixa por item</span>
                <Badge variant="secondary" className="font-mono">R$4,00</Badge>
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
                  <span className="text-muted-foreground">− Comissão (6%)</span>
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
              <p>A tarifa de comissão atual é de <span className="font-semibold text-foreground">6%</span>, incluindo impostos aplicáveis (IVA).</p>
              <p>Com o <span className="font-semibold text-primary">incentivo de comissão</span> ativo, a comissão é <span className="font-semibold text-success">0%</span>.</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">🏷️ Taxa fixa</p>
              <p>A taxa por item vendido é fixada em <span className="font-semibold text-foreground">R$4,00</span> por item, incluindo impostos aplicáveis (IVA).</p>
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
const SHEIN_COMISSAO = 0.16;

type SheinFreteFaixa = { label: string; maxKg: number; valor: number };

const SHEIN_FRETE_TABELA: SheinFreteFaixa[] = [
  { label: "Até 600g",        maxKg: 0.6, valor: 4 },
  { label: "600g a 900g",     maxKg: 0.9, valor: 6 },
  { label: "900g a 1,2kg",    maxKg: 1.2, valor: 8 },
  { label: "1,2kg a 1,5kg",   maxKg: 1.5, valor: 10 },
];

function calcularFreteShein(pesoRealKg: number, comprimento: number, largura: number, altura: number): { faixa: SheinFreteFaixa | null; valor: number; pesoCubico: number; pesoUsado: number } {
  const pesoCubico = (comprimento * largura * altura) / 6000;
  const pesoUsado = Math.max(pesoRealKg, pesoCubico);
  const faixa = SHEIN_FRETE_TABELA.find(f => pesoUsado <= f.maxKg) || null;
  const valor = faixa ? faixa.valor : SHEIN_FRETE_TABELA[SHEIN_FRETE_TABELA.length - 1].valor;
  return { faixa, valor, pesoCubico, pesoUsado };
}

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
  const valorFrete     = (pesoKg > 0 || (comp > 0 && larg > 0 && alt > 0)) ? freteInfo.valor : 0;

  const valorComissao  = preco > 0 ? preco * SHEIN_COMISSAO : 0;
  const valorImposto   = preco * (impostoPerc / 100);
  const valorMarketing = usarMarketing ? preco * (marketingPerc / 100) : 0;

  const receitaLiquida = preco - valorComissao - valorFrete - valorImposto - valorMarketing;
  const lucro          = receitaLiquida - custo;
  const margemLucro    = preco > 0 ? (lucro / preco) * 100 : 0;
  const isLucrativo    = lucro > 0;

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
                {SHEIN_FRETE_TABELA.map((f, idx) => {
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
                <SelectItem value="shopee"><div className="flex items-center gap-2"><img src={shopeeLogo} alt="Shopee" className="h-4 object-contain" /> Shopee</div></SelectItem>
                <SelectItem value="mercadolivre"><div className="flex items-center gap-2"><img src={mercadolivreLogo} alt="Mercado Livre" className="h-4 object-contain" /> Mercado Livre</div></SelectItem>
                <SelectItem value="amazon"><div className="flex items-center gap-2"><img src={amazonLogo} alt="Amazon" className="h-4 object-contain" /> Amazon</div></SelectItem>
                <SelectItem value="magalu"><div className="flex items-center gap-2"><img src={magaluLogo} alt="Magalu" className="h-4 object-contain" /> Magalu</div></SelectItem>
                <SelectItem value="tiktok"><div className="flex items-center gap-2"><img src={tiktokLogo} alt="TikTok" className="h-4 object-contain" /> TikTok</div></SelectItem>
                <SelectItem value="shein"><div className="flex items-center gap-2"><img src={sheinLogo} alt="Shein" className="h-4 object-contain" /> Shein</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Sidebar vertical */}
          <div className="hidden md:flex md:flex-col md:justify-between gap-1 md:w-48 md:min-w-48 md:sticky md:top-6 md:self-start md:h-[calc(100vh-6rem)]">
            <TabsList className="flex flex-col gap-1 h-auto bg-transparent p-0 w-full">
              <TabsTrigger value="shopee" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><img src={shopeeLogo} alt="Shopee" className="h-4 mr-2 object-contain" /> Shopee</TabsTrigger>
              <TabsTrigger value="mercadolivre" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><img src={mercadolivreLogo} alt="Mercado Livre" className="h-4 mr-2 object-contain" /> Mercado Livre</TabsTrigger>
              <TabsTrigger value="amazon" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><img src={amazonLogo} alt="Amazon" className="h-4 mr-2 object-contain" /> Amazon</TabsTrigger>
              <TabsTrigger value="magalu" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><img src={magaluLogo} alt="Magalu" className="h-4 mr-2 object-contain" /> Magalu</TabsTrigger>
              <TabsTrigger value="tiktok" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><img src={tiktokLogo} alt="TikTok" className="h-4 mr-2 object-contain" /> TikTok</TabsTrigger>
              <TabsTrigger value="shein" className="w-full justify-start data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 border border-border bg-card transition-all text-sm"><img src={sheinLogo} alt="Shein" className="h-4 mr-2 object-contain" /> Shein</TabsTrigger>
            </TabsList>

            {/* Perfil e Sair fixo no rodapé */}
            <div className="flex flex-col gap-1 pt-4 border-t border-border mt-auto">
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
