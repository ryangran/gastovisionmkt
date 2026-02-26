import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Bell, Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface StockRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onDirectWithdrawal: (quantity: number) => void;
  onRequestApproval: () => void;
  isProcessing?: boolean;
}

export const StockRequestDialog = ({
  isOpen,
  onClose,
  product,
  onDirectWithdrawal,
  onRequestApproval,
  isProcessing = false,
}: StockRequestDialogProps) => {
  const [mode, setMode] = useState<"choose" | "direct">("choose");
  const [quantity, setQuantity] = useState("");

  const handleClose = () => {
    setMode("choose");
    setQuantity("");
    onClose();
  };

  const handleDirectSubmit = () => {
    const qty = parseFloat(quantity);
    if (qty > 0) {
      onDirectWithdrawal(qty);
      handleClose();
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {product.name}
          </DialogTitle>
          <DialogDescription>
            Estoque atual: <span className="font-semibold text-foreground">{product.quantity} {product.unit}</span>
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="grid gap-4 py-4">
            <Button
              onClick={() => setMode("direct")}
              variant="outline"
              className="h-16 text-left justify-start gap-4"
              disabled={isProcessing}
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Baixa Direta</p>
                <p className="text-xs text-muted-foreground">
                  Digitar quantidade e processar agora
                </p>
              </div>
            </Button>

            <Button
              onClick={onRequestApproval}
              variant="outline"
              className="h-16 text-left justify-start gap-4"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Bell className="w-6 h-6 text-orange-500" />
                </div>
              )}
              <div>
                <p className="font-semibold">Solicitar Aprovação</p>
                <p className="text-xs text-muted-foreground">
                  Enviar para supervisor aprovar
                </p>
              </div>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantidade a retirar</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Digite a quantidade"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                max={product.quantity}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setMode("choose")}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleDirectSubmit}
                disabled={!quantity || parseFloat(quantity) <= 0}
                className="flex-1"
              >
                Confirmar Baixa
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
