import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus,
  Search,
  Package,
  DollarSign,
  Factory,
  Megaphone,
  PauseCircle,
  Settings,
  Lightbulb,
  Calendar,
  User,
  MapPin,
  Filter,
  Loader2,
  X,
  Clock,
  Trash2
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface MemoryEntry {
  id: string;
  created_at: string;
  user_email: string;
  origin: string;
  product_id: string | null;
  product_name: string | null;
  sku: string | null;
  channel: string | null;
  category: string;
  summary: string;
  reason: string | null;
  notes: string | null;
  employee_name: string | null;
}

const EMPLOYEES = [
  "Ryan",
  "Miria", 
  "Bianca",
  "Marco",
  "Marcilia",
];

interface Product {
  id: string;
  name: string;
  barcode: string | null;
}

const CATEGORIES = [
  { value: "compra", label: "Compra / Reposição", icon: Package, color: "bg-blue-500" },
  { value: "preco", label: "Preço / Margem", icon: DollarSign, color: "bg-green-500" },
  { value: "producao", label: "Produção", icon: Factory, color: "bg-orange-500" },
  { value: "marketing", label: "Marketing / ADS", icon: Megaphone, color: "bg-pink-500" },
  { value: "pausa", label: "Pausa / Problema", icon: PauseCircle, color: "bg-red-500" },
  { value: "ajuste", label: "Ajuste Operacional", icon: Settings, color: "bg-purple-500" },
  { value: "estrategia", label: "Estratégia", icon: Lightbulb, color: "bg-yellow-500" },
];

const ORIGINS = [
  { value: "manual", label: "Manual" },
  { value: "central_decisoes", label: "Central de Decisões" },
  { value: "pedido_compra", label: "Pedido de Compra" },
  { value: "precificacao", label: "Precificação" },
  { value: "estoque", label: "Estoque" },
];

const CHANNELS = [
  { value: "mercado_livre", label: "Mercado Livre" },
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee" },
  { value: "magalu", label: "Magalu" },
  { value: "site", label: "Site Próprio" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "geral", label: "Geral" },
];

const QUICK_REASONS = [
  "Aumento de vendas",
  "Queda de vendas",
  "Estoque baixo",
  "Estoque alto",
  "Margem baixa",
  "Concorrência",
  "Sazonalidade",
  "Problema de qualidade",
  "Fornecedor",
  "Estratégia de preço",
  "Teste de mercado",
  "Outro",
];

