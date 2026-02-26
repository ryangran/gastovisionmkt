import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Trash2, Send, Save, Clock, CheckCircle, Plus, Calendar, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface OrderItem {
  id: string;
  name: string;
  quantity: string;
  deliveryDate: string;
}

interface PurchaseOrder {
  id: string;
  panel_type: string;
  title: string | null;
  observations: string | null;
  items: OrderItem[];
  status: string;
  created_at: string;
}

const DRAFT_KEY = "pedidoCompra_draft";

const loadDraft = () => {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

const saveDraft = (title: string, items: OrderItem[], editingId: string | null) => {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, items, editingId }));
};

const clearDraft = () => {
  sessionStorage.removeItem(DRAFT_KEY);
};

const PedidoCompra = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const draft = loadDraft();
  const [orderTitle, setOrderTitle] = useState(draft?.title || "");
  const [items, setItems] = useState<OrderItem[]>(
    draft?.items || [{ id: crypto.randomUUID(), name: "", quantity: "", deliveryDate: "" }]
  );
  const [editingOrderId, setEditingOrderId] = useState<string | null>(draft?.editingId || null);
  
  const { hasPermission, isLoading: permissionLoading, userEmail } = usePagePermission("/pedido-compra");

  // Persist draft on every change
  useEffect(() => {
    saveDraft(orderTitle, items, editingOrderId);
  }, [orderTitle, items, editingOrderId]);

  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("panel_type", "admin")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? (order.items as unknown as OrderItem[]) : []
      })) as PurchaseOrder[];
    },
    enabled: !!hasPermission,
  });

  const refetchOrders = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
    resetForm();
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), name: "", quantity: "", deliveryDate: "" }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const hasValidItems = () => {
    return items.some(item => item.name.trim() !== "");
  };

  const resetForm = () => {
    setOrderTitle("");
    setItems([{ id: crypto.randomUUID(), name: "", quantity: "", deliveryDate: "" }]);
    setEditingOrderId(null);
    clearDraft();
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    setEditingOrderId(order.id);
    setOrderTitle(order.title || "");
    if (order.items && order.items.length > 0) {
      setItems(order.items.map(item => ({
        ...item,
        id: item.id || crypto.randomUUID()
      })));
    } else {
      setItems([{ id: crypto.randomUUID(), name: "", quantity: "", deliveryDate: "" }]);
    }
    // Scroll to top of the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveOrder = async () => {
    if (!hasValidItems()) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item ao pedido.",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(item => item.name.trim() !== "");

    try {
      if (editingOrderId) {
        // Update existing order
        const { error } = await supabase.from("purchase_orders").update({
          title: orderTitle.trim() || `Pedido ${new Date().toLocaleDateString("pt-BR")}`,
          items: JSON.parse(JSON.stringify(validItems)),
        }).eq("id", editingOrderId);

        if (error) throw error;

        toast({
          title: "Atualizado!",
          description: "Pedido de compra atualizado com sucesso.",
        });
      } else {
        // Create new order
        const { error } = await supabase.from("purchase_orders").insert([
          {
            panel_type: "admin",
            title: orderTitle.trim() || `Pedido ${new Date().toLocaleDateString("pt-BR")}`,
            observations: null,
            items: JSON.parse(JSON.stringify(validItems)),
            status: "pending",
          },
        ]);

        if (error) throw error;

        toast({
          title: "Salvo!",
          description: "Pedido de compra salvo com sucesso.",
        });
      }

      refetchOrders();
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o pedido.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from("purchase_orders").delete().eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Excluído",
        description: "Pedido removido com sucesso.",
      });

      refetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pedido.",
        variant: "destructive",
      });
    }
  };

  const handleMarkComplete = async (orderId: string) => {
    try {
      const { error } = await supabase.from("purchase_orders").update({ status: "completed" }).eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Concluído",
        description: "Pedido marcado como concluído.",
      });

      refetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pedido.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

  const generateOrderText = (order: PurchaseOrder) => {
    const date = new Date(order.created_at).toLocaleDateString("pt-BR");

    let text = `📦 PEDIDO DE COMPRA - ADMINISTRAÇÃO\n`;
    text += `📅 Data: ${date}\n`;
    if (order.title) text += `📋 ${order.title}\n`;
    text += `${"─".repeat(30)}\n\n`;
    
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        text += `${index + 1}. ${item.name}`;
        if (item.quantity) text += ` - Qtd: ${item.quantity}`;
        if (item.deliveryDate) text += ` - Entrega: ${formatDate(item.deliveryDate)}`;
        text += `\n`;
      });
    } else if (order.observations) {
      text += order.observations;
    }

    return text;
  };

  const handleSendWhatsApp = (order: PurchaseOrder) => {
    const text = encodeURIComponent(generateOrderText(order));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleSendNewWhatsApp = () => {
    if (!hasValidItems()) return;

    const date = new Date().toLocaleDateString("pt-BR");
    const validItems = items.filter(item => item.name.trim() !== "");

    let text = `📦 PEDIDO DE COMPRA - ADMINISTRAÇÃO\n`;
    text += `📅 Data: ${date}\n`;
    if (orderTitle.trim()) text += `📋 ${orderTitle}\n`;
    text += `${"─".repeat(30)}\n\n`;
    
    validItems.forEach((item, index) => {
      text += `${index + 1}. ${item.name}`;
      if (item.quantity) text += ` - Qtd: ${item.quantity}`;
      if (item.deliveryDate) text += ` - Entrega: ${formatDate(item.deliveryDate)}`;
      text += `\n`;
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Pedido de Compra</h1>
              <p className="text-xs text-muted-foreground">Adicione itens com prazos de entrega</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - New Order */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {editingOrderId ? "Editar Pedido" : "Novo Pedido"}
              </h2>
              {editingOrderId && (
                <Button size="sm" variant="ghost" onClick={resetForm} className="gap-1 text-muted-foreground">
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              )}
            </div>

            <Card className={`p-4 space-y-4 ${editingOrderId ? 'ring-2 ring-primary' : ''}`}>
              <Input 
                placeholder="Data do pedido (ex: 08/01/2026)" 
                value={orderTitle} 
                onChange={(e) => setOrderTitle(e.target.value)} 
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Itens do Pedido</span>
                  <Button size="sm" variant="outline" onClick={addItem} className="gap-1">
                    <Plus className="w-3 h-3" />
                    Adicionar Item
                  </Button>
                </div>

                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3 pr-2">
                    {items.map((item, index) => (
                      <div key={item.id} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-6">#{index + 1}</span>
                          <Input
                            placeholder="Nome do item"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, "name", e.target.value)}
                            className="flex-1"
                          />
                          {items.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2 ml-8">
                          <Input
                            placeholder="Quantidade"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                            className="w-28"
                          />
                          <div className="relative flex-1">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="date"
                              placeholder="Prazo de entrega"
                              value={item.deliveryDate}
                              onChange={(e) => updateItem(item.id, "deliveryDate", e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSendNewWhatsApp}
                  variant="outline"
                  className="flex-1 gap-2"
                  disabled={!hasValidItems()}
                >
                  <Send className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button onClick={handleSaveOrder} className="flex-1 gap-2" disabled={!hasValidItems()}>
                  <Save className="w-4 h-4" />
                  {editingOrderId ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column - Saved Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pedidos Salvos
            </h2>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {orders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{order.title || "Pedido sem título"}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                        {order.status === "completed" ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" /> Concluído
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" /> Pendente
                          </>
                        )}
                      </Badge>
                    </div>

                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-1 mb-3 bg-muted/50 p-2 rounded">
                        {order.items.map((item, index) => (
                          <div key={item.id || index} className="text-sm flex items-start gap-2">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <div className="flex-1">
                              <span className="font-medium">{item.name}</span>
                              {item.quantity && (
                                <span className="text-muted-foreground ml-2">Qtd: {item.quantity}</span>
                              )}
                              {item.deliveryDate && (
                                <span className="text-primary ml-2 text-xs">
                                  📅 {formatDate(item.deliveryDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : order.observations ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-3 bg-muted/50 p-2 rounded">
                        {order.observations}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSendWhatsApp(order)} className="gap-1">
                        <Send className="w-3 h-3" />
                        Enviar
                      </Button>
                      {order.status !== "completed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditOrder(order)}
                            className="gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkComplete(order.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Concluir
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteOrder(order.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}

                {orders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum pedido salvo</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PedidoCompra;
