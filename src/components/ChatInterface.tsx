import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Barcode, Mic, MicOff, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulkProductDialog } from "./BulkProductDialog";
import { StockRequestDialog } from "./StockRequestDialog";
import { useStockRequests, StockRequest } from "@/hooks/useStockRequests";
import { logAction } from "@/hooks/useActivityLogger";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ChatInterfaceProps {
  onCommandProcessed?: () => void;
  panelType: "production" | "admin";
}

const DELETE_PASSWORD = "bmsadmin";

export function ChatInterface({ onCommandProcessed, panelType }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "👋 Olá! Sou seu assistente de estoque. Comandos disponíveis:\n\n📦 CADASTRO:\n• 'cadastrar pilha AA 100 un mínimo 20'\n• 'cadastrar produto X 50 kg código 123456'\n\n📥 ENTRADA:\n• 'entrada 50 de pilha AA'\n• 'adicionar 10 produto X'\n\n📤 SAÍDA:\n• 'saida 10 de pilha AA'\n• 'remover 5 produto X'\n• 'peguei 3 de produto Y'\n\n🔍 CONSULTA:\n• 'quanto tem de pilha AA?'\n• 'consultar produto X'\n\n⚙️ MÍNIMO:\n• 'mínimo de pilha AA 30'\n\n🗑️ EXCLUIR:\n• 'excluir pilha AA senha bmsadmin'\n\n📝 CADASTRO EM MASSA:\n• 'cadastro em massa' ou 'massa'\n\n🔍 Ou use o campo de código de barras para saída rápida!",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showProductSelectionDialog, setShowProductSelectionDialog] = useState(false);
  const [showStockRequestDialog, setShowStockRequestDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<string>("");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [pendingBarcode, setPendingBarcode] = useState("");
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [pendingAction, setPendingAction] = useState<"add" | "remove">("remove");
  const [barcodeQueue, setBarcodeQueue] = useState<string[]>([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const queueProcessorRef = useRef<boolean>(false);
  
  const { createRequest, subscribeToRequest } = useStockRequests();

  const requestSupervisorApprovalForProduct = async (product: any, barcodeValue: string) => {
    addMessage(`🔍 Código de barras: ${barcodeValue}`, "user");
    addMessage(
      `📱 Enviando solicitação de aprovação para "${product.name}"...\nAguardando resposta do supervisor...`,
      "assistant"
    );

    const requestId = await createRequest(
      product.id,
      product.name,
      Number(product.quantity),
      product.unit
    );

    if (!requestId) {
      addMessage(`❌ Erro ao criar solicitação de aprovação.`, "assistant");
      return;
    }

    let resolved = false;

    const unsubscribe = subscribeToRequest(requestId, async (updatedRequest) => {
      if (resolved) return;

      if (updatedRequest.status === "approved") {
        resolved = true;
        const approvedQty = updatedRequest.approved_quantity || 0;

        // Fetch current product data to ensure we have the latest quantity
        const { data: currentProduct, error: fetchErr } = await supabase
          .from("products")
          .select("*")
          .eq("id", product.id)
          .single();

        if (fetchErr || !currentProduct) {
          addMessage(`❌ Erro ao buscar produto atualizado.`, "assistant");
          toast.error("Erro ao processar aprovação");
          unsubscribe();
          return;
        }

        const newQuantity = Number(currentProduct.quantity) - approvedQty;

        // Execute the actual stock withdrawal
        const { error: updateError } = await supabase
          .from("products")
          .update({ quantity: newQuantity })
          .eq("id", product.id);

        if (updateError) {
          console.error("Error updating stock after approval:", updateError);
          addMessage(
            `❌ Aprovado, mas erro ao atualizar estoque. Contate o administrador.`,
            "assistant"
          );
          toast.error("Erro ao aplicar saída aprovada");
          unsubscribe();
          return;
        }

        // Register the movement
        const { error: movementError } = await supabase.from("movements").insert({
          product_id: product.id,
          type: "saida",
          quantity: approvedQty,
          previous_quantity: currentProduct.quantity,
          new_quantity: newQuantity,
          command: `saída aprovada por ${updatedRequest.supervisor_email}`,
          panel_type: panelType,
        });

        if (movementError) {
          console.error("Error inserting movement after approval:", movementError);
          // Rollback
          await supabase
            .from("products")
            .update({ quantity: currentProduct.quantity })
            .eq("id", product.id);
          addMessage(`❌ Erro ao registrar movimentação após aprovação.`, "assistant");
          toast.error("Erro ao registrar movimentação");
          unsubscribe();
          return;
        }

        const lowStockWarning =
          newQuantity <= Number(currentProduct.min_stock)
            ? "\n⚠️ ALERTA: Estoque baixo!"
            : "";

        addMessage(
          `✅ Aprovado por ${updatedRequest.supervisor_email}!\n${approvedQty} ${product.unit} de "${product.name}" retirado.\nNovo saldo: ${newQuantity} ${product.unit}${lowStockWarning}`,
          "assistant"
        );
        toast.success(`Aprovado: ${approvedQty} ${product.unit} de ${product.name}`);
        onCommandProcessed?.();
        unsubscribe();
        return;
      }

      if (updatedRequest.status === "rejected") {
        resolved = true;
        addMessage(
          `❌ Solicitação rejeitada pelo supervisor.\n${updatedRequest.notes ? `📝 Motivo: ${updatedRequest.notes}` : ""}`,
          "assistant"
        );
        toast.error("Solicitação rejeitada");
        unsubscribe();
      }
    });

    // Expire locally after 5 minutes (request stays in backend as pending)
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      addMessage(
        `⏰ Solicitação de aprovação expirou para "${product.name}". Bipe novamente para solicitar de novo.`,
        "assistant"
      );
      toast.warning("Solicitação expirou");
      unsubscribe();
    }, 5 * 60 * 1000);
  };

  const processBarcodeDirectToSupervisor = async (barcodeValue: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const { data: products, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", barcodeValue)
        .eq("panel_type", panelType);

      if (fetchError) throw fetchError;

      if (!products || products.length === 0) {
        toast.error(`❌ Código ${barcodeValue} não encontrado`);
        addMessage(`❌ Código de barras não encontrado: ${barcodeValue}`, "assistant");
        return;
      }

      if (products.length > 1) {
        setAvailableProducts(products);
        setPendingBarcode(barcodeValue);
        setPendingQuantity(1);
        setPendingAction("remove");
        setShowProductSelectionDialog(true);
        return;
      }

      await requestSupervisorApprovalForProduct(products[0], barcodeValue);
    } catch (error) {
      console.error("Error processing barcode (production):", error);
      toast.error(`❌ Erro ao processar ${barcodeValue}`);
      addMessage(`❌ Erro ao processar código de barras: ${barcodeValue}`, "assistant");
    } finally {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  const addMessage = (text: string, sender: "user" | "assistant") => {
    const message: Message = {
      id: Date.now().toString() + Math.random(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
    return message;
  };

  const findProductByName = async (productName: string) => {
    // Try exact match first
    let { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('panel_type', panelType)
      .ilike('name', productName);

    // If no exact match, try partial match
    if (!products || products.length === 0) {
      const { data: partialProducts } = await supabase
        .from('products')
        .select('*')
        .eq('panel_type', panelType)
        .ilike('name', `%${productName}%`);
      products = partialProducts;
    }

    return products || [];
  };

  const processCommand = async (command: string) => {
    setIsLoading(true);
    const normalizedCommand = command.toLowerCase().trim();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addMessage("❌ Usuário não autenticado", "assistant");
        toast.error("Usuário não autenticado");
        return;
      }

      // ============ CADASTRO EM MASSA ============
      if (normalizedCommand.includes("cadastro em massa") || 
          normalizedCommand.includes("cadastro massa") ||
          normalizedCommand === "massa") {
        setShowBulkDialog(true);
        return;
      }

      // ============ USE AI FOR ALL OTHER COMMANDS ============
      try {
        const { data, error } = await supabase.functions.invoke('process-command', {
          body: { command, panel_type: panelType }
        });

        if (error) {
          console.error('Edge function error:', error);
          
          // Handle specific error codes
          if (error.message?.includes('429') || error.message?.includes('rate')) {
            addMessage("⏳ Muitas requisições. Aguarde alguns segundos e tente novamente.", "assistant");
            toast.error("Limite de requisições atingido");
            return;
          }
          
          if (error.message?.includes('402') || error.message?.includes('payment')) {
            addMessage("💳 Créditos insuficientes no sistema de IA.", "assistant");
            toast.error("Créditos insuficientes");
            return;
          }
          
          throw error;
        }

        // Handle password required for delete
        if (data?.requirePassword && data?.productId) {
          setPendingDeleteProduct(data.productId);
          setShowPasswordDialog(true);
          addMessage(data.message || "🔒 Digite a senha para confirmar a exclusão", "assistant");
          return;
        }

        if (data?.success) {
          addMessage(data.message, "assistant");
          if (data.message.includes('✅')) {
            toast.success("Comando processado com sucesso!");
          }
          onCommandProcessed?.();
        } else {
          addMessage(data?.message || "❌ Erro ao processar comando", "assistant");
          if (data?.message) {
            toast.error(data.message);
          }
        }

      } catch (aiError: any) {
        console.error('AI processing error:', aiError);
        
        // Fallback to basic pattern matching for critical operations
        await processCommandFallback(command, normalizedCommand, session);
      }

    } catch (error) {
      console.error('Error processing command:', error);
      addMessage("❌ Erro ao processar comando. Tente novamente.", "assistant");
      toast.error("Erro ao processar comando");
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback for when AI is unavailable
  const processCommandFallback = async (command: string, normalizedCommand: string, session: any) => {
    // ============ CADASTRAR PRODUTO ============
    const cadastroPattern = /(?:cadastrar?|criar|novo)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*(un|kg|g|l|ml|m|cm|pç|pc|cx|und|unidade|unidades|quilos?|gramas?|litros?|metros?|caixa|peça)?(?:\s+(?:código|cod|barcode)\s*[:\s]*(\S+))?(?:\s+(?:mínimo|min)\s*[:\s]*(\d+(?:[.,]\d+)?))?/i;
    const cadastroMatch = normalizedCommand.match(cadastroPattern);
    
    if (cadastroMatch || normalizedCommand.startsWith("cadastrar") || normalizedCommand.startsWith("criar")) {
      if (cadastroMatch) {
        const name = cadastroMatch[1].trim();
        const quantity = parseFloat(cadastroMatch[2].replace(',', '.'));
        const unit = cadastroMatch[3] || 'un';
        const barcodeValue = cadastroMatch[4] || null;
        const minStock = cadastroMatch[5] ? parseFloat(cadastroMatch[5].replace(',', '.')) : 0;

        const existingProducts = await findProductByName(name);
        if (existingProducts.length > 0) {
          const msg = `⚠️ Já existe um produto com nome similar: "${existingProducts[0].name}". Use outro nome.`;
          addMessage(msg, "assistant");
          toast.warning(msg);
          return;
        }

        if (barcodeValue) {
          const { data: barcodeProducts } = await supabase
            .from('products')
            .select('*')
            .eq('barcode', barcodeValue)
            .eq('panel_type', panelType);
          
          if (barcodeProducts && barcodeProducts.length > 0) {
            const msg = `⚠️ Código de barras "${barcodeValue}" já está em uso por: ${barcodeProducts[0].name}`;
            addMessage(msg, "assistant");
            toast.warning(msg);
            return;
          }
        }

        const { error } = await supabase.from('products').insert({
          name,
          quantity,
          unit,
          barcode: barcodeValue,
          min_stock: minStock,
          panel_type: panelType,
        });

        if (error) throw error;

        const msg = `✅ Produto "${name}" cadastrado!\n• Quantidade: ${quantity} ${unit}\n• Estoque mínimo: ${minStock} ${unit}${barcodeValue ? `\n• Código: ${barcodeValue}` : ''}`;
        addMessage(msg, "assistant");
        toast.success(`Produto "${name}" cadastrado!`);
        await logAction('cadastro_produto', `Produto "${name}" cadastrado com ${quantity} ${unit}`, panelType === 'admin' ? '/estoque' : '/producao');
        onCommandProcessed?.();
        return;
      } else {
        addMessage("❌ Formato inválido. Use: cadastrar [nome] [quantidade] [unidade] código [código] mínimo [mínimo]", "assistant");
        return;
      }
    }

    // ============ ENTRADA ============
    const entradaPattern = /(?:entrada|adicionar?|add|adicion[aoe][r]?)\s+(\d+(?:[.,]\d+)?)\s*(?:de\s+)?(.+)/i;
    const entradaMatch = normalizedCommand.match(entradaPattern);
    
    if (entradaMatch) {
      const quantity = parseFloat(entradaMatch[1].replace(',', '.'));
      const productName = entradaMatch[2].trim();
      
      const products = await findProductByName(productName);
      
      if (products.length === 0) {
        addMessage(`❌ Produto "${productName}" não encontrado`, "assistant");
        toast.error(`Produto "${productName}" não encontrado`);
        return;
      }

      const product = products[0];
      const newQuantity = Number(product.quantity) + quantity;

      const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', product.id);
      if (updateError) {
        console.error('Error updating product:', updateError);
        addMessage(`❌ Erro ao atualizar estoque de "${product.name}". Verifique suas permissões.`, "assistant");
        toast.error("Erro ao atualizar estoque");
        return;
      }

      const { error: movementError } = await supabase.from('movements').insert({
        product_id: product.id,
        type: 'entrada',
        quantity,
        previous_quantity: product.quantity,
        new_quantity: newQuantity,
        command,
        panel_type: panelType,
      });
      if (movementError) {
        console.error('Error inserting movement:', movementError);
        // Rollback product update
        await supabase.from('products').update({ quantity: product.quantity }).eq('id', product.id);
        addMessage(`❌ Erro ao registrar movimentação de "${product.name}".`, "assistant");
        toast.error("Erro ao registrar movimentação");
        return;
      }

      const msg = `✅ Entrada de ${quantity} ${product.unit} de "${product.name}".\nNovo saldo: ${newQuantity} ${product.unit}`;
      addMessage(msg, "assistant");
      toast.success(msg);
      await logAction('entrada_estoque', `Entrada de ${quantity} ${product.unit} de "${product.name}". Novo saldo: ${newQuantity}`, panelType === 'admin' ? '/estoque' : '/producao');
      onCommandProcessed?.();
      return;
    }

    // ============ SAÍDA ============
    const saidaPattern = /(?:saida|saída|remover?|tirar?|peguei|retirar?|remove)\s+(\d+(?:[.,]\d+)?)\s*(?:de\s+)?(.+)/i;
    const saidaMatch = normalizedCommand.match(saidaPattern);
    
    if (saidaMatch) {
      const quantity = parseFloat(saidaMatch[1].replace(',', '.'));
      const productName = saidaMatch[2].trim();
      
      const products = await findProductByName(productName);
      
      if (products.length === 0) {
        addMessage(`❌ Produto "${productName}" não encontrado`, "assistant");
        toast.error(`Produto "${productName}" não encontrado`);
        return;
      }

      const product = products[0];

      if (Number(product.quantity) < quantity) {
        addMessage(`❌ Estoque insuficiente! "${product.name}" tem apenas ${product.quantity} ${product.unit}`, "assistant");
        toast.error("Estoque insuficiente!");
        return;
      }

      const newQuantity = Number(product.quantity) - quantity;

      const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', product.id);
      if (updateError) {
        console.error('Error updating product:', updateError);
        addMessage(`❌ Erro ao atualizar estoque de "${product.name}". Verifique suas permissões.`, "assistant");
        toast.error("Erro ao atualizar estoque");
        return;
      }

      const { error: movementError } = await supabase.from('movements').insert({
        product_id: product.id,
        type: 'saida',
        quantity,
        previous_quantity: product.quantity,
        new_quantity: newQuantity,
        command,
        panel_type: panelType,
      });
      if (movementError) {
        console.error('Error inserting movement:', movementError);
        // Rollback product update
        await supabase.from('products').update({ quantity: product.quantity }).eq('id', product.id);
        addMessage(`❌ Erro ao registrar movimentação de "${product.name}".`, "assistant");
        toast.error("Erro ao registrar movimentação");
        return;
      }

      const lowStockWarning = newQuantity <= Number(product.min_stock) ? '\n⚠️ ALERTA: Estoque baixo!' : '';
      const msg = `✅ Saída de ${quantity} ${product.unit} de "${product.name}".\nNovo saldo: ${newQuantity} ${product.unit}${lowStockWarning}`;
      addMessage(msg, "assistant");
      toast.success(`Saída registrada: ${product.name}`);
      await logAction('saida_estoque', `Saída de ${quantity} ${product.unit} de "${product.name}". Novo saldo: ${newQuantity}`, panelType === 'admin' ? '/estoque' : '/producao');
      onCommandProcessed?.();
      return;
    }

    // ============ CONSULTA ============
    const consultaPattern = /(?:quanto\s+tem|consultar?|buscar?|ver|mostrar?|estoque)\s*(?:de\s+)?(.+?)[\?]?$/i;
    const consultaMatch = normalizedCommand.match(consultaPattern);
    
    if (consultaMatch) {
      const productName = consultaMatch[1].trim().replace(/\?/g, '');
      const products = await findProductByName(productName);
      
      if (products.length === 0) {
        addMessage(`❌ Produto "${productName}" não encontrado`, "assistant");
        toast.error(`Produto "${productName}" não encontrado`);
        return;
      }

      const product = products[0];
      const statusEmoji = Number(product.quantity) <= Number(product.min_stock) ? '🔴' : '🟢';
      const msg = `📦 **${product.name}**\n${statusEmoji} Quantidade: ${product.quantity} ${product.unit}\n📊 Mínimo: ${product.min_stock} ${product.unit}${product.barcode ? `\n🏷️ Código: ${product.barcode}` : ''}`;
      addMessage(msg, "assistant");
      return;
    }

    // ============ EXCLUIR (FALLBACK) ============
    const excluirPattern = /(?:excluir?|deletar?|remover?\s+produto|apagar?)\s+(.+)/i;
    const excluirMatch = normalizedCommand.match(excluirPattern);
    
    if (excluirMatch) {
      const productName = excluirMatch[1].trim().replace(/\s+senha\s+.*/i, '');
      const products = await findProductByName(productName);
      
      if (products.length === 0) {
        addMessage(`❌ Produto "${productName}" não encontrado`, "assistant");
        toast.error(`Produto "${productName}" não encontrado`);
        return;
      }

      const product = products[0];
      setPendingDeleteProduct(product.id);
      setShowPasswordDialog(true);
      addMessage(`🔒 Para excluir "${product.name}", digite a senha de administrador.`, "assistant");
      return;
    }

    // ============ COMANDO NÃO RECONHECIDO ============
    addMessage("🤖 A IA está temporariamente indisponível. Use comandos simples:\n• cadastrar [produto] [qtd] [unidade]\n• entrada [qtd] de [produto]\n• saida [qtd] de [produto]\n• quanto tem de [produto]", "assistant");
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    addMessage(input, "user");
    const commandText = input;
    setInput("");
    
    await processCommand(commandText);
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      toast.error("Por favor, digite a senha");
      return;
    }

    if (password !== DELETE_PASSWORD) {
      toast.error("Senha incorreta!");
      setPassword("");
      return;
    }

    setShowPasswordDialog(false);
    setIsLoading(true);

    try {
      // Get product info first
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', pendingDeleteProduct)
        .single();

      // Delete movements first
      await supabase.from('movements').delete().eq('product_id', pendingDeleteProduct);
      // Then delete product
      await supabase.from('products').delete().eq('id', pendingDeleteProduct);

      const msg = `✅ Produto "${product?.name}" excluído com sucesso!`;
      addMessage(msg, "assistant");
      toast.success(msg);
      await logAction('exclusao_produto', `Produto "${product?.name}" excluído`, panelType === 'admin' ? '/estoque' : '/producao');
      onCommandProcessed?.();
    } catch (error) {
      addMessage("❌ Erro ao excluir produto", "assistant");
      toast.error("Erro ao excluir produto");
    } finally {
      setIsLoading(false);
      setPassword("");
      setPendingDeleteProduct("");
    }
  };

  const handleProductSelection = async () => {
    if (!selectedProductId) {
      toast.error("Por favor, selecione um produto");
      return;
    }

    setShowProductSelectionDialog(false);
    setIsLoading(true);

    try {
      const product = availableProducts.find(p => p.id === selectedProductId);
      if (!product) throw new Error("Produto não encontrado");

      // Produção: sempre vai direto para aprovação do supervisor (sem fila)
      if (panelType === "production" && pendingAction === "remove") {
        await requestSupervisorApprovalForProduct(product, pendingBarcode);
        onCommandProcessed?.();
        return;
      }

      const quantity = pendingQuantity;

      if (pendingAction === 'remove') {
        if (Number(product.quantity) < quantity) {
          addMessage(`❌ Estoque insuficiente! "${product.name}" tem apenas ${product.quantity} ${product.unit}`, "assistant");
          toast.error("Estoque insuficiente!");
          return;
        }

        const newQuantity = Number(product.quantity) - quantity;
        
        const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', product.id);
        if (updateError) {
          console.error('Error updating product:', updateError);
          addMessage(`❌ Erro ao atualizar estoque de "${product.name}".`, "assistant");
          toast.error("Erro ao atualizar estoque");
          return;
        }

        const { error: movementError } = await supabase.from('movements').insert({
          product_id: product.id,
          type: 'saida',
          quantity,
          previous_quantity: product.quantity,
          new_quantity: newQuantity,
          command: `saída código ${pendingBarcode}`,
          panel_type: panelType,
        });
        if (movementError) {
          console.error('Error inserting movement:', movementError);
          await supabase.from('products').update({ quantity: product.quantity }).eq('id', product.id);
          addMessage(`❌ Erro ao registrar movimentação.`, "assistant");
          toast.error("Erro ao registrar movimentação");
          return;
        }

        const lowStockWarning = newQuantity <= Number(product.min_stock) ? '\n⚠️ ALERTA: Estoque baixo!' : '';
        const msg = `✅ Saída de ${quantity} ${product.unit} de "${product.name}".\nNovo saldo: ${newQuantity} ${product.unit}${lowStockWarning}`;
        
        addMessage(`🔍 Código de barras: ${pendingBarcode}`, "user");
        addMessage(msg, "assistant");
        toast.success(`Saída registrada: ${product.name}`);
      } else {
        const newQuantity = Number(product.quantity) + quantity;
        
        const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', product.id);
        if (updateError) {
          console.error('Error updating product:', updateError);
          addMessage(`❌ Erro ao atualizar estoque de "${product.name}".`, "assistant");
          toast.error("Erro ao atualizar estoque");
          return;
        }

        const { error: movementError } = await supabase.from('movements').insert({
          product_id: product.id,
          type: 'entrada',
          quantity,
          previous_quantity: product.quantity,
          new_quantity: newQuantity,
          command: `entrada código ${pendingBarcode}`,
          panel_type: panelType,
        });
        if (movementError) {
          console.error('Error inserting movement:', movementError);
          await supabase.from('products').update({ quantity: product.quantity }).eq('id', product.id);
          addMessage(`❌ Erro ao registrar movimentação.`, "assistant");
          toast.error("Erro ao registrar movimentação");
          return;
        }

        const msg = `✅ Entrada de ${quantity} ${product.unit} de "${product.name}".\nNovo saldo: ${newQuantity} ${product.unit}`;
        
        addMessage(`🔍 Código de barras: ${pendingBarcode}`, "user");
        addMessage(msg, "assistant");
        toast.success(`Entrada registrada: ${product.name}`);
      }

      onCommandProcessed?.();
    } catch (error) {
      toast.error("❌ Erro ao processar seleção");
    } finally {
      setIsLoading(false);
      setSelectedProductId("");
      setPendingBarcode("");
      setPendingQuantity(1);
      setAvailableProducts([]);
    }
  };

  // Handle approval request
  const handleRequestApproval = async () => {
    if (!scannedProduct) return;
    
    setShowStockRequestDialog(false);
    setWaitingForApproval(true);
    
    addMessage(`🔍 Código de barras: ${pendingBarcode}`, "user");
    addMessage(`📱 Enviando solicitação de aprovação para "${scannedProduct.name}"...\nAguardando resposta do supervisor...`, "assistant");
    
    const requestId = await createRequest(
      scannedProduct.id,
      scannedProduct.name,
      scannedProduct.quantity,
      scannedProduct.unit
    );
    
    if (!requestId) {
      setWaitingForApproval(false);
      addMessage(`❌ Erro ao criar solicitação de aprovação.`, "assistant");
      return;
    }
    
    setCurrentRequestId(requestId);
    
    // Subscribe to updates for this request
    const unsubscribe = subscribeToRequest(requestId, async (updatedRequest: StockRequest) => {
      if (updatedRequest.status === "approved" && updatedRequest.approved_quantity) {
        const quantity = updatedRequest.approved_quantity;
        const newQuantity = Number(scannedProduct.quantity) - quantity;
        
        // Process the stock withdrawal with error handling
        const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', scannedProduct.id);
        if (updateError) {
          console.error('Error updating product after approval:', updateError);
          addMessage(`❌ Aprovado, mas erro ao atualizar estoque. Contate o administrador.`, "assistant");
          toast.error("Erro ao aplicar saída aprovada");
          setWaitingForApproval(false);
          setCurrentRequestId(null);
          setScannedProduct(null);
          unsubscribe();
          return;
        }

        const { error: movementError } = await supabase.from('movements').insert({
          product_id: scannedProduct.id,
          type: 'saida',
          quantity,
          previous_quantity: scannedProduct.quantity,
          new_quantity: newQuantity,
          command: `saída aprovada por ${updatedRequest.supervisor_email}`,
          panel_type: panelType,
        });
        if (movementError) {
          console.error('Error inserting movement after approval:', movementError);
          // Rollback
          await supabase.from('products').update({ quantity: scannedProduct.quantity }).eq('id', scannedProduct.id);
          addMessage(`❌ Erro ao registrar movimentação após aprovação.`, "assistant");
          toast.error("Erro ao registrar movimentação");
          setWaitingForApproval(false);
          setCurrentRequestId(null);
          setScannedProduct(null);
          unsubscribe();
          return;
        }
        
        const lowStockWarning = newQuantity <= Number(scannedProduct.min_stock) ? '\n⚠️ ALERTA: Estoque baixo!' : '';
        addMessage(`✅ Aprovado por ${updatedRequest.supervisor_email}!\n${quantity} ${scannedProduct.unit} de "${scannedProduct.name}" retirado.\nNovo saldo: ${newQuantity} ${scannedProduct.unit}${lowStockWarning}`, "assistant");
        toast.success(`✅ Aprovado: ${quantity} ${scannedProduct.unit}`);
        onCommandProcessed?.();
        
        setWaitingForApproval(false);
        setCurrentRequestId(null);
        setScannedProduct(null);
        unsubscribe();
      } else if (updatedRequest.status === "rejected") {
        addMessage(`❌ Solicitação rejeitada por ${updatedRequest.supervisor_email}.${updatedRequest.notes ? `\nMotivo: ${updatedRequest.notes}` : ""}`, "assistant");
        toast.error("Solicitação rejeitada");
        
        setWaitingForApproval(false);
        setCurrentRequestId(null);
        setScannedProduct(null);
        unsubscribe();
      }
    });
    
    // Set timeout for expiration (5 minutes)
    setTimeout(() => {
      if (waitingForApproval && currentRequestId === requestId) {
        addMessage(`⏰ Tempo de aprovação esgotado. Bipe o produto novamente para nova solicitação.`, "assistant");
        toast.warning("Solicitação expirou");
        setWaitingForApproval(false);
        setCurrentRequestId(null);
        setScannedProduct(null);
        unsubscribe();
      }
    }, 5 * 60 * 1000);
  };

  // Handle direct withdrawal
  const handleDirectWithdrawal = async (quantity: number) => {
    if (!scannedProduct) return;
    
    setShowStockRequestDialog(false);
    
    if (Number(scannedProduct.quantity) < quantity) {
      toast.error(`❌ Estoque insuficiente de "${scannedProduct.name}"`);
      addMessage(`❌ Estoque insuficiente! ${scannedProduct.name}: ${scannedProduct.quantity} ${scannedProduct.unit}`, "assistant");
      return;
    }

    const newQuantity = Number(scannedProduct.quantity) - quantity;
    
    const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', scannedProduct.id);
    if (updateError) {
      console.error('Error updating product in direct withdrawal:', updateError);
      addMessage(`❌ Erro ao atualizar estoque de "${scannedProduct.name}".`, "assistant");
      toast.error("Erro ao atualizar estoque");
      return;
    }

    const { error: movementError } = await supabase.from('movements').insert({
      product_id: scannedProduct.id,
      type: 'saida',
      quantity,
      previous_quantity: scannedProduct.quantity,
      new_quantity: newQuantity,
      command: `saída código ${pendingBarcode}`,
      panel_type: panelType,
    });
    if (movementError) {
      console.error('Error inserting movement in direct withdrawal:', movementError);
      await supabase.from('products').update({ quantity: scannedProduct.quantity }).eq('id', scannedProduct.id);
      addMessage(`❌ Erro ao registrar movimentação.`, "assistant");
      toast.error("Erro ao registrar movimentação");
      return;
    }

    const lowStockWarning = newQuantity <= Number(scannedProduct.min_stock) ? '\n⚠️ ALERTA: Estoque baixo!' : '';
    const message = `✅ Saída de ${quantity} ${scannedProduct.unit} de "${scannedProduct.name}". Saldo: ${newQuantity} ${scannedProduct.unit}${lowStockWarning}`;
    
    addMessage(`🔍 Código de barras: ${pendingBarcode}`, "user");
    addMessage(message, "assistant");
    toast.success(message, { duration: 2000 });
    onCommandProcessed?.();
    
    setScannedProduct(null);
    setPendingBarcode("");
  };

  const processBarcodeQueue = async () => {
    if (queueProcessorRef.current || barcodeQueue.length === 0) return;
    if (waitingForApproval) {
      toast.warning("Aguardando aprovação da solicitação anterior...");
      return;
    }
    
    queueProcessorRef.current = true;
    setProcessingQueue(true);

    const barcodeValue = barcodeQueue[0];
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcodeValue)
        .eq('panel_type', panelType);

      if (fetchError) throw fetchError;

      if (!products || products.length === 0) {
        toast.error(`❌ Código ${barcodeValue} não encontrado`);
        addMessage(`❌ Código de barras não encontrado: ${barcodeValue}`, "assistant");
        return;
      }

      if (products.length > 1) {
        setAvailableProducts(products);
        setPendingBarcode(barcodeValue);
        setPendingQuantity(1);
        setPendingAction('remove');
        setShowProductSelectionDialog(true);
        return;
      }

      const product = products[0];
      
      // For production panel, always send to supervisor for approval
      if (panelType === 'production') {
        setScannedProduct(product);
        setPendingBarcode(barcodeValue);
        // Directly request approval without showing dialog
        setWaitingForApproval(true);
        addMessage(`🔍 Código de barras: ${barcodeValue}`, "user");
        addMessage(`📱 Enviando solicitação de aprovação para "${product.name}"...\nAguardando resposta do supervisor...`, "assistant");
        
        const requestId = await createRequest(
          product.id,
          product.name,
          product.quantity,
          product.unit
        );
        
        if (!requestId) {
          setWaitingForApproval(false);
          addMessage(`❌ Erro ao criar solicitação de aprovação.`, "assistant");
          return;
        }
        
        setCurrentRequestId(requestId);
        
        // Subscribe to request updates - execute stock withdrawal when approved
        const unsubscribe = subscribeToRequest(requestId, async (updatedRequest) => {
          if (updatedRequest.status === 'approved') {
            const approvedQty = updatedRequest.approved_quantity || 0;
            
            // Fetch current product data to ensure we have the latest quantity
            const { data: currentProduct, error: fetchErr } = await supabase
              .from('products')
              .select('*')
              .eq('id', product.id)
              .single();
            
            if (fetchErr || !currentProduct) {
              addMessage(`❌ Erro ao buscar produto atualizado.`, "assistant");
              toast.error("Erro ao processar aprovação");
              setWaitingForApproval(false);
              unsubscribe();
              return;
            }
            
            const newQuantity = Number(currentProduct.quantity) - approvedQty;
            
            // Execute the actual stock withdrawal
            const { error: updateError } = await supabase
              .from('products')
              .update({ quantity: newQuantity })
              .eq('id', product.id);
            
            if (updateError) {
              console.error('Error updating stock after approval:', updateError);
              addMessage(`❌ Aprovado, mas erro ao atualizar estoque. Contate o administrador.`, "assistant");
              toast.error("Erro ao aplicar saída aprovada");
              setWaitingForApproval(false);
              unsubscribe();
              return;
            }
            
            // Register the movement
            const { error: movementError } = await supabase.from('movements').insert({
              product_id: product.id,
              type: 'saida',
              quantity: approvedQty,
              previous_quantity: currentProduct.quantity,
              new_quantity: newQuantity,
              command: `saída aprovada por ${updatedRequest.supervisor_email}`,
              panel_type: panelType,
            });
            
            if (movementError) {
              console.error('Error inserting movement after approval:', movementError);
              // Rollback
              await supabase.from('products').update({ quantity: currentProduct.quantity }).eq('id', product.id);
              addMessage(`❌ Erro ao registrar movimentação após aprovação.`, "assistant");
              toast.error("Erro ao registrar movimentação");
              setWaitingForApproval(false);
              unsubscribe();
              return;
            }
            
            const lowStockWarning = newQuantity <= Number(currentProduct.min_stock) ? '\n⚠️ ALERTA: Estoque baixo!' : '';
            addMessage(`✅ Aprovado por ${updatedRequest.supervisor_email}!\n${approvedQty} ${product.unit} de "${product.name}" retirado.\nNovo saldo: ${newQuantity} ${product.unit}${lowStockWarning}`, "assistant");
            toast.success(`Aprovado: ${approvedQty} ${product.unit} de ${product.name}`);
            onCommandProcessed?.();
            setWaitingForApproval(false);
            unsubscribe();
          } else if (updatedRequest.status === 'rejected') {
            setWaitingForApproval(false);
            addMessage(`❌ Solicitação rejeitada pelo supervisor.\n${updatedRequest.notes ? `📝 Motivo: ${updatedRequest.notes}` : ''}`, "assistant");
            toast.error(`Solicitação rejeitada`);
            unsubscribe();
          }
        });
        return;
      }

      // For admin panel, process directly
      const quantity = 1;

      if (Number(product.quantity) < quantity) {
        toast.error(`❌ Estoque insuficiente de "${product.name}"`);
        addMessage(`❌ Estoque insuficiente! ${product.name}: ${product.quantity} ${product.unit}`, "assistant");
        return;
      }

      const newQuantity = Number(product.quantity) - quantity;
      
      const { error: updateError } = await supabase.from('products').update({ quantity: newQuantity }).eq('id', product.id);
      if (updateError) {
        console.error('Error updating product in barcode queue:', updateError);
        toast.error(`❌ Erro ao atualizar estoque de "${product.name}"`);
        addMessage(`❌ Erro ao atualizar estoque de "${product.name}". Verifique suas permissões.`, "assistant");
        return;
      }

      const { error: movementError } = await supabase.from('movements').insert({
        product_id: product.id,
        type: 'saida',
        quantity,
        previous_quantity: product.quantity,
        new_quantity: newQuantity,
        command: `saída código ${barcodeValue}`,
        panel_type: panelType,
      });
      if (movementError) {
        console.error('Error inserting movement in barcode queue:', movementError);
        await supabase.from('products').update({ quantity: product.quantity }).eq('id', product.id);
        toast.error(`❌ Erro ao registrar movimentação de "${product.name}"`);
        addMessage(`❌ Erro ao registrar movimentação de "${product.name}".`, "assistant");
        return;
      }

      const lowStockWarning = newQuantity <= Number(product.min_stock) ? '\n⚠️ ALERTA: Estoque baixo!' : '';
      const message = `✅ Saída de ${quantity} ${product.unit} de "${product.name}". Saldo: ${newQuantity} ${product.unit}${lowStockWarning}`;
      
      toast.success(message, { duration: 2000 });
      onCommandProcessed?.();

      addMessage(`🔍 Código de barras: ${barcodeValue}`, "user");
      addMessage(message, "assistant");

    } catch (error) {
      console.error('Error processing barcode:', error);
      toast.error(`❌ Erro ao processar ${barcodeValue}`);
      addMessage(`❌ Erro ao processar código de barras: ${barcodeValue}`, "assistant");
    } finally {
      setBarcodeQueue((prev) => prev.slice(1));
      queueProcessorRef.current = false;
      setProcessingQueue(false);
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    if (barcodeQueue.length > 0 && !queueProcessorRef.current) {
      processBarcodeQueue();
    }
  }, [barcodeQueue]);

  const handleBarcodeSubmit = async () => {
    if (!barcode.trim()) return;

    const barcodeValue = barcode.trim();
    setBarcode("");
    
    // Produção: sempre envia direto para o supervisor (sem fila e sem bloquear múltiplos bips)
    if (panelType === "production") {
      await processBarcodeDirectToSupervisor(barcodeValue);
      return;
    }
    
    // For admin panel, also process immediately
    setBarcodeQueue([barcodeValue]);
  };

  const startRecording = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error("❌ Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.success("🎤 Falando... O texto aparecerá em tempo real!");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        setInput(prev => {
          if (finalTranscript) {
            return (prev + ' ' + finalTranscript).trim();
          }
          return prev;
        });
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          toast.info("Nenhuma fala detectada. Continue falando...");
        } else if (event.error === 'not-allowed') {
          toast.error("❌ Permissão negada. Habilite o microfone.");
          setIsRecording(false);
        } else {
          toast.error(`❌ Erro: ${event.error}`);
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        if (isRecording) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast.error("❌ Erro ao iniciar reconhecimento de voz.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      toast.success("✅ Gravação finalizada. Revise e envie!");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Get the last non-estorno movement for this panel type
      const { data: lastMovement, error: fetchError } = await supabase
        .from('movements')
        .select('*')
        .eq('panel_type', panelType)
        .neq('type', 'estorno')
        .neq('type', 'cadastro') // Don't undo product creation
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastMovement) {
        toast.error("❌ Nenhuma movimentação para desfazer");
        return;
      }

      // Fetch the current product data separately to avoid stale data
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, unit, quantity')
        .eq('id', lastMovement.product_id)
        .single();

      if (productError || !product) {
        toast.error("❌ Produto não encontrado");
        return;
      }

      const productName = product.name || 'Produto';
      const productUnit = product.unit || 'un';
      const currentQuantity = Number(product.quantity);

      // Calculate reversal: undo the effect of the last movement
      // entrada: we added quantity, so we need to subtract
      // saida: we removed quantity, so we need to add back
      let reversalQuantity: number;
      if (lastMovement.type === 'entrada') {
        reversalQuantity = currentQuantity - Number(lastMovement.quantity);
      } else if (lastMovement.type === 'saida') {
        reversalQuantity = currentQuantity + Number(lastMovement.quantity);
      } else {
        toast.error("❌ Tipo de movimentação não pode ser estornado");
        return;
      }

      // Prevent negative stock
      if (reversalQuantity < 0) {
        toast.error("❌ Estorno resultaria em estoque negativo");
        return;
      }

      // Update product quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: reversalQuantity })
        .eq('id', lastMovement.product_id);

      if (updateError) {
        throw updateError;
      }

      // Record the reversal movement
      const { error: insertError } = await supabase.from('movements').insert({
        product_id: lastMovement.product_id,
        type: 'estorno',
        quantity: lastMovement.quantity,
        previous_quantity: currentQuantity,
        new_quantity: reversalQuantity,
        command: `Estorno: ${lastMovement.type} de ${lastMovement.quantity} ${productUnit} (ref: ${lastMovement.command})`,
        panel_type: panelType,
      });

      if (insertError) {
        // Try to rollback the product update
        await supabase
          .from('products')
          .update({ quantity: currentQuantity })
          .eq('id', lastMovement.product_id);
        throw insertError;
      }

      const actionText = lastMovement.type === 'entrada' ? 'entrada' : 'saída';
      const message = `↩️ Estorno registrado!\n${actionText.charAt(0).toUpperCase() + actionText.slice(1)} de ${lastMovement.quantity} ${productUnit} de "${productName}" foi estornada.\nNovo saldo: ${reversalQuantity} ${productUnit}`;
      
      toast.success("↩️ Estorno registrado com sucesso!");
      addMessage(message, "assistant");
      await logAction('estorno', `Estorno de ${actionText} de ${lastMovement.quantity} ${productUnit} de "${productName}". Novo saldo: ${reversalQuantity}`, panelType === 'admin' ? '/estoque' : '/producao');
      onCommandProcessed?.();
    } catch (error) {
      console.error('Error undoing movement:', error);
      toast.error("❌ Erro ao registrar estorno");
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <>
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔒 Senha Necessária</DialogTitle>
            <DialogDescription>
              Para excluir um produto, é necessário inserir a senha de administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordSubmit();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setPassword("");
              setPendingDeleteProduct("");
            }}>
              Cancelar
            </Button>
            <Button onClick={handlePasswordSubmit}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showProductSelectionDialog} onOpenChange={setShowProductSelectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🔍 Selecione o Produto</DialogTitle>
            <DialogDescription>
              Múltiplos produtos encontrados com o código {pendingBarcode}. 
              Selecione qual produto usar para {pendingAction === 'add' ? 'entrada' : 'saída'}:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {availableProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all hover:border-primary",
                      selectedProductId === product.id 
                        ? "border-primary bg-primary/10" 
                        : "border-border"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Estoque atual: {product.quantity} {product.unit}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Estoque mínimo: {product.min_stock} {product.unit}
                        </p>
                      </div>
                      {selectedProductId === product.id && (
                        <div className="ml-2">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowProductSelectionDialog(false);
              setSelectedProductId("");
              setAvailableProducts([]);
              setPendingBarcode("");
              setPendingQuantity(1);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleProductSelection} disabled={!selectedProductId}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkProductDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        panelType={panelType}
        onSuccess={() => {
          onCommandProcessed?.();
          addMessage("✅ Produtos cadastrados em massa com sucesso!", "assistant");
        }}
      />

      <StockRequestDialog
        isOpen={showStockRequestDialog}
        onClose={() => {
          setShowStockRequestDialog(false);
          setScannedProduct(null);
          setPendingBarcode("");
        }}
        product={scannedProduct}
        onDirectWithdrawal={handleDirectWithdrawal}
        onRequestApproval={handleRequestApproval}
        isProcessing={waitingForApproval}
      />

      <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">💬 Controle de Estoque</h2>
              <p className="text-sm text-muted-foreground">
                Digite comandos para gerenciar produtos
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={isUndoing}
              className="flex items-center gap-2"
              title="Desfazer última movimentação"
            >
              {isUndoing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Undo2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Desfazer</span>
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[550px] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-300",
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background/50 space-y-3">
          <div className="bg-primary/5 rounded-lg p-3 border-2 border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Barcode className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Saída Rápida por Código de Barras</span>
              {barcodeQueue.length > 0 && (
                <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">
                  {barcodeQueue.length} na fila
                </span>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleBarcodeSubmit();
              }}
              className="flex gap-2"
            >
              <Input
                ref={barcodeInputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Bipe o código aqui..."
                className="flex-1 font-mono"
                autoFocus
              />
              <Button 
                type="submit" 
                disabled={!barcode.trim()}
                variant="default"
              >
                {processingQueue ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Barcode className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Button
              type="button"
              onClick={toggleRecording}
              disabled={isLoading}
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className={isRecording ? "animate-pulse" : ""}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite ou grave seu comando..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
