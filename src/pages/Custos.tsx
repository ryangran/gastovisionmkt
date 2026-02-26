import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, DollarSign, Edit2, X, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface CostItem {
  id: string;
  platform: string;
  item_number: number | null;
  product_name: string;
  cost: number;
  additional_cost: number;
  sku: string | null;
  ean: string | null;
  weight: number | null;
  dimensions: string | null;
  profit_margin_percent: number | null;
  current_margin_value: number | null;
  stock: number | null;
  sale_price: number | null;
  full_price: number | null;
  ad_type: string | null;
  notes: string | null;
  created_at: string;
}

const platforms = [
  { id: "mercado_livre_bms", name: "Mercado Livre BMS" },
  { id: "mercado_livre_ms", name: "Mercado Livre MS" },
  { id: "shopee_bms", name: "Shopee BMS" },
  { id: "shopee_ms", name: "Shopee MS" },
  { id: "magalu_bms", name: "Magalu BMS" },
  { id: "amazon_bms", name: "Amazon BMS" },
  { id: "tiktok_bms", name: "TikTok BMS" },
  { id: "site_bms", name: "Site BMS" },
];

const Custos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(platforms[0].id);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<CostItem>>({});
  
  const { hasPermission, isLoading: permissionLoading, userEmail } = usePagePermission("/custos");
  
  // Form state for adding new products
  const [formData, setFormData] = useState({
    product_name: "",
    cost: "",
    additional_cost: "",
    sku: "",
    ean: "",
    weight: "",
    dimensions: "",
    profit_margin_percent: "",
    current_margin_value: "",
    stock: "",
    sale_price: "",
    full_price: "",
    ad_type: "",
    notes: "",
  });

  const startEditing = (cost: CostItem) => {
    setEditingId(cost.id);
    setEditingData({ ...cost });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEditing = () => {
    if (!editingId) return;
    updateCostMutation.mutate({ id: editingId, data: editingData });
  };

  const resetForm = () => {
    setFormData({
      product_name: "",
      cost: "",
      additional_cost: "",
      sku: "",
      ean: "",
      weight: "",
      dimensions: "",
      profit_margin_percent: "",
      current_margin_value: "",
      stock: "",
      sale_price: "",
      full_price: "",
      ad_type: "",
      notes: "",
    });
  };

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["platform_costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_costs")
        .select("*")
        .order("item_number", { ascending: true });
      
      if (error) throw error;
      return data as CostItem[];
    },
  });

  const addCostMutation = useMutation({
    mutationFn: async (data: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from("platform_costs")
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_costs"] });
      resetForm();
      setIsAddDialogOpen(false);
      toast({ title: "Produto adicionado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar produto", variant: "destructive" });
    },
  });

  const updateCostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CostItem> }) => {
      const { error } = await supabase
        .from("platform_costs")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_costs"] });
      setEditingId(null);
      toast({ title: "Produto atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    },
  });

  const deleteCostMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("platform_costs")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform_costs"] });
      toast({ title: "Produto removido!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover produto", variant: "destructive" });
    },
  });

  const handleAddProduct = () => {
    if (!formData.product_name.trim()) {
      toast({ title: "Nome do produto é obrigatório", variant: "destructive" });
      return;
    }

    const activePlatform = platforms.find(p => p.id === activeTab);
    const platformName = activePlatform?.name || activeTab;
    
    const platformCosts = getPlatformCosts(platformName);
    const nextItemNumber = platformCosts.length > 0 
      ? Math.max(...platformCosts.map(c => c.item_number || 0)) + 1 
      : 1;

    addCostMutation.mutate({
      platform: platformName,
      item_number: nextItemNumber,
      product_name: formData.product_name.trim(),
      cost: parseFloat(formData.cost) || 0,
      additional_cost: parseFloat(formData.additional_cost) || 0,
      sku: formData.sku || null,
      ean: formData.ean || null,
      weight: parseFloat(formData.weight) || null,
      dimensions: formData.dimensions || null,
      profit_margin_percent: parseFloat(formData.profit_margin_percent) || null,
      current_margin_value: parseFloat(formData.current_margin_value) || null,
      stock: parseInt(formData.stock) || null,
      sale_price: parseFloat(formData.sale_price) || null,
      full_price: parseFloat(formData.full_price) || null,
      ad_type: formData.ad_type || null,
      notes: formData.notes || null,
    });
  };

  const getPlatformCosts = (platformName: string) => {
    return costs.filter((cost) => cost.platform === platformName);
  };

  const getFilteredCosts = (platformId: string) => {
    const platformCosts = getPlatformCosts(platformId);
    if (!searchTerm) return platformCosts;
    
    const search = searchTerm.toLowerCase();
    return platformCosts.filter(
      (cost) =>
        cost.product_name.toLowerCase().includes(search) ||
        cost.sku?.toLowerCase().includes(search) ||
        cost.ean?.toLowerCase().includes(search)
    );
  };

  const getTotalCost = (platformId: string) => {
    return getPlatformCosts(platformId).reduce(
      (sum, cost) => sum + (cost.cost || 0) + (cost.additional_cost || 0),
      0
    );
  };

  const getTotalSales = (platformId: string) => {
    return getPlatformCosts(platformId).reduce(
      (sum, cost) => sum + (cost.sale_price || 0),
      0
    );
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "-";
    return `${value.toFixed(2)}%`;
  };

  if (permissionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return <AccessDenied userEmail={userEmail} />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Custos por Plataforma</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            {platforms.map((platform) => {
              const count = getPlatformCosts(platform.name).length;
              return (
                <TabsTrigger
                  key={platform.id}
                  value={platform.id}
                  className="text-xs sm:text-sm"
                >
                  {platform.name} {count > 0 && `(${count})`}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {platforms.map((platform) => (
            <TabsContent key={platform.id} value={platform.id}>
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Produtos</p>
                      <p className="text-2xl font-bold">{getPlatformCosts(platform.name).length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Custos</p>
                      <p className="text-2xl font-bold text-destructive">
                        {formatCurrency(getTotalCost(platform.name))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Vendas</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(getTotalSales(platform.name))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Margem Média</p>
                      <p className="text-2xl font-bold text-green-500">
                        {formatPercent(
                          getPlatformCosts(platform.name).reduce(
                            (sum, c) => sum + (c.profit_margin_percent || 0),
                            0
                          ) / (getPlatformCosts(platform.name).length || 1)
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Search and Add */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, SKU ou EAN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => resetForm()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Produto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Adicionar Produto - {platform.name}</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="col-span-2">
                          <Label>Nome do Produto *</Label>
                          <Input
                            value={formData.product_name}
                            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Custo (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Custo Adicional (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.additional_cost}
                            onChange={(e) => setFormData({ ...formData, additional_cost: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>SKU</Label>
                          <Input
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>EAN</Label>
                          <Input
                            value={formData.ean}
                            onChange={(e) => setFormData({ ...formData, ean: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Peso (kg)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Dimensões (LxAxC)</Label>
                          <Input
                            value={formData.dimensions}
                            onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Margem (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.profit_margin_percent}
                            onChange={(e) => setFormData({ ...formData, profit_margin_percent: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Margem Atual (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.current_margin_value}
                            onChange={(e) => setFormData({ ...formData, current_margin_value: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Estoque</Label>
                          <Input
                            type="number"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Preço de Venda (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.sale_price}
                            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Preço Cheio (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.full_price}
                            onChange={(e) => setFormData({ ...formData, full_price: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Tipo de Anúncio</Label>
                          <Input
                            value={formData.ad_type}
                            onChange={(e) => setFormData({ ...formData, ad_type: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Observações</Label>
                          <Input
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddProduct} disabled={addCostMutation.isPending}>
                          Adicionar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Products Table */}
                <Card>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <p className="text-muted-foreground text-center py-8">Carregando...</p>
                    ) : getFilteredCosts(platform.name).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        {searchTerm
                          ? "Nenhum produto encontrado"
                          : `Nenhum produto cadastrado para ${platform.name}`}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead className="min-w-[200px]">Produto</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-right">Custo</TableHead>
                              <TableHead className="text-right">Custo Adic.</TableHead>
                              <TableHead className="text-right">Preço Venda</TableHead>
                              <TableHead className="text-right">Margem %</TableHead>
                              <TableHead className="text-right">Margem R$</TableHead>
                              <TableHead className="text-center">Estoque</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getFilteredCosts(platform.name).map((cost) => (
                              <TableRow key={cost.id}>
                                <TableCell className="font-medium">{cost.item_number}</TableCell>
                                <TableCell>
                                  {editingId === cost.id ? (
                                    <div className="space-y-1">
                                      <Input
                                        value={editingData.product_name || ""}
                                        onChange={(e) => setEditingData({ ...editingData, product_name: e.target.value })}
                                        className="h-8 text-sm"
                                      />
                                      <Input
                                        placeholder="EAN"
                                        value={editingData.ean || ""}
                                        onChange={(e) => setEditingData({ ...editingData, ean: e.target.value })}
                                        className="h-7 text-xs"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="font-medium text-sm">{cost.product_name}</p>
                                      {cost.ean && (
                                        <p className="text-xs text-muted-foreground">EAN: {cost.ean}</p>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingId === cost.id ? (
                                    <Input
                                      value={editingData.sku || ""}
                                      onChange={(e) => setEditingData({ ...editingData, sku: e.target.value })}
                                      className="h-8 text-xs w-24"
                                    />
                                  ) : (
                                    <span className="text-xs">{cost.sku || "-"}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingId === cost.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingData.cost || ""}
                                      onChange={(e) => setEditingData({ ...editingData, cost: parseFloat(e.target.value) || 0 })}
                                      className="h-8 text-xs w-20 text-right"
                                    />
                                  ) : (
                                    formatCurrency(cost.cost)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingId === cost.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingData.additional_cost || ""}
                                      onChange={(e) => setEditingData({ ...editingData, additional_cost: parseFloat(e.target.value) || 0 })}
                                      className="h-8 text-xs w-20 text-right"
                                    />
                                  ) : (
                                    formatCurrency(cost.additional_cost)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingId === cost.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingData.sale_price || ""}
                                      onChange={(e) => setEditingData({ ...editingData, sale_price: parseFloat(e.target.value) || null })}
                                      className="h-8 text-xs w-20 text-right"
                                    />
                                  ) : (
                                    <span className="font-medium text-primary">{formatCurrency(cost.sale_price)}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingId === cost.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingData.profit_margin_percent || ""}
                                      onChange={(e) => setEditingData({ ...editingData, profit_margin_percent: parseFloat(e.target.value) || null })}
                                      className="h-8 text-xs w-16 text-right"
                                    />
                                  ) : (
                                    <span className={cost.profit_margin_percent && cost.profit_margin_percent >= 20 ? "text-green-500" : "text-yellow-500"}>
                                      {formatPercent(cost.profit_margin_percent)}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingId === cost.id ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editingData.current_margin_value || ""}
                                      onChange={(e) => setEditingData({ ...editingData, current_margin_value: parseFloat(e.target.value) || null })}
                                      className="h-8 text-xs w-20 text-right"
                                    />
                                  ) : (
                                    formatCurrency(cost.current_margin_value)
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {editingId === cost.id ? (
                                    <Input
                                      type="number"
                                      value={editingData.stock || ""}
                                      onChange={(e) => setEditingData({ ...editingData, stock: parseInt(e.target.value) || null })}
                                      className="h-8 text-xs w-16 text-center"
                                    />
                                  ) : (
                                    cost.stock ?? "-"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingId === cost.id ? (
                                    <Input
                                      value={editingData.ad_type || ""}
                                      onChange={(e) => setEditingData({ ...editingData, ad_type: e.target.value })}
                                      className="h-8 text-xs w-20"
                                      placeholder="PREMIUM/CLÁSSICO"
                                    />
                                  ) : (
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                                      cost.ad_type?.toUpperCase() === "PREMIUM" 
                                        ? "bg-[#FF7733]/20 text-[#FF7733]" 
                                        : cost.ad_type?.toUpperCase() === "CLÁSSICO" || cost.ad_type?.toUpperCase() === "CLASSICO"
                                          ? "bg-[#00A650]/20 text-[#00A650]"
                                          : "bg-muted text-muted-foreground"
                                    }`}>
                                      {cost.ad_type || "-"}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingId === cost.id ? (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={saveEditing}
                                        disabled={updateCostMutation.isPending}
                                        className="h-8 w-8"
                                      >
                                        <Check className="h-4 w-4 text-green-500" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={cancelEditing}
                                        className="h-8 w-8"
                                      >
                                        <X className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => startEditing(cost)}
                                        className="h-8 w-8"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteCostMutation.mutate(cost.id)}
                                        disabled={deleteCostMutation.isPending}
                                        className="h-8 w-8"
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Custos;
