import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, Package, TrendingUp, Percent, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MarketplaceLogo, type MarketplaceKey } from "@/components/MarketplaceLogo";
import { useCarteira } from "@/hooks/useCarteira";
import type { ProdutoSalvo } from "@/lib/carteira";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** O banco grava o nome de exibição; o componente de logo usa a chave. */
const CHAVE_POR_NOME: Record<string, MarketplaceKey> = {
  Shopee: "shopee",
  "Mercado Livre": "mercadolivre",
  Amazon: "amazon",
  Magalu: "magalu",
  "TikTok Shop": "tiktok",
  Shein: "shein",
};

interface CartaoProps {
  titulo: string;
  valor: string;
  apoio: string;
  icone: LucideIcon;
  alerta?: boolean;
}

const Cartao = ({ titulo, valor, apoio, icone: Icone, alerta }: CartaoProps) => (
  <Card className="border-border bg-card">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {titulo}
          </p>
          <p
            className={`mt-2 text-2xl font-bold tabular-nums ${
              alerta ? "text-destructive" : "text-foreground"
            }`}
          >
            {valor}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{apoio}</p>
        </div>
        <div
          className={`rounded-xl p-2.5 ${alerta ? "bg-destructive/10" : "bg-primary/10"}`}
        >
          <Icone className={`h-5 w-5 ${alerta ? "text-destructive" : "text-primary"}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const EstadoVazio = () => {
  const navigate = useNavigate();
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="rounded-2xl bg-primary/10 p-4">
          <Calculator className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Nenhum produto salvo ainda
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Calcule a margem de um produto e salve com a quantidade em estoque. O painel
            passa a mostrar quanto você tem parado e quanto isso pode virar de lucro.
          </p>
        </div>
        <Button onClick={() => navigate("/calculadora")}>Ir para a calculadora</Button>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { produtos, resumo, carregando, erro } = useCarteira();

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-destructive/40 bg-card">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {erro}
          </CardContent>
        </Card>
      </div>
    );
  }

  const comEstoque = produtos.filter((p) => Number(p.stock_quantity) > 0);

  // Pior margem primeiro: o problema tem que aparecer antes do que já vai bem.
  const dadosMargem = [...produtos]
    .sort((a, b) => a.profit_margin_percent - b.profit_margin_percent)
    .slice(0, 12)
    .map((p: ProdutoSalvo) => ({
      nome: p.product_name.length > 22 ? `${p.product_name.slice(0, 21)}…` : p.product_name,
      margem: Number(p.profit_margin_percent.toFixed(1)),
    }));

  const dadosPlataforma = resumo.porPlataforma.filter((p) => p.custoEstoque > 0);

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Sua carteira de produtos e o dinheiro parado em estoque
        </p>
      </header>

      {produtos.length === 0 ? (
        <EstadoVazio />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Cartao
              titulo="Custo em estoque"
              valor={formatCurrency(resumo.custoTotalEstoque)}
              apoio={`${comEstoque.length} de ${resumo.totalProdutos} produtos com estoque`}
              icone={Package}
            />
            <Cartao
              titulo="Lucro potencial"
              valor={formatCurrency(resumo.lucroPotencial)}
              apoio={`Se vender todo o estoque por ${formatCompact(resumo.valorVendaEstoque)}`}
              icone={TrendingUp}
            />
            <Cartao
              titulo="Margem média"
              valor={`${resumo.margemMedia.toFixed(1)}%`}
              apoio="Ponderada pelo valor em estoque"
              icone={Percent}
            />
            <Cartao
              titulo="No prejuízo"
              valor={String(resumo.produtosNoPrejuizo.length)}
              apoio={
                resumo.produtosNoPrejuizo.length === 0
                  ? "Nenhum produto com margem negativa"
                  : "Produtos vendendo abaixo do custo"
              }
              icone={AlertTriangle}
              alerta={resumo.produtosNoPrejuizo.length > 0}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Margem por produto</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Da pior para a melhor. Barras à esquerda do zero vendem no prejuízo.
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(220, dadosMargem.length * 30)}>
                  <BarChart data={dadosMargem} layout="vertical" margin={{ left: 8, right: 44 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={140}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <ReferenceLine x={0} stroke="hsl(var(--border))" />
                    <Bar
                      dataKey="margem"
                      radius={4}
                      barSize={14}
                      isAnimationActive={false}
                      label={{
                        position: "right",
                        formatter: (v: number) => `${v}%`,
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                    >
                      {dadosMargem.map((d) => (
                        <Cell
                          key={d.nome}
                          fill={
                            d.margem < 0 ? "hsl(var(--destructive))" : "hsl(var(--success))"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Custo de estoque por marketplace</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Onde seu dinheiro está parado
                </p>
              </CardHeader>
              <CardContent>
                {dadosPlataforma.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum produto com quantidade em estoque informada.
                  </p>
                ) : (
                  <ul className="space-y-4 py-2">
                    {dadosPlataforma.map((p) => {
                      const fatia =
                        resumo.custoTotalEstoque > 0
                          ? (p.custoEstoque / resumo.custoTotalEstoque) * 100
                          : 0;
                      const chave = CHAVE_POR_NOME[p.platform];
                      return (
                        <li key={p.platform}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              {chave && (
                                <MarketplaceLogo
                                  platform={chave}
                                  className="h-3.5 w-auto max-w-11"
                                />
                              )}
                              <span className="truncate text-sm text-foreground">
                                {p.platform}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-foreground">
                              {formatCurrency(p.custoEstoque)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-foreground/45"
                              style={{ width: `${Math.max(fatia, 2)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {p.unidades} {p.unidades === 1 ? "unidade" : "unidades"} ·{" "}
                            {fatia.toFixed(0)}% do total
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {resumo.produtosNoPrejuizo.length > 0 && (
            <Card className="border-destructive/40 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Produtos vendendo abaixo do custo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {resumo.produtosNoPrejuizo.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{p.product_name}</p>
                        <p className="text-xs text-muted-foreground">{p.platform}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular-nums text-destructive">
                          {formatCurrency(p.profit_margin_value)}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {p.profit_margin_percent.toFixed(1)}% por unidade
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
