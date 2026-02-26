import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Check, X, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { usePagePermission } from "@/hooks/usePagePermission";
import { AccessDenied } from "@/components/AccessDenied";

interface Product {
  id: string;
  name: string;
  quantity: number;
  min_stock: number;
  unit: string;
  barcode: string | null;
}

interface ReviewItem extends Product {
  countedQuantity: number | null;
  status: 'pending' | 'ok' | 'divergent';
}

const Revisao = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'ok' | 'divergent'>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('panel_type', 'admin')
        .order('name');

      if (error) throw error;

      const reviewItems: ReviewItem[] = (data || []).map(product => ({
        ...product,
        countedQuantity: null,
        status: 'pending' as const,
      }));

      setProducts(reviewItems);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (productId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        let status: 'pending' | 'ok' | 'divergent' = 'pending';
        if (numValue !== null) {
          // Se for negativo, calcula o novo valor (subtração)
          const targetQuantity = numValue < 0 ? product.quantity + numValue : numValue;
          status = targetQuantity === product.quantity ? 'ok' : 'divergent';
        }
        return { ...product, countedQuantity: numValue, status };
      }
      return product;
    }));
  };

  const handleApplyCorrection = async (product: ReviewItem) => {
    if (product.countedQuantity === null) return;

    try {
      // Se o valor for negativo, trata como ajuste (subtração do estoque atual)
      // Se positivo, trata como a quantidade exata contada
      const newQuantity = product.countedQuantity < 0 
        ? product.quantity + product.countedQuantity 
        : product.countedQuantity;
      
      // Não permitir estoque negativo
      if (newQuantity < 0) {
        toast({
          title: "Erro",
          description: "O estoque não pode ficar negativo.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', product.id);

      if (error) throw error;

      // Register movement
      const movementType = newQuantity > product.quantity ? 'entrada' : 'saida';
      await supabase.from('movements').insert({
        product_id: product.id,
        type: movementType,
        quantity: Math.abs(newQuantity - product.quantity),
        previous_quantity: product.quantity,
        new_quantity: newQuantity,
        command: product.countedQuantity < 0 
          ? `Ajuste de revisão: ${product.countedQuantity} (${product.quantity} → ${newQuantity})`
          : `Correção de revisão: ${product.quantity} → ${newQuantity}`,
        panel_type: 'admin',
      });

      setProducts(prev => prev.map(p => {
        if (p.id === product.id) {
          return { ...p, quantity: newQuantity, countedQuantity: null, status: 'ok' };
        }
        return p;
      }));

      toast({
        title: "Corrigido",
        description: `Estoque de ${product.name} atualizado para ${newQuantity} ${product.unit}.`,
      });
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o estoque.",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    return product.status === filter;
  });

  const stats = {
    total: products.length,
    pending: products.filter(p => p.status === 'pending').length,
    ok: products.filter(p => p.status === 'ok').length,
    divergent: products.filter(p => p.status === 'divergent').length,
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
              <h1 className="text-xl font-bold">Revisão de Estoque</h1>
              <p className="text-xs text-muted-foreground">Conferência e correção</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Card 
            className={`p-3 cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilter('all')}
          >
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filter === 'ok' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setFilter('ok')}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{stats.ok}</p>
              <p className="text-xs text-muted-foreground">OK</p>
            </div>
          </Card>
          <Card 
            className={`p-3 cursor-pointer transition-all ${filter === 'divergent' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setFilter('divergent')}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{stats.divergent}</p>
              <p className="text-xs text-muted-foreground">Divergentes</p>
            </div>
          </Card>
        </div>

        {/* Products List */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {filteredProducts.map(product => (
              <Card key={product.id} className="p-4">
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`p-2 rounded-full ${
                    product.status === 'ok' ? 'bg-green-500/20' :
                    product.status === 'divergent' ? 'bg-red-500/20' :
                    'bg-yellow-500/20'
                  }`}>
                    {product.status === 'ok' ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : product.status === 'divergent' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Package className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Sistema: {product.quantity} {product.unit}</span>
                      {product.barcode && (
                        <Badge variant="outline" className="text-xs">
                          {product.barcode}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Count Input */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Contagem"
                      className="w-24 text-center"
                      value={product.countedQuantity ?? ''}
                      onChange={(e) => handleCountChange(product.id, e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground w-12">{product.unit}</span>
                  </div>

                  {/* Apply Correction Button */}
                  {product.status === 'divergent' && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleApplyCorrection(product)}
                    >
                      Corrigir
                    </Button>
                  )}
                </div>
              </Card>
            ))}

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default Revisao;