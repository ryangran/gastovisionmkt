import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, AlertTriangle, ShoppingCart, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { User } from "@supabase/supabase-js";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface Product {
  id: string;
  name: string;
  quantity: number;
  min_stock: number;
  unit: string;
}

interface Movement {
  id: string;
  product_id: string;
  quantity: number;
  type: string;
  created_at: string;
  previous_quantity: number;
  new_quantity: number;
  command: string;
}

interface ForecastData {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  unit: string;
  avgDailySales7d: number;
  avgDailySales14d: number;
  avgDailySales30d: number;
  forecast7d: number;
  forecast14d: number;
  forecast30d: number;
  daysUntilStockout: number;
  suggestedPurchase: number;
  trend: "increasing" | "decreasing" | "stable";
}

const Forecasts = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  
  const { hasPermission, isLoading: permissionLoading, userEmail } = usePagePermission("/forecasts");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      fetchData();
    }
  }, [hasPermission]);

  // Realtime updates para movimentações e produtos
  useEffect(() => {
    if (!hasPermission) return;

    const channel = supabase
      .channel('forecasts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movements',
          filter: 'panel_type=eq.admin'
        },
        () => {
          console.log('Movement change detected, refreshing data...');
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: 'panel_type=eq.admin'
        },
        () => {
          console.log('Product change detected, refreshing data...');
          fetchData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime connected for forecasts');
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime connection error');
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeStatus('disconnected');
    };
  }, [hasPermission]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [productsRes, movementsRes] = await Promise.all([
        supabase.from("products").select("*").eq("panel_type", "admin"),
        supabase.from("movements").select("*").eq("panel_type", "admin").order("created_at", { ascending: false })
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (movementsRes.data) setMovements(movementsRes.data);

      if (productsRes.data && movementsRes.data) {
        calculateForecasts(productsRes.data, movementsRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const calculateForecasts = (prods: Product[], movs: Movement[]) => {
    const now = new Date();
    const forecastData: ForecastData[] = [];

    prods.forEach(product => {
      // Filtrar apenas saídas (excluindo estornos que anulam saídas)
      const saidaMovements = movs.filter(m => m.product_id === product.id && m.type === "saida");
      const estornoMovements = movs.filter(m => m.product_id === product.id && m.type === "estorno");
      
      // Calcular total de estornos que anulam saídas
      const totalEstornos = estornoMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
      
      // Criar lista efetiva de movimentações (saídas menos estornos)
      // Para cálculo correto, usamos as saídas mas descontamos proporcionalmente os estornos
      const productMovements = saidaMovements;
      
      if (productMovements.length === 0) {
        forecastData.push({
          productId: product.id,
          productName: product.name,
          currentStock: Number(product.quantity),
          minStock: Number(product.min_stock),
          unit: product.unit,
          avgDailySales7d: 0,
          avgDailySales14d: 0,
          avgDailySales30d: 0,
          forecast7d: 0,
          forecast14d: 0,
          forecast30d: 0,
          daysUntilStockout: 999,
          suggestedPurchase: 0,
          trend: "stable"
        });
        return;
      }

      // Organizar movimentações por data
      const sortedMovements = [...productMovements].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Calcular período total de histórico
      const firstDate = new Date(sortedMovements[0].created_at);
      const lastDate = new Date(sortedMovements[sortedMovements.length - 1].created_at);
      const totalDays = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Agrupar vendas por dia para análise de variabilidade
      const dailySales: { [key: string]: number } = {};
      sortedMovements.forEach(m => {
        const date = new Date(m.created_at).toISOString().split('T')[0];
        dailySales[date] = (dailySales[date] || 0) + Math.abs(Number(m.quantity));
      });

      // Função auxiliar para calcular dias úteis em um período
      const getWorkingDays = (days: number): number => {
        // Em uma semana normal: 5 dias úteis, 2 dias de fim de semana
        const fullWeeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        
        // Dias úteis das semanas completas + dias restantes (assumindo que começam na segunda)
        const workingDaysInFullWeeks = fullWeeks * 5;
        const workingDaysRemaining = Math.min(remainingDays, 5);
        
        return workingDaysInFullWeeks + workingDaysRemaining;
      };

      // Função auxiliar para calcular média diária correta (apenas dias úteis, descontando estornos)
      const calculateAvgDailySales = (movements: Movement[], periodDays: number): number => {
        if (movements.length === 0) return 0;
        
        const totalSales = movements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
        
        // Calcular estornos no mesmo período
        const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
        const estornosNoPeriodo = estornoMovements.filter(m => 
          new Date(m.created_at) >= periodStart
        ).reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
        
        // Vendas efetivas = saídas - estornos
        const effectiveSales = Math.max(0, totalSales - estornosNoPeriodo);
        
        // Usar o período real ou o total de dias, o que for menor
        const effectivePeriod = Math.min(periodDays, totalDays);
        
        // Calcular apenas dias úteis no período
        const workingDays = getWorkingDays(effectivePeriod);
        
        // Retornar média por dia útil
        return workingDays > 0 ? effectiveSales / workingDays : 0;
      };

      // Filtrar movimentações por período
      const movements7d = productMovements.filter(m => {
        const daysDiff = (now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      });
      
      const movements14d = productMovements.filter(m => {
        const daysDiff = (now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 14;
      });
      
      const movements30d = productMovements.filter(m => {
        const daysDiff = (now.getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      });

      // Calcular médias diárias corretamente
      const avgDailySales7d = calculateAvgDailySales(movements7d, 7);
      const avgDailySales14d = calculateAvgDailySales(movements14d, 14);
      const avgDailySales30d = calculateAvgDailySales(movements30d, 30);

      // Calcular média ponderada inteligente baseada no histórico disponível
      let weightedAvg: number;
      
      if (totalDays <= 3) {
        // Muito pouco histórico: usar média simples
        weightedAvg = productMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0) / totalDays;
      } else if (totalDays <= 7) {
        // Menos de uma semana: usar últimos 7 dias com mais peso
        weightedAvg = avgDailySales7d;
      } else if (totalDays <= 14) {
        // Entre 1 e 2 semanas: balancear entre 7 e 14 dias
        weightedAvg = (avgDailySales7d * 0.6) + (avgDailySales14d * 0.4);
      } else if (totalDays <= 30) {
        // Entre 2 e 4 semanas: incluir períodos mais longos
        weightedAvg = (avgDailySales7d * 0.5) + (avgDailySales14d * 0.3) + (avgDailySales30d * 0.2);
      } else {
        // Mais de 30 dias: dar mais peso aos dados recentes mas considerar tendência de longo prazo
        weightedAvg = (avgDailySales7d * 0.4) + (avgDailySales14d * 0.3) + (avgDailySales30d * 0.3);
      }

      // Garantir que weightedAvg não seja negativo
      weightedAvg = Math.max(0, weightedAvg);

      // Calcular variabilidade das vendas
      const daysWithSales = Object.keys(dailySales).length;
      let coefficientOfVariation = 0;
      
      if (daysWithSales > 1 && weightedAvg > 0) {
        const salesVariance = Object.values(dailySales).reduce(
          (sum, val) => sum + Math.pow(val - weightedAvg, 2), 
          0
        ) / daysWithSales;
        coefficientOfVariation = Math.sqrt(salesVariance) / weightedAvg;
      }

      // Ajustar margem de segurança baseada na variabilidade
      let safetyFactor = 1.2; // 20% padrão
      if (coefficientOfVariation > 0.6) {
        safetyFactor = 1.5; // 50% para alta variabilidade
      } else if (coefficientOfVariation > 0.4) {
        safetyFactor = 1.35; // 35% para média-alta variabilidade
      } else if (coefficientOfVariation > 0.2) {
        safetyFactor = 1.25; // 25% para média variabilidade
      }

      // Calcular previsões baseadas em dias úteis (5 dias por semana)
      // weightedAvg agora representa média por DIA ÚTIL
      const workingDays7d = getWorkingDays(7);   // ~5 dias úteis
      const workingDays14d = getWorkingDays(14); // ~10 dias úteis
      const workingDays30d = getWorkingDays(30); // ~21-22 dias úteis
      
      const forecast7d = weightedAvg * workingDays7d;
      const forecast14d = weightedAvg * workingDays14d;
      const forecast30d = weightedAvg * workingDays30d;

      // Dias até ruptura de estoque (considerando apenas dias úteis)
      const daysUntilStockoutWorkingDays = weightedAvg > 0 ? 
        Math.floor(Number(product.quantity) / (weightedAvg * safetyFactor)) : 999;
      
      // Converter dias úteis para dias corridos (adicionar fins de semana)
      const workingDaysToCalendarDays = (wd: number): number => {
        const fullWeeks = Math.floor(wd / 5);
        const remainingDays = wd % 5;
        return (fullWeeks * 7) + remainingDays;
      };
      
      const daysUntilStockout = workingDaysToCalendarDays(daysUntilStockoutWorkingDays);

      // Compra sugerida (manter ~30 dias corridos = ~21-22 dias úteis + margem de segurança)
      const targetStock = weightedAvg * workingDays30d * safetyFactor;
      const currentStock = Number(product.quantity);
      const suggestedPurchase = targetStock > currentStock ? 
        Math.ceil(targetStock - currentStock) : 0;

      // Determinar tendência comparando períodos
      let trend: "increasing" | "decreasing" | "stable" = "stable";
      
      if (totalDays >= 30 && avgDailySales30d > 0) {
        const trendRatio = avgDailySales7d / avgDailySales30d;
        if (trendRatio > 1.2) trend = "increasing";
        else if (trendRatio < 0.8) trend = "decreasing";
      } else if (totalDays >= 14 && avgDailySales14d > 0) {
        const trendRatio = avgDailySales7d / avgDailySales14d;
        if (trendRatio > 1.25) trend = "increasing";
        else if (trendRatio < 0.75) trend = "decreasing";
      }

      forecastData.push({
        productId: product.id,
        productName: product.name,
        currentStock: Number(product.quantity),
        minStock: Number(product.min_stock),
        unit: product.unit,
        avgDailySales7d,
        avgDailySales14d,
        avgDailySales30d,
        forecast7d,
        forecast14d,
        forecast30d,
        daysUntilStockout,
        suggestedPurchase,
        trend
      });
    });

    setForecasts(forecastData.sort((a, b) => a.productName.localeCompare(b.productName)));
  };

  const getCriticalProducts = () => forecasts
    .filter(f => f.daysUntilStockout < 7)
    .sort((a, b) => a.productName.localeCompare(b.productName));
  
  const getWarningProducts = () => forecasts
    .filter(f => f.daysUntilStockout >= 7 && f.daysUntilStockout < 14)
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const getFilteredForecasts = () => {
    return forecasts.filter(f => 
      f.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredMovements = () => {
    if (!searchTerm) return movements;
    return movements.filter(m => {
      const product = products.find(p => p.id === m.product_id);
      return product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  if (loading || permissionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return <AccessDenied userEmail={userEmail} />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/estoque")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Previsões e Análises
                </h1>
                <p className="text-sm text-muted-foreground">
                  Análise preditiva baseada em histórico completo de movimentações
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border">
                <div className={`w-2 h-2 rounded-full ${realtimeStatus === 'connected' ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                <span className="text-xs text-muted-foreground">
                  {realtimeStatus === 'connected' ? 'Atualização automática' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="forecasts">Previsão de Vendas</TabsTrigger>
            <TabsTrigger value="stockout">Ruptura</TabsTrigger>
            <TabsTrigger value="purchase">Compras</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-destructive/10">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risco Crítico</p>
                    <p className="text-3xl font-bold text-destructive">{getCriticalProducts().length}</p>
                    <p className="text-xs text-muted-foreground">Produtos &lt; 7 dias</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-yellow-500/10">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atenção</p>
                    <p className="text-3xl font-bold text-yellow-500">{getWarningProducts().length}</p>
                    <p className="text-xs text-muted-foreground">Produtos 7-14 dias</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <ShoppingCart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Produtos</p>
                    <p className="text-3xl font-bold">{forecasts.length}</p>
                    <p className="text-xs text-muted-foreground">Monitorados</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Evolução de Movimentações (Últimos 30 dias)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(() => {
                  const last30Days = Array.from({ length: 30 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (29 - i));
                    return date.toISOString().split('T')[0];
                  });
                  
                  return last30Days.map(date => {
                    const dayMovements = movements.filter(m => 
                      m.created_at.split('T')[0] === date
                    );
                    
                    const entradas = dayMovements
                      .filter(m => m.type === 'entrada')
                      .reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
                    
                    const saidas = dayMovements
                      .filter(m => m.type === 'saida')
                      .reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
                    
                    return {
                      data: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                      entradas,
                      saidas
                    };
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="data" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="entradas" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Entradas"
                    dot={{ fill: 'hsl(var(--success))', r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saidas" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="Saídas"
                    dot={{ fill: 'hsl(var(--destructive))', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Produtos em Risco de Ruptura
              </h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {getCriticalProducts().map(forecast => (
                    <div key={forecast.productId} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{forecast.productName}</h4>
                            <Badge variant="destructive" className="text-xs">
                              {forecast.daysUntilStockout} dias
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>Estoque atual: {forecast.currentStock} {forecast.unit}</div>
                            <div>Vendas/dia: {forecast.avgDailySales7d.toFixed(2)} {forecast.unit}</div>
                            <div>Estoque mínimo: {forecast.minStock} {forecast.unit}</div>
                            <div>Compra sugerida: {forecast.suggestedPurchase} {forecast.unit}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getCriticalProducts().length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum produto em risco crítico
                    </p>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="forecasts" className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                {getFilteredForecasts().length} produtos
              </Badge>
            </div>

            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-4">
                {getFilteredForecasts().map(forecast => (
                  <Card key={forecast.productId} className="p-6 bg-card/50 backdrop-blur">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{forecast.productName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Estoque atual: {forecast.currentStock} {forecast.unit}
                        </p>
                      </div>
                      <Badge variant={
                        forecast.trend === "increasing" ? "default" : 
                        forecast.trend === "decreasing" ? "destructive" : "secondary"
                      }>
                        {forecast.trend === "increasing" ? "↑ Crescendo" : 
                         forecast.trend === "decreasing" ? "↓ Diminuindo" : "→ Estável"}
                      </Badge>
                    </div>

                     <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Consumo médio: {forecast.avgDailySales7d.toFixed(2)} {forecast.unit}/dia</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span>{movements.filter(m => m.product_id === forecast.productId).length} movimentações</span>
                      </div>
                    </div>

                     <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Previsão 7 dias</p>
                        <p className="text-xl font-bold">{forecast.forecast7d.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">{forecast.unit}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Previsão 14 dias</p>
                        <p className="text-xl font-bold">{forecast.forecast14d.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">{forecast.unit}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Previsão 30 dias</p>
                        <p className="text-xl font-bold">{forecast.forecast30d.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">{forecast.unit}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-3">Evolução do Estoque (Últimos 30 dias)</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={(() => {
                          const productMovs = movements
                            .filter(m => m.product_id === forecast.productId)
                            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                          
                          const last30Days = productMovs.filter(m => {
                            const daysDiff = (new Date().getTime() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24);
                            return daysDiff <= 30;
                          });
                          
                          if (last30Days.length === 0) return [{ data: 'Sem dados', estoque: forecast.currentStock }];
                          
                          return last30Days.map(m => ({
                            data: new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                            estoque: Number(m.new_quantity),
                            minimo: forecast.minStock
                          }));
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="data" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="estoque" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Estoque"
                            dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="minimo" 
                            stroke="hsl(var(--destructive))" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Mínimo"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { 
                          period: "Estoque Atual", 
                          estoque: forecast.currentStock,
                          minimo: forecast.minStock,
                        },
                        { 
                          period: "Previsão 7d", 
                          consumo: forecast.forecast7d,
                          restante: Math.max(0, forecast.currentStock - forecast.forecast7d)
                        },
                        { 
                          period: "Previsão 14d", 
                          consumo: forecast.forecast14d,
                          restante: Math.max(0, forecast.currentStock - forecast.forecast14d)
                        },
                        { 
                          period: "Previsão 30d", 
                          consumo: forecast.forecast30d,
                          restante: Math.max(0, forecast.currentStock - forecast.forecast30d)
                        }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="period" className="text-xs" />
                        <YAxis className="text-xs" label={{ value: forecast.unit, angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="estoque" fill="hsl(var(--primary))" name="Estoque" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="minimo" fill="hsl(var(--destructive))" name="Mínimo" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="consumo" fill="hsl(var(--accent))" name="Consumo Previsto" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="restante" fill="hsl(var(--success))" name="Restante" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                ))}
                {getFilteredForecasts().length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stockout" className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Histórico de Rupturas e Alertas (Últimos 30 dias)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={(() => {
                  const last30Days = Array.from({ length: 30 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (29 - i));
                    return date.toISOString().split('T')[0];
                  });
                  
                  return last30Days.map(date => {
                    const dayMovements = movements.filter(m => 
                      m.created_at.split('T')[0] === date
                    );
                    
                    let critical = 0;
                    let warning = 0;
                    
                    dayMovements.forEach(m => {
                      const product = products.find(p => p.id === m.product_id);
                      if (product) {
                        const stockLevel = Number(m.new_quantity);
                        const minStock = Number(product.min_stock);
                        
                        if (stockLevel < minStock) critical++;
                        else if (stockLevel < minStock * 1.5) warning++;
                      }
                    });
                    
                    return {
                      data: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                      criticos: critical,
                      atencao: warning
                    };
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="data" className="text-xs" />
                  <YAxis className="text-xs" label={{ value: 'Produtos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="criticos" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="Críticos"
                    dot={{ fill: 'hsl(var(--destructive))', r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="atencao" 
                    stroke="hsl(var(--warning))" 
                    strokeWidth={2}
                    name="Atenção"
                    dot={{ fill: 'hsl(var(--warning))', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Tempo até Ruptura de Estoque - Top 10 Mais Críticos
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={forecasts.slice(0, 10).map(f => ({
                    name: f.productName.length > 20 ? f.productName.substring(0, 20) + '...' : f.productName,
                    dias: f.daysUntilStockout === 999 ? 0 : f.daysUntilStockout,
                    fullName: f.productName
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    className="text-xs"
                  />
                  <YAxis 
                    label={{ value: 'Dias até ruptura', angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold text-sm">{payload[0].payload.fullName}</p>
                            <p className="text-primary font-bold">
                              {payload[0].payload.dias === 0 ? 'Sem consumo' : `${payload[0].value} dias`}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="dias" 
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Detalhamento por Produto</h3>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Badge variant="secondary" className="text-sm whitespace-nowrap">
                    {getFilteredForecasts().length} produtos
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {getFilteredForecasts().map(forecast => (
                    <Card key={forecast.productId} className="p-4 bg-card border-l-4" style={{
                      borderLeftColor: forecast.daysUntilStockout < 7 ? 'hsl(var(--destructive))' :
                                      forecast.daysUntilStockout < 14 ? 'hsl(var(--yellow))' :
                                      'hsl(var(--primary))'
                    }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{forecast.productName}</h4>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                            <div>Estoque: {forecast.currentStock} {forecast.unit}</div>
                            <div>Consumo/dia: {forecast.avgDailySales7d.toFixed(2)} {forecast.unit}</div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <Badge variant={
                            forecast.daysUntilStockout < 7 ? "destructive" :
                            forecast.daysUntilStockout < 14 ? "secondary" : "default"
                          } className="text-base px-3 py-1">
                            {forecast.daysUntilStockout === 999 ? '∞' : forecast.daysUntilStockout}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {forecast.daysUntilStockout === 999 ? 'sem consumo' : 'dias p/ ruptura'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {getFilteredForecasts().length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="purchase" className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Análise de Necessidade de Compras
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={forecasts
                    .filter(f => f.suggestedPurchase > 0)
                    .slice(0, 10)
                    .map(f => ({
                      name: f.productName.length > 15 ? f.productName.substring(0, 15) + '...' : f.productName,
                      sugerido: f.suggestedPurchase,
                      estoque: f.currentStock,
                      fullName: f.productName
                    }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold text-sm mb-2">{payload[0].payload.fullName}</p>
                            <p className="text-sm">Estoque: <span className="font-bold">{payload[0].payload.estoque}</span></p>
                            <p className="text-sm">Comprar: <span className="font-bold text-primary">{payload[0].payload.sugerido}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="estoque" fill="hsl(var(--muted))" name="Estoque Atual" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="sugerido" fill="hsl(var(--primary))" name="Quantidade Sugerida" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Sugestões de Compra Prioritárias
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Calculado para manter 30 dias de estoque + margem de segurança ajustada pela variabilidade
              </p>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {forecasts.filter(f => f.suggestedPurchase > 0).length > 0 && (
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {forecasts.filter(f => f.suggestedPurchase > 0).length}
                      </p>
                      <p className="text-xs text-muted-foreground">produtos necessitam compra</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">
                        {forecasts.filter(f => f.suggestedPurchase > 0 && f.daysUntilStockout < 7).length}
                      </p>
                      <p className="text-xs text-muted-foreground">urgentes (&lt;7 dias)</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-500">
                        {forecasts.filter(f => f.suggestedPurchase > 0 && f.daysUntilStockout >= 7 && f.daysUntilStockout < 14).length}
                      </p>
                      <p className="text-xs text-muted-foreground">atenção (7-14 dias)</p>
                    </div>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {getFilteredForecasts()
                    .filter(f => f.suggestedPurchase > 0)
                    .sort((a, b) => a.productName.localeCompare(b.productName))
                    .map(forecast => (
                      <div 
                        key={forecast.productId} 
                        className="p-4 rounded-lg border-l-4 bg-card shadow-sm hover:shadow-md transition-shadow"
                        style={{
                          borderLeftColor: forecast.daysUntilStockout < 7 ? 'hsl(var(--destructive))' :
                                          forecast.daysUntilStockout < 14 ? 'hsl(var(--yellow))' :
                                          'hsl(var(--primary))'
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{forecast.productName}</h4>
                              <Badge variant={
                                forecast.daysUntilStockout < 7 ? "destructive" :
                                forecast.daysUntilStockout < 14 ? "secondary" : "default"
                              } className="text-xs">
                                {forecast.daysUntilStockout} dias
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Estoque atual:</span>
                                <span className="font-medium">{forecast.currentStock} {forecast.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Estoque mínimo:</span>
                                <span className="font-medium">{forecast.minStock} {forecast.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Consumo/dia:</span>
                                <span className="font-medium">{forecast.avgDailySales7d.toFixed(2)} {forecast.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Previsão 30d:</span>
                                <span className="font-medium">{forecast.forecast30d.toFixed(1)} {forecast.unit}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2">
                              <p className="text-2xl font-bold">{forecast.suggestedPurchase}</p>
                              <p className="text-xs opacity-90">{forecast.unit}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">comprar</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t flex items-start gap-2">
                          <span className="text-lg">💡</span>
                          <p className="text-xs text-muted-foreground flex-1">
                            Esta quantidade mantém ~30 dias de operação com margem de segurança baseada na variabilidade histórica de consumo
                          </p>
                        </div>
                      </div>
                    ))}
                  {getFilteredForecasts().filter(f => f.suggestedPurchase > 0).length === 0 && (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <ShoppingCart className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-lg font-semibold mb-2">
                        {searchTerm ? 'Nenhum produto encontrado' : 'Estoque em bom estado!'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'Tente buscar outro produto' : 'Nenhuma compra necessária no momento'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Histórico de Movimentações
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative min-w-[250px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Badge variant="secondary" className="text-sm whitespace-nowrap">
                    {getFilteredMovements().length} movimentações
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Todas as entradas e saídas registradas no sistema
              </p>
              
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-3">
                  {getFilteredMovements().map((movement) => {
                    const product = products.find(p => p.id === movement.product_id);
                    const isExit = movement.type === "saida";
                    const isEntry = movement.type === "entrada";
                    
                    return (
                      <Card 
                        key={movement.id} 
                        className="p-4 border-l-4"
                        style={{
                          borderLeftColor: isExit ? 'hsl(var(--destructive))' : 
                                          isEntry ? 'hsl(var(--success))' : 
                                          'hsl(var(--muted))'
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{product?.name || 'Produto desconhecido'}</h4>
                              <Badge variant={isExit ? "destructive" : isEntry ? "default" : "secondary"}>
                                {movement.type}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Quantidade:</span>
                                <span className="font-medium">
                                  {isExit ? '-' : '+'}{Math.abs(Number(movement.quantity))} {product?.unit}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Data:</span>
                                <span className="font-medium">
                                  {new Date(movement.created_at).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Estoque anterior:</span>
                                <span className="font-medium">{movement.previous_quantity} {product?.unit}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Estoque novo:</span>
                                <span className="font-medium">{movement.new_quantity} {product?.unit}</span>
                              </div>
                            </div>
                            
                            {movement.command && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium">Comando:</span> {movement.command}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  
                  {getFilteredMovements().length === 0 && (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-semibold mb-2">
                        {searchTerm ? 'Nenhuma movimentação encontrada' : 'Nenhuma movimentação'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? 'Tente buscar outro produto' : 'Não há histórico de movimentações registradas'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Forecasts;
