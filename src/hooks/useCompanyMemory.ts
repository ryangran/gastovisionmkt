import { supabase } from "@/integrations/supabase/client";

type MemoryCategory = "compra" | "preco" | "producao" | "marketing" | "pausa" | "ajuste" | "estrategia";
type MemoryOrigin = "manual" | "central_decisoes" | "pedido_compra" | "precificacao" | "estoque";

interface CreateMemoryParams {
  category: MemoryCategory;
  summary: string;
  origin: MemoryOrigin;
  userEmail: string;
  productId?: string;
  productName?: string;
  sku?: string;
  channel?: string;
  reason?: string;
  notes?: string;
  relatedId?: string;
  relatedType?: string;
}

export const createCompanyMemory = async (params: CreateMemoryParams) => {
  try {
    const { error } = await supabase.from("company_memory").insert({
      user_email: params.userEmail,
      origin: params.origin,
      category: params.category,
      summary: params.summary.slice(0, 200),
      product_id: params.productId || null,
      product_name: params.productName || null,
      sku: params.sku || null,
      channel: params.channel || null,
      reason: params.reason || null,
      notes: params.notes || null,
      related_id: params.relatedId || null,
      related_type: params.relatedType || null,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error creating company memory:", error);
    return { success: false, error };
  }
};

// Pre-built helper functions for common scenarios
export const logPurchaseDecision = async (
  userEmail: string,
  productName: string,
  quantity: number,
  reason: string,
  productId?: string,
  orderId?: string
) => {
  return createCompanyMemory({
    category: "compra",
    summary: `Compra de ${quantity} unidades de ${productName}`,
    origin: "pedido_compra",
    userEmail,
    productId,
    productName,
    reason,
    relatedId: orderId,
    relatedType: "purchase_order",
  });
};

export const logPriceDecision = async (
  userEmail: string,
  productName: string,
  action: string,
  channel?: string,
  reason?: string,
  productId?: string
) => {
  return createCompanyMemory({
    category: "preco",
    summary: `${action} - ${productName}`,
    origin: "precificacao",
    userEmail,
    productId,
    productName,
    channel,
    reason,
  });
};

export const logCentralDecision = async (
  userEmail: string,
  productName: string,
  action: string,
  blockType: string,
  productId?: string
) => {
  const categoryMap: { [key: string]: MemoryCategory } = {
    buy_now: "compra",
    adjust_price: "preco",
    monitor: "ajuste",
  };

  return createCompanyMemory({
    category: categoryMap[blockType] || "ajuste",
    summary: `${action} - ${productName}`,
    origin: "central_decisoes",
    userEmail,
    productId,
    productName,
  });
};

export const logStockDecision = async (
  userEmail: string,
  productName: string,
  action: string,
  reason?: string,
  productId?: string
) => {
  return createCompanyMemory({
    category: "ajuste",
    summary: `${action} - ${productName}`,
    origin: "estoque",
    userEmail,
    productId,
    productName,
    reason,
  });
};
