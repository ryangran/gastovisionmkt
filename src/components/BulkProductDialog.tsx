import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductRow {
  id: string;
  name: string;
  barcode: string;
  quantity: string;
  minStock: string;
}

interface BulkProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelType: "production" | "admin";
  onSuccess?: () => void;
}

export function BulkProductDialog({ 
  open, 
  onOpenChange, 
  panelType,
  onSuccess 
}: BulkProductDialogProps) {
  const [products, setProducts] = useState<ProductRow[]>([
    { id: "1", name: "", barcode: "", quantity: "", minStock: "" }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addProductRow = () => {
    setProducts(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        name: "", 
        barcode: "", 
        quantity: "", 
        minStock: "" 
      }
    ]);
  };

  const removeProductRow = (id: string) => {
    if (products.length === 1) {
      toast.error("É necessário ter pelo menos um produto");
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof Omit<ProductRow, 'id'>, value: string) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const validateProducts = () => {
    for (const product of products) {
      if (!product.name.trim()) {
        toast.error("Todos os produtos devem ter um nome");
        return false;
      }
      if (!product.quantity || isNaN(Number(product.quantity)) || Number(product.quantity) < 0) {
        toast.error(`Quantidade inválida para ${product.name}`);
        return false;
      }
      if (!product.minStock || isNaN(Number(product.minStock)) || Number(product.minStock) < 0) {
        toast.error(`Estoque mínimo inválido para ${product.name}`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateProducts()) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Prepare products for insertion
      const productsToInsert = products.map(p => ({
        name: p.name.trim(),
        barcode: p.barcode.trim() || null,
        quantity: Number(p.quantity),
        min_stock: Number(p.minStock),
        unit: "un",
        panel_type: panelType
      }));

      // Insert all products at once
      const { data, error } = await supabase
        .from("products")
        .insert(productsToInsert)
        .select();

      if (error) throw error;

      // Create initial movement records for each product
      if (data) {
        const movements = data.map(product => ({
          product_id: product.id,
          type: "cadastro",
          quantity: product.quantity,
          previous_quantity: 0,
          new_quantity: product.quantity,
          command: "cadastro em massa",
          panel_type: panelType
        }));

        const { error: movementError } = await supabase
          .from("movements")
          .insert(movements);

        if (movementError) {
          console.error("Erro ao registrar movimentações:", movementError);
        }
      }

      toast.success(`✅ ${products.length} produto(s) cadastrado(s) com sucesso!`);
      
      // Reset form
      setProducts([{ id: "1", name: "", barcode: "", quantity: "", minStock: "" }]);
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao salvar produtos:", error);
      toast.error("Erro ao cadastrar produtos. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>📦 Cadastro em Massa de Produtos</DialogTitle>
          <DialogDescription>
            Adicione múltiplos produtos de uma só vez. Preencha os campos e clique em "Adicionar Item" para incluir mais produtos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {products.map((product, index) => (
              <div 
                key={product.id}
                className="p-4 border rounded-lg bg-secondary/20 space-y-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Produto {index + 1}</h3>
                  {products.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductRow(product.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${product.id}`}>
                      Nome do Produto <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`name-${product.id}`}
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                      placeholder="Ex: Pilha AA"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`barcode-${product.id}`}>Código de Barras</Label>
                    <Input
                      id={`barcode-${product.id}`}
                      value={product.barcode}
                      onChange={(e) => updateProduct(product.id, "barcode", e.target.value)}
                      placeholder="Ex: 7891234567890"
                      disabled={isSaving}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`quantity-${product.id}`}>
                      Quantidade <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`quantity-${product.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={product.quantity}
                      onChange={(e) => updateProduct(product.id, "quantity", e.target.value)}
                      placeholder="Ex: 100"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`minStock-${product.id}`}>
                      Estoque Mínimo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`minStock-${product.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={product.minStock}
                      onChange={(e) => updateProduct(product.id, "minStock", e.target.value)}
                      placeholder="Ex: 20"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={addProductRow}
            disabled={isSaving}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar Produtos
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