const MemoriaEmpresa = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<MemoryEntry | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // New entry form
  const [newEntry, setNewEntry] = useState({
    category: "",
    summary: "",
    reason: "",
    notes: "",
    product_id: "",
    channel: "",
    employee_name: "",
  });

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
      const [entriesRes, productsRes] = await Promise.all([
        supabase
          .from("company_memory")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("products").select("id, name, barcode")
      ]);

      if (entriesRes.data) setEntries(entriesRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = searchTerm === "" || 
        entry.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === "all" || entry.category === filterCategory;
      const matchesChannel = filterChannel === "all" || entry.channel === filterChannel;

      return matchesSearch && matchesCategory && matchesChannel;
    });
  }, [entries, searchTerm, filterCategory, filterChannel]);

  const handleCreateEntry = async () => {
    if (!newEntry.category || !newEntry.summary.trim() || !newEntry.employee_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a categoria, funcionário e escreva um resumo.",
        variant: "destructive"
      });
      return;
    }

    if (newEntry.summary.length > 200) {
      toast({
        title: "Resumo muito longo",
        description: "O resumo deve ter no máximo 200 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const selectedProduct = products.find(p => p.id === newEntry.product_id);

      await supabase.from("company_memory").insert({
        user_email: user?.email || "Sistema",
        origin: "manual",
        category: newEntry.category,
        summary: newEntry.summary.trim(),
        reason: newEntry.reason || null,
        notes: newEntry.notes?.trim() || null,
        product_id: newEntry.product_id || null,
        product_name: selectedProduct?.name || null,
        sku: selectedProduct?.barcode || null,
        channel: newEntry.channel || null,
        employee_name: newEntry.employee_name || null,
      });

      toast({
        title: "Memória registrada",
        description: "A decisão foi adicionada à memória da empresa."
      });

      setDialogOpen(false);
      setNewEntry({
        category: "",
        summary: "",
        reason: "",
        notes: "",
        product_id: "",
        channel: "",
        employee_name: "",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a memória.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    
    try {
      const { error } = await supabase
        .from("company_memory")
        .delete()
        .eq("id", entryToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: "Registro excluído",
        description: "A memória foi removida com sucesso."
      });
      
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro.",
        variant: "destructive"
      });
    }
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  const getOriginLabel = (origin: string) => {
    return ORIGINS.find(o => o.value === origin)?.label || origin;
  };

  const getChannelLabel = (channel: string) => {
    return CHANNELS.find(c => c.value === channel)?.label || channel;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: MemoryEntry[] } = {};
    filteredEntries.forEach(entry => {
      const dateKey = formatDate(entry.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Memória da Empresa</h1>
            <p className="text-sm text-muted-foreground">Histórico de decisões e aprendizados</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Decisão
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{entries.length}</div>
            <div className="text-xs text-muted-foreground">Total de Registros</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {entries.filter(e => e.category === "compra").length}
            </div>
            <div className="text-xs text-muted-foreground">Compras</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {entries.filter(e => e.category === "preco").length}
            </div>
            <div className="text-xs text-muted-foreground">Preços</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {entries.filter(e => e.category === "estrategia").length}
            </div>
            <div className="text-xs text-muted-foreground">Estratégias</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por palavra-chave, produto ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-primary/10" : ""}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-2 block text-sm">Categoria</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-sm">Canal</Label>
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {CHANNELS.map(ch => (
                      <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setFilterCategory("all");
                    setFilterChannel("all");
                    setSearchTerm("");
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {Object.keys(groupedEntries).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum registro encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece registrando decisões importantes para construir a memória da empresa.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Primeira Decisão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEntries).map(([date, dateEntries]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{date}</span>
                <Badge variant="secondary" className="text-xs">{dateEntries.length}</Badge>
              </div>
              <div className="space-y-3 ml-6 border-l-2 border-border pl-4">
                {dateEntries.map(entry => {
                  const categoryInfo = getCategoryInfo(entry.category);
                  const CategoryIcon = categoryInfo.icon;

                  return (
                    <Card key={entry.id} className="hover:shadow-md transition-shadow group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${categoryInfo.color} text-white shrink-0`}>
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {categoryInfo.label}
                                </Badge>
                                {entry.channel && (
                                  <Badge variant="secondary" className="text-xs">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {getChannelLabel(entry.channel)}
                                  </Badge>
                                )}
                                {entry.origin !== "manual" && (
                                  <Badge variant="secondary" className="text-xs bg-primary/10">
                                    {getOriginLabel(entry.origin)}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  setEntryToDelete(entry);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-foreground font-medium mb-1">{entry.summary}</p>
                            {entry.product_name && (
                              <p className="text-sm text-muted-foreground">
                                <Package className="h-3 w-3 inline mr-1" />
                                {entry.product_name}
                                {entry.sku && <span className="text-xs ml-1">({entry.sku})</span>}
                              </p>
                            )}
                            {entry.reason && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <strong>Motivo:</strong> {entry.reason}
                              </p>
                            )}
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                {entry.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(entry.created_at)}
                              </span>
                              {entry.employee_name && (
                                <span className="flex items-center gap-1 font-medium text-primary">
                                  <User className="h-3 w-3" />
                                  {entry.employee_name}
                                </span>
                              )}
                              <span className="text-muted-foreground/60 text-[10px]">
                                por {entry.user_email?.split("@")[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Decisão</DialogTitle>
            <DialogDescription>
              Adicione uma decisão importante à memória da empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category - Required */}
            <div>
              <Label className="mb-2 block">Categoria *</Label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <Button
                      key={cat.value}
                      type="button"
                      variant={newEntry.category === cat.value ? "default" : "outline"}
                      className="justify-start h-auto py-2"
                      onClick={() => setNewEntry(prev => ({ ...prev, category: cat.value }))}
                    >
                      <div className={`p-1 rounded ${cat.color} text-white mr-2`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="text-xs">{cat.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Employee - Required */}
            <div>
              <Label className="mb-2 block">Funcionário *</Label>
              <Select 
                value={newEntry.employee_name || "none"} 
                onValueChange={(v) => setNewEntry(prev => ({ ...prev, employee_name: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {EMPLOYEES.map(emp => (
                    <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary - Required */}
            <div>
              <Label htmlFor="summary" className="mb-2 block">
                Resumo da Decisão * <span className="text-xs text-muted-foreground">({newEntry.summary.length}/200)</span>
              </Label>
              <Input
                id="summary"
                placeholder="Ex: Compradas 300 unidades por aumento de vendas"
                value={newEntry.summary}
                onChange={(e) => setNewEntry(prev => ({ ...prev, summary: e.target.value.slice(0, 200) }))}
                maxLength={200}
              />
            </div>

            {/* Product - Optional */}
            <div>
              <Label className="mb-2 block">Produto (opcional)</Label>
              <Select 
                value={newEntry.product_id || "none"} 
                onValueChange={(v) => setNewEntry(prev => ({ ...prev, product_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel - Optional */}
            <div>
              <Label className="mb-2 block">Canal (opcional)</Label>
              <Select 
                value={newEntry.channel || "none"} 
                onValueChange={(v) => setNewEntry(prev => ({ ...prev, channel: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {CHANNELS.map(ch => (
                    <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason - Optional Quick Select */}
            <div>
              <Label className="mb-2 block">Motivo (opcional)</Label>
              <Select 
                value={newEntry.reason || "none"} 
                onValueChange={(v) => setNewEntry(prev => ({ ...prev, reason: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou deixe em branco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {QUICK_REASONS.map(reason => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes - Optional */}
            <div>
              <Label htmlFor="notes" className="mb-2 block">Observação Adicional (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Detalhes adicionais..."
                value={newEntry.notes}
                onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                className="h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEntry} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta memória?
              <br />
              <strong className="text-foreground">"{entryToDelete?.summary}"</strong>
              <br />
              <span className="text-xs">Registrado por: {entryToDelete?.user_email?.split("@")[0]}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MemoriaEmpresa;
