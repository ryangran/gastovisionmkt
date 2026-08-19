import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SaveCalcData {
  /**
   * Nome de exibição da plataforma ("Shopee", "Mercado Livre", "TikTok Shop").
   * Não é a PlatformKey: os registros já gravados usam esse formato e a tela de
   * produtos salvos filtra por ele.
   */
  platform: string;
  product_name: string;
  sale_price: number;
  cost: number;
  profit_margin_percent: number;
  profit_margin_value: number;
  /**
   * Entradas completas da calculadora. Sem elas não há como recalcular o produto
   * quando a taxa do marketplace mudar.
   */
  inputs: Record<string, unknown>;
  /** Unidades em estoque, para o custo imobilizado no dashboard. */
  stock_quantity: number;
}

export function useSavedCalculations() {
  const saveCalculation = async (data: SaveCalcData): Promise<boolean> => {
    if (!data.product_name.trim()) {
      toast.error("Informe o nome do produto antes de salvar.");
      return false;
    }

    if (!Number.isInteger(data.stock_quantity) || data.stock_quantity < 0) {
      toast.error("A quantidade em estoque deve ser um número inteiro igual ou maior que zero.");
      return false;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      toast.error("Usuário não autenticado.");
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("saved_calculations").insert({
      user_email: session.user.email,
      platform: data.platform,
      product_name: data.product_name.trim(),
      sale_price: data.sale_price,
      cost: data.cost,
      profit_margin_percent: data.profit_margin_percent,
      profit_margin_value: data.profit_margin_value,
      inputs: data.inputs,
      stock_quantity: data.stock_quantity,
    });

    if (error) {
      console.error("Erro ao salvar cálculo:", error);
      toast.error("Erro ao salvar produto.");
      return false;
    }

    toast.success(`"${data.product_name}" salvo com sucesso.`);
    return true;
  };

  return { saveCalculation };
}
