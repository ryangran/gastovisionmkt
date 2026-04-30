import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SaveCalcData {
  platform: string;
  product_name: string;
  sale_price: number;
  cost: number;
  profit_margin_percent: number;
  profit_margin_value: number;
}

export function useSavedCalculations() {
  const saveCalculation = async (data: SaveCalcData): Promise<boolean> => {
    if (!data.product_name.trim()) {
      toast.error("Informe o nome do produto antes de salvar.");
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
    });

    if (error) {
      console.error("Erro ao salvar cálculo:", error);
      toast.error("Erro ao salvar produto.");
      return false;
    }

    toast.success(`"${data.product_name}" salvo com sucesso!`);
    return true;
  };

  return { saveCalculation };
}
