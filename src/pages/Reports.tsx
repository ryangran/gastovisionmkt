import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, TrendingUp, TrendingDown, Package, BarChart3 } from "lucide-react";
import { AdsAnalyzer } from "@/components/AdsAnalyzer";
import { AdsComparisonAnalyzer } from "@/components/AdsComparisonAnalyzer";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock?: number;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  created_at: string;
  product_id: string;
}

interface ReportsProps {
  panelType?: "production" | "admin";
}

export default function Reports({ panelType = "production" }: ReportsProps) {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: productsData } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("panel_type", panelType);

      const { data: movementsData } = await (supabase as any)
        .from("movements")
        .select("*")
        .eq("panel_type", panelType)
        .order("created_at", { ascending: false });

      if (productsData) setProducts(productsData);
      if (movementsData) setMovements(movementsData);
      
      setLoading(false);
    };

    fetchData();
  }, [panelType]);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "Desconhecido";
  };

  // Análise de Entradas vs Saídas por Produto
  const entriesVsExitsData = products.map(product => {
    const productMovements = movements.filter(m => m.product_id === product.id);
    const entries = productMovements
      .filter(m => m.type === "entrada" || m.type === "cadastro")
      .reduce((sum, m) => sum + Number(m.quantity), 0);
    const exits = productMovements
      .filter(m => m.type === "saida")
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    return {
      name: product.name.length > 15 ? product.name.substring(0, 15) + "..." : product.name,
      fullName: product.name,
      Entradas: entries,
      Saídas: exits,
    };
  }).filter(item => item.Entradas > 0 || item.Saídas > 0);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-black mb-2">{payload[0].payload.fullName}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-black">
              {entry.name}: <span 
                className="font-bold" 
                style={{ color: entry.name === "Entradas" ? "#22c55e" : entry.name === "Saídas" ? "#ef4444" : "#000" }}
              >
                {entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Produtos com Mais Saídas
  const topMovedProducts = products
    .map(product => ({
      name: product.name,
      total: movements.filter(m => m.product_id === product.id && m.type === "saida").reduce((sum, m) => sum + Number(m.quantity), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .filter(item => item.total > 0)
    .map(item => ({
      name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
      fullName: item.name,
      saídas: item.total,
    }));

  // Status do Estoque (Distribuição)
  const stockStatusData = [
    {
      name: "Estoque Crítico",
      value: products.filter(p => Number(p.quantity) <= Number(p.min_stock || 0)).length,
      color: "#ef4444",
    },
    {
      name: "Estoque Atenção",
      value: products.filter(p => {
        const qty = Number(p.quantity);
        const min = Number(p.min_stock || 0);
        return qty > min && qty <= min * 1.5;
      }).length,
      color: "#f97316",
    },
    {
      name: "Estoque OK",
      value: products.filter(p => Number(p.quantity) > Number(p.min_stock || 0) * 1.5).length,
      color: "#22c55e",
    },
  ].filter(item => item.value > 0);

  // Movimentações por Dia (últimos 7 dias)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const movementsByDay = last7Days.map(date => {
    const dayMovements = movements.filter(m => 
      m.created_at.startsWith(date)
    );
    const entries = dayMovements
      .filter(m => m.type === "entrada" || m.type === "cadastro")
      .reduce((sum, m) => sum + Number(m.quantity), 0);
    const exits = dayMovements
      .filter(m => m.type === "saida")
      .reduce((sum, m) => sum + Number(m.quantity), 0);

    return {
      data: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      Entradas: entries,
      Saídas: exits,
    };
  });

  // Estatísticas Gerais
  const totalEntries = movements
    .filter(m => m.type === "entrada" || m.type === "cadastro")
    .reduce((sum, m) => sum + Number(m.quantity), 0);
  
  const totalExits = movements
    .filter(m => m.type === "saida")
    .reduce((sum, m) => sum + Number(m.quantity), 0);

  const totalStock = products.reduce((sum, p) => sum + Number(p.quantity), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(panelType === "admin" ? "/estoque" : "/producao")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">📊 Relatórios e Análises</h1>
            <p className="text-muted-foreground">Análise completa de estoque e movimentações</p>
          </div>
          <div className="flex gap-2">
            <AdsAnalyzer />
            <AdsComparisonAnalyzer />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total em Estoque</p>
                <p className="text-2xl font-bold">{totalStock}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Produtos</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Entradas</p>
                <p className="text-2xl font-bold text-success">{totalEntries}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Saídas</p>
                <p className="text-2xl font-bold text-destructive">{totalExits}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-destructive" />
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entradas vs Saídas */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Entradas vs Saídas por Produto</h3>
            <ScrollArea className="h-[350px]">
              <ResponsiveContainer width="100%" height={Math.max(300, entriesVsExitsData.length * 50)}>
                <BarChart data={entriesVsExitsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Entradas" fill="#22c55e" />
                  <Bar dataKey="Saídas" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </ScrollArea>
          </Card>

          {/* Produtos com Mais Saídas */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top 5 Produtos com Mais Saídas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topMovedProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="saídas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Status do Estoque */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição do Status de Estoque</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Movimentações nos Últimos 7 Dias */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Movimentações nos Últimos 7 Dias</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={movementsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Entradas" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
