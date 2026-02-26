import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, AlertCircle, TrendingUp, TrendingDown, FileSpreadsheet, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock: number;
  barcode?: string | null;
  created_at: string;
  updated_at: string;
}

interface Movement {
  id: string;
  type: string;
  quantity: number;
  created_at: string;
  product_id: string;
}

interface ProductsTableProps {
  panelType: "production" | "admin";
}

interface EditingCell {
  productId: string;
  field: "quantity" | "min_stock" | "barcode";
  value: string;
}

export function ProductsTable({ panelType }: ProductsTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products", panelType],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("panel_type", panelType)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Product[];
    },
  });

  const { data: recentMovements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ["movements", panelType, showAllMovements],
    queryFn: async () => {
      let query = (supabase as any)
        .from("movements")
        .select("*")
        .eq("panel_type", panelType)
        .order("created_at", { ascending: false });
      if (!showAllMovements) {
        query = query.limit(10);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Movement[];
    },
  });

  const loading = loadingProducts || loadingMovements;

  useEffect(() => {
    // Subscribe to realtime changes filtered by panel_type
    const productsChannel = supabase
      .channel(`products-changes-${panelType}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `panel_type=eq.${panelType}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products", panelType] });
        }
      )
      .subscribe();

    const movementsChannel = supabase
      .channel(`movements-changes-${panelType}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "movements",
          filter: `panel_type=eq.${panelType}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["movements", panelType] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(movementsChannel);
    };
  }, [panelType, queryClient]);

  const startEditing = (productId: string, field: "quantity" | "min_stock" | "barcode", currentValue: number | string) => {
    setEditingCell({ productId, field, value: String(currentValue) });
  };

  const cancelEditing = () => {
    setEditingCell(null);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const product = products.find(p => p.id === editingCell.productId);
    if (!product) return;

    try {
      let updateData: Record<string, any>;

      if (editingCell.field === "barcode") {
        updateData = { barcode: editingCell.value.trim() || null };
      } else {
        const newValue = parseFloat(editingCell.value);
        if (isNaN(newValue) || newValue < 0) {
          toast.error("Valor inválido");
          return;
        }
        updateData = editingCell.field === "quantity" 
          ? { quantity: newValue } 
          : { min_stock: newValue };
      }

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", editingCell.productId);

      if (error) throw error;

      const fieldLabels = {
        quantity: "Quantidade",
        min_stock: "Estoque mínimo",
        barcode: "Código de barras"
      };
      toast.success(`${fieldLabels[editingCell.field]} atualizado!`);
      setEditingCell(null);
      queryClient.invalidateQueries({ queryKey: ["products", panelType] });
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar valor");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity <= minStock) {
      return { label: "Baixo", variant: "destructive" as const, icon: AlertCircle, color: "#ef4444" };
    }
    if (quantity <= minStock * 1.5) {
      return { label: "Atenção", variant: "warning" as const, icon: AlertCircle, color: "#f97316" };
    }
    return { label: "OK", variant: "success" as const, icon: Package, color: "#22c55e" };
  };

  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ["Produto", "Código de Barras", "Quantidade", "Estoque Mínimo", "Status"];
      const rows = products.map((product) => {
        const status = getStockStatus(Number(product.quantity), Number(product.min_stock));
        return [
          product.name,
          product.barcode || "-",
          `${product.quantity} ${product.unit}`,
          `${product.min_stock} ${product.unit}`,
          status.label,
        ];
      });

      // Convert to CSV string
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Create blob and download
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-estoque-${date}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Produtos</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Estoque Baixo</p>
              <p className="text-2xl font-bold text-destructive">
                {products.filter((p) => Number(p.quantity) <= Number(p.min_stock)).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Movimentações Hoje</p>
              <p className="text-2xl font-bold">
                {recentMovements.filter((m) => {
                  const today = new Date().toDateString();
                  return new Date(m.created_at).toDateString() === today;
                }).length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-success" />
          </div>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">📦 Produtos em Estoque</h2>
              <p className="text-sm text-muted-foreground">
                Lista completa de produtos cadastrados
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(panelType === "admin" ? "/relatorios-admin" : "/relatorios")}
              >
                Ver Relatórios
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Código de Barras</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Estoque Mínimo</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum produto cadastrado. Use o chat para cadastrar produtos!
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const status = getStockStatus(
                    Number(product.quantity),
                    Number(product.min_stock)
                  );
                  const StatusIcon = status.icon;

                  return (
                    <TableRow
                      key={product.id}
                      className={cn(
                        "transition-colors",
                        Number(product.quantity) <= Number(product.min_stock) &&
                          "bg-destructive/5"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn(
                            "w-4 h-4",
                            status.variant === "destructive" && "text-destructive",
                            status.variant === "warning" && "text-warning",
                            status.variant === "success" && "text-success"
                          )} />
                          {product.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === "barcode" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onKeyDown={handleKeyDown}
                              className="w-28 h-8"
                              autoFocus
                              placeholder="BMS-0000"
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded transition-colors"
                            onClick={() => startEditing(product.id, "barcode", product.barcode || "")}
                            title="Clique para editar"
                          >
                            {product.barcode || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingCell?.productId === product.id && editingCell?.field === "quantity" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onKeyDown={handleKeyDown}
                              className="w-20 h-8 text-right"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span 
                            className="font-semibold cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded transition-colors"
                            onClick={() => startEditing(product.id, "quantity", Number(product.quantity))}
                            title="Clique para editar"
                          >
                            {product.quantity} {product.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingCell?.productId === product.id && editingCell?.field === "min_stock" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              onKeyDown={handleKeyDown}
                              className="w-20 h-8 text-right"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span 
                            className="text-muted-foreground cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded transition-colors"
                            onClick={() => startEditing(product.id, "min_stock", Number(product.min_stock))}
                            title="Clique para editar"
                          >
                            {product.min_stock} {product.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Recent Movements */}
      {recentMovements.length > 0 && (
        <Card>
          <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">📊 Movimentações {showAllMovements ? "Completas" : "Recentes"}</h2>
                <p className="text-sm text-muted-foreground">
                  {showAllMovements ? "Todas as operações realizadas" : "Últimas 10 operações realizadas"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllMovements(!showAllMovements)}
                >
                  {showAllMovements ? "Ver Recentes" : "Ver Tudo"}
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-2">
              {recentMovements.map((movement) => {
                const product = products.find((p) => p.id === movement.product_id);
                const isEntry = movement.type === "entrada" || movement.type === "cadastro";

                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isEntry ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product?.name || "Produto desconhecido"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-semibold",
                        isEntry ? "text-success" : "text-destructive"
                      )}>
                        {isEntry ? "+" : "-"}{movement.quantity} {product?.unit || ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}