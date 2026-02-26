import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { logCentralDecision } from "@/hooks/useCompanyMemory";
import { 
  ArrowLeft, 
  ShoppingCart, 
  TrendingDown, 
  Eye, 
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  XCircle,
  ExternalLink,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface Product {
  id: string;
  name: string;
  quantity: number;
  min_stock: number;
  unit: string;
  panel_type: string;
}

interface Movement {
  product_id: string;
  quantity: number;
  type: string;
  created_at: string;
}

interface PlatformCost {
  id: string;
  product_name: string;
  platform: string;
  cost: number;
  sale_price: number | null;
  profit_margin_percent: number | null;
  stock: number | null;
}

interface DecisionItem {
  id: string;
  name: string;
  stock: number;
  avgConsumption: number;
  daysOfCoverage: number;
  suggestedPurchase: number;
  unit: string;
  margin?: number;
  targetMargin?: number;
  platform?: string;
  reason: string;
}

const CentralDecisoes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [platformCosts, setPlatformCosts] = useState<PlatformCost[]>([]);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ item: DecisionItem; block: string } | null>(null);
  const [justification, setJustification] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskItem, setTaskItem] = useState<{ item: DecisionItem; block: string } | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string>("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (!roles?.some(r => r.role === "admin")) {
      navigate("/");
      return;
    }
    
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, movementsRes, costsRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("movements").select("*").order("created_at", { ascending: false }),
        supabase.from("platform_costs").select("*")
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (movementsRes.data) setMovements(movementsRes.data);
      if (costsRes.data) setPlatformCosts(costsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateConsumption = (productId: string): number => {
    const productMovements = movements.filter(
      m => m.product_id === productId && m.type === "saida"
    );
    
    if (productMovements.length === 0) return 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentMovements = productMovements.filter(
      m => new Date(m.created_at) >= thirtyDaysAgo
    );
    
    const totalOut = recentMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity)), 0);
    return totalOut / 30;
  };

  const { buyNowItems, adjustPriceItems, monitorItems } = useMemo(() => {
    const buyNow: DecisionItem[] = [];
    const adjustPrice: DecisionItem[] = [];
    const monitor: DecisionItem[] = [];
    const processedIds = new Set<string>();

    // Process products for buy now and monitor
    products.forEach(product => {
      const avgConsumption = calculateConsumption(product.id);
      
      const daysOfCoverage = avgConsumption > 0 ? product.quantity / avgConsumption : 999;
      const suggestedPurchase = Math.max(0, Math.ceil((30 * avgConsumption) - product.quantity));

      const item: DecisionItem = {
        id: product.id,
        name: product.name,
        stock: product.quantity,
        avgConsumption,
        daysOfCoverage,
        suggestedPurchase,
        unit: product.unit,
        reason: ""
      };

      // BUY NOW: stock <= min_stock (includes zero and any low stock)
      if (product.quantity <= product.min_stock) {
        if (product.quantity === 0) {
          item.reason = "Estoque zerado";
        } else if (daysOfCoverage < 7 && avgConsumption > 0) {
          item.reason = `Cobertura: ${daysOfCoverage.toFixed(0)} dias`;
        } else {
          item.reason = `Estoque abaixo do mínimo (${product.min_stock} ${product.unit})`;
        }
        buyNow.push(item);
        processedIds.add(product.id);
      }
      // MONITOR: close to min stock but not critical, or high stock with low sales
      else if (
        (product.quantity <= product.min_stock * 1.5 && product.quantity > product.min_stock) ||
        (product.quantity > product.min_stock * 3 && avgConsumption < 0.5)
      ) {
        if (product.quantity > product.min_stock * 3) {
          item.reason = "Estoque alto, baixa saída";
        } else {
          item.reason = "Próximo do estoque mínimo";
        }
        monitor.push(item);
        processedIds.add(product.id);
      }
    });

    // Process platform costs for price adjustments
    const MIN_MARGIN = 15; // 15% minimum margin
    platformCosts.forEach(cost => {
      if (processedIds.has(cost.id)) return;
      
      const margin = cost.profit_margin_percent ?? 0;
      
      if (margin < MIN_MARGIN || margin < 0) {
        adjustPrice.push({
          id: cost.id,
          name: cost.product_name,
          stock: cost.stock ?? 0,
          avgConsumption: 0,
          daysOfCoverage: 999,
          suggestedPurchase: 0,
          unit: "un",
          margin: margin,
          targetMargin: MIN_MARGIN,
          platform: cost.platform,
          reason: margin < 0 ? "Margem negativa" : `Margem abaixo de ${MIN_MARGIN}%`
        });
        processedIds.add(cost.id);
      }
    });

    // Sort by criticality
    buyNow.sort((a, b) => a.daysOfCoverage - b.daysOfCoverage);
    adjustPrice.sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));
    monitor.sort((a, b) => a.daysOfCoverage - b.daysOfCoverage);

    return { buyNowItems: buyNow, adjustPriceItems: adjustPrice, monitorItems: monitor };
  }, [products, movements, platformCosts]);

  const logDecision = async (item: DecisionItem, actionType: string, blockType: string, justificationText?: string) => {
    try {
      await supabase.from("decision_history").insert({
        product_id: item.id,
        product_name: item.name,
        action_type: actionType,
        block_type: blockType,
        justification: justificationText || null,
        user_email: user?.email
      });
    } catch (error) {
      console.error("Error logging decision:", error);
    }
  };

  const handleCreatePurchaseOrder = async (item: DecisionItem) => {
    setActionLoading(item.id);
    try {
      const orderItem = {
        productId: item.id,
        productName: item.name,
        quantity: item.suggestedPurchase,
        unit: item.unit
      };

      await supabase.from("purchase_orders").insert({
        title: `Pedido Urgente - ${item.name}`,
        items: [orderItem],
        status: "pending",
        observations: `Gerado pela Central de Decisões. Motivo: ${item.reason}`
      });

      await logDecision(item, "purchase_order", "buy_now");
      
      // Log to Company Memory
      await logCentralDecision(
        user?.email || "Sistema",
        item.name,
        `Pedido de compra gerado: ${item.suggestedPurchase} ${item.unit}`,
        "buy_now",
        item.id
      );
      
      toast({
        title: "Pedido criado",
        description: `Pedido de compra para ${item.name} criado com sucesso.`
      });
      
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o pedido.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTask = (item: DecisionItem, blockType: string) => {
    setTaskItem({ item, block: blockType });
    setSelectedPerson("");
    setTaskDialogOpen(true);
  };

  const confirmCreateTask = async () => {
    if (!taskItem || !selectedPerson) {
      toast({
        title: "Selecione um funcionário",
        description: "Por favor, escolha para quem a tarefa será atribuída.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(taskItem.item.id);
    try {
      const taskTitle = taskItem.block === "buy_now" 
        ? `Verificar compra: ${taskItem.item.name}`
        : taskItem.block === "adjust_price"
        ? `Ajustar preço: ${taskItem.item.name}`
        : `Monitorar: ${taskItem.item.name}`;

      await supabase.from("crm_tasks").insert({
        title: taskTitle,
        description: `Ação gerada pela Central de Decisões. Motivo: ${taskItem.item.reason}`,
        person_name: selectedPerson,
        status: "pending"
      });

      // Log to Company Memory
      await logCentralDecision(
        user?.email || "Sistema",
        taskItem.item.name,
        `Tarefa criada para ${selectedPerson}: ${taskTitle}`,
        taskItem.block,
        taskItem.item.id
      );
      
      toast({
        title: "Tarefa criada",
        description: `Tarefa para ${taskItem.item.name} atribuída a ${selectedPerson}.`
      });

      setTaskDialogOpen(false);
      setTaskItem(null);
      setSelectedPerson("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleIgnore = (item: DecisionItem, blockType: string) => {
    setSelectedItem({ item, block: blockType });
    setJustification("");
    setIgnoreDialogOpen(true);
  };

  const confirmIgnore = async () => {
    if (!selectedItem || !justification.trim()) {
      toast({
        title: "Justificativa obrigatória",
        description: "Por favor, informe o motivo para ignorar este item.",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(selectedItem.item.id);
    try {
      await logDecision(selectedItem.item, "ignore", selectedItem.block, justification);
      
      // Log to Company Memory
      await logCentralDecision(
        user?.email || "Sistema",
        selectedItem.item.name,
        `Item ignorado: ${justification.slice(0, 100)}`,
        selectedItem.block,
        selectedItem.item.id
      );
      
      toast({
        title: "Item ignorado",
        description: `${selectedItem.item.name} foi ignorado com justificativa.`
      });
      
      setIgnoreDialogOpen(false);
      setSelectedItem(null);
      setJustification("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a ação.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPricing = async (item: DecisionItem) => {
    await logDecision(item, "open_pricing", "adjust_price");
    navigate("/custos");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasNoActions = buyNowItems.length === 0 && adjustPriceItems.length === 0 && monitorItems.length === 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Decisões</h1>
          <p className="text-sm text-muted-foreground">Tome decisões rápidas em menos de 5 minutos</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-500">{buyNowItems.length}</div>
            <div className="text-sm text-muted-foreground">Comprar Agora</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{adjustPriceItems.length}</div>
            <div className="text-sm text-muted-foreground">Ajustar Preço</div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-500">{monitorItems.length}</div>
            <div className="text-sm text-muted-foreground">Monitorar</div>
          </CardContent>
        </Card>
      </div>

      {/* No Actions Needed */}
      {hasNoActions && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nada a Fazer</h2>
            <p className="text-muted-foreground">
              Todos os produtos estão saudáveis hoje. Nenhuma ação necessária.
            </p>
          </CardContent>
        </Card>
      )}

      {/* BUY NOW Block */}
      {buyNowItems.length > 0 && (
        <Card className="mb-6 border-red-500/30">
          <CardHeader className="bg-red-500/10 border-b border-red-500/20">
            <CardTitle className="flex items-center gap-2 text-red-500">
              <ShoppingCart className="h-5 w-5" />
              Comprar Agora
              <Badge variant="destructive">{buyNowItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {buyNowItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  index !== buyNowItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <Badge variant="destructive" className="text-xs">URGENTE</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Estoque: <strong className="text-foreground">{item.stock} {item.unit}</strong></span>
                    <span>Consumo/dia: <strong className="text-foreground">{item.avgConsumption.toFixed(1)}</strong></span>
                    <span>Sugestão: <strong className="text-green-500">{item.suggestedPurchase} {item.unit}</strong></span>
                  </div>
                  <div className="text-xs text-red-400 mt-1">{item.reason}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleCreatePurchaseOrder(item)}
                    disabled={actionLoading === item.id}
                  >
                    {actionLoading === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
                    Gerar Pedido
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCreateTask(item, "buy_now")}
                    disabled={actionLoading === item.id}
                  >
                    <ClipboardList className="h-4 w-4 mr-1" />
                    Criar Tarefa
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleIgnore(item, "buy_now")}
                    disabled={actionLoading === item.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ignorar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ADJUST PRICE Block */}
      {adjustPriceItems.length > 0 && (
        <Card className="mb-6 border-yellow-500/30">
          <CardHeader className="bg-yellow-500/10 border-b border-yellow-500/20">
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <TrendingDown className="h-5 w-5" />
              Ajustar Preço
              <Badge className="bg-yellow-500 text-black">{adjustPriceItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {adjustPriceItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  index !== adjustPriceItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{item.name}</span>
                    {item.platform && (
                      <Badge variant="outline" className="text-xs">{item.platform}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Margem atual: <strong className={item.margin && item.margin < 0 ? "text-red-500" : "text-yellow-500"}>{item.margin?.toFixed(1)}%</strong></span>
                    <span>Margem alvo: <strong className="text-green-500">{item.targetMargin}%</strong></span>
                  </div>
                  <div className="text-xs text-yellow-400 mt-1">{item.reason}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleOpenPricing(item)}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Abrir Precificação
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCreateTask(item, "adjust_price")}
                    disabled={actionLoading === item.id}
                  >
                    <ClipboardList className="h-4 w-4 mr-1" />
                    Criar Tarefa
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleIgnore(item, "adjust_price")}
                    disabled={actionLoading === item.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ignorar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* MONITOR Block */}
      {monitorItems.length > 0 && (
        <Card className="mb-6 border-blue-500/30">
          <CardHeader className="bg-blue-500/10 border-b border-blue-500/20">
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <Eye className="h-5 w-5" />
              Monitorar
              <Badge className="bg-blue-500">{monitorItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {monitorItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  index !== monitorItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      ATENÇÃO
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Estoque: <strong className="text-foreground">{item.stock} {item.unit}</strong></span>
                    <span>Consumo/dia: <strong className="text-foreground">{item.avgConsumption.toFixed(1)}</strong></span>
                  </div>
                  <div className="text-xs text-blue-400 mt-1">{item.reason}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCreateTask(item, "monitor")}
                    disabled={actionLoading === item.id}
                  >
                    <ClipboardList className="h-4 w-4 mr-1" />
                    Criar Tarefa
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleIgnore(item, "monitor")}
                    disabled={actionLoading === item.id}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Ignorar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ignore Dialog */}
      <AlertDialog open={ignoreDialogOpen} onOpenChange={setIgnoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorar Item</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo para ignorar "{selectedItem?.item.name}".
              Esta justificativa será registrada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Justificativa obrigatória..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmIgnore} disabled={!justification.trim()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Assignment Dialog */}
      <AlertDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione para qual funcionário a tarefa "{taskItem?.item.name}" será atribuída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="person-select" className="mb-2 block">Responsável</Label>
            <Select value={selectedPerson} onValueChange={setSelectedPerson}>
              <SelectTrigger id="person-select">
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ryan">Ryan</SelectItem>
                <SelectItem value="Miria">Miria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCreateTask} disabled={!selectedPerson}>
              Criar Tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CentralDecisoes;
