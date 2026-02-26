import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional: Validate authentication if called by user (not cron)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (user) {
        // If authenticated, verify admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleData) {
          console.error('User does not have admin role');
          return new Response(
            JSON.stringify({ success: false, message: 'Permissões insuficientes' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log('Checking low stock products...');

    // Check if this was triggered by database trigger (with specific product data)
    const body = await req.json().catch(() => ({}));
    let filteredProducts = [];

    if (body.product_id) {
      // Called from database trigger with specific product
      console.log(`Trigger called for product: ${body.product_name}`);
      filteredProducts = [{
        id: body.product_id,
        name: body.product_name,
        quantity: body.quantity,
        min_stock: body.min_stock,
        unit: 'un', // Default unit if not provided
        barcode: null
      }];
    } else {
      // Manual call or cron - check all products
      console.log('Manual/cron call - checking all products');
      const { data: lowStockProducts, error: queryError } = await supabase
        .from('products')
        .select('*');

      if (queryError) {
        console.error('Error fetching products:', queryError);
        throw queryError;
      }

      // Filter low stock products
      filteredProducts = lowStockProducts?.filter(
        p => p.quantity <= p.min_stock
      ) || [];
    }

    if (filteredProducts.length > 0) {
      const messages = filteredProducts.map(p => 
        `⚠️ *Estoque Baixo*\n` +
        `Produto: ${p.name}\n` +
        `Quantidade atual: ${p.quantity} ${p.unit}\n` +
        `Estoque mínimo: ${p.min_stock} ${p.unit}\n` +
        `Código de barras: ${p.barcode || 'N/A'}`
      );

      const fullMessage = `🔔 *Alerta de Estoque*\n\n${messages.join('\n\n')}`;

      // Send notification via WhatsApp
      try {
        const { error: whatsappError } = await supabase.functions.invoke('whatsapp-manager', {
          body: {
            action: 'send_notification',
            message: fullMessage
          }
        });

        if (whatsappError) {
          console.error('Error sending WhatsApp notification:', whatsappError);
        }
      } catch (whatsappError) {
        console.error('WhatsApp notification failed:', whatsappError);
      }

      // Send email notification
      try {
        const emailHtml = `
          <h2>🔔 Alerta de Estoque Baixo</h2>
          <p>Os seguintes produtos estão com estoque abaixo do mínimo:</p>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Produto</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Qtd. Atual</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Estoque Mínimo</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Código de Barras</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts.map(p => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${p.name}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${p.quantity} ${p.unit}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${p.min_stock} ${p.unit}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${p.barcode || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #666;">
            Este é um alerta automático do sistema BMS Stock.
          </p>
        `;

        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            subject: `⚠️ Alerta: ${filteredProducts.length} produto(s) com estoque baixo`,
            html: emailHtml
          }
        });

        if (emailError) {
          console.error('Error sending email notification:', emailError);
        } else {
          console.log('Email notification sent successfully');
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        checked: true, 
        lowStockCount: filteredProducts.length,
        products: filteredProducts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-low-stock:', error);
    // Don't expose internal error details to clients
    return new Response(
      JSON.stringify({ success: false, message: 'Erro ao verificar estoque' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
