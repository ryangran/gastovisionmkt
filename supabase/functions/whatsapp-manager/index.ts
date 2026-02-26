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
    const zApiToken = Deno.env.get('Z_API_TOKEN');
    const zApiInstanceId = Deno.env.get('Z_API_INSTANCE_ID');
    
    if (!zApiToken || !zApiInstanceId) {
      console.error('WhatsApp service configuration error');
      return new Response(
        JSON.stringify({ success: false, message: 'Serviço temporariamente indisponível' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const zApiBaseUrl = `https://api.z-api.io/instances/${zApiInstanceId}/token/${zApiToken}`;
    const zApiHeaders = {
      'Client-Token': zApiToken,
      'Content-Type': 'application/json'
    };
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      throw new Error('Unauthorized: Admin role required');
    }

    const { action, phoneNumber, message } = await req.json();
    console.log(`Processing Z-API action: ${action}`);

    switch (action) {
      case 'generate_qr': {
        console.log('Requesting QR code from Z-API...');
        
        // First check if already connected
        const statusResponse = await fetch(`${zApiBaseUrl}/status`, {
          method: 'GET',
          headers: zApiHeaders,
        });

        if (!statusResponse.ok) {
          throw new Error(`Z-API error: ${statusResponse.statusText}`);
        }

        const statusData = await statusResponse.json();
        console.log('Z-API Status:', statusData);

        // If connected, return connected status
        if (statusData.connected) {
          return new Response(
            JSON.stringify({ connected: true, qrCode: null }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If not connected, get QR code
        const qrResponse = await fetch(`${zApiBaseUrl}/qr-code/image`, {
          method: 'GET',
          headers: zApiHeaders,
        });

        if (!qrResponse.ok) {
          throw new Error(`Z-API QR error: ${qrResponse.statusText}`);
        }

        const qrData = await qrResponse.json();
        console.log('QR code received from Z-API');
        
        return new Response(
          JSON.stringify({ 
            connected: false, 
            qrCode: qrData.value || qrData.qrcode || qrData.image 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'check_status': {
        console.log('Checking Z-API connection status...');
        const response = await fetch(`${zApiBaseUrl}/status`, {
          method: 'GET',
          headers: zApiHeaders,
        });

        if (!response.ok) {
          throw new Error(`Z-API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Z-API connection status:', data.connected);
        
        return new Response(
          JSON.stringify({ connected: data.connected || false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save_phone_number': {
        if (!phoneNumber || typeof phoneNumber !== 'string') {
          console.error('Invalid phone number format');
          return new Response(
            JSON.stringify({ success: false, message: 'Número de telefone inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate phone number length to prevent injection
        if (phoneNumber.length > 20) {
          console.error('Phone number too long');
          return new Response(
            JSON.stringify({ success: false, message: 'Número de telefone inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log('Saving phone number for notifications:', phoneNumber);
        
        // Save to database for future use
        const { error: dbError } = await supabase
          .from('settings')
          .upsert({ 
            key: 'whatsapp_notification_number',
            value: phoneNumber,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error('Failed to save phone number');
        }

        console.log('Phone number saved successfully');
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send_notification': {
        if (!message || typeof message !== 'string') {
          console.error('Invalid message format');
          return new Response(
            JSON.stringify({ success: false, message: 'Mensagem inválida' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Limit message length to prevent abuse
        if (message.length > 2000) {
          console.error('Message too long');
          return new Response(
            JSON.stringify({ success: false, message: 'Mensagem muito longa. Limite: 2000 caracteres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Sending message via Z-API...');
        
        // Get saved phone number from database
        const { data: settingData, error: settingError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'whatsapp_notification_number')
          .maybeSingle();

        if (settingError || !settingData?.value) {
          throw new Error('Phone number not configured');
        }

        const targetPhone = settingData.value;
        console.log('Sending to:', targetPhone);

        const response = await fetch(`${zApiBaseUrl}/send-text`, {
          method: 'POST',
          headers: zApiHeaders,
          body: JSON.stringify({ 
            phone: targetPhone,
            message: message
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('WhatsApp API error:', response.status, errorData);
          return new Response(
            JSON.stringify({ success: false, message: 'Erro ao enviar mensagem' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Message sent successfully via Z-API');
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error: any) {
    console.error('Error in whatsapp-manager:', error);
    // Don't expose internal error details to clients
    const isUnauthorized = error.message?.includes('Unauthorized') || error.message?.includes('Admin role required');
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: isUnauthorized ? 'Acesso não autorizado' : 'Erro ao processar solicitação' 
      }),
      { 
        status: isUnauthorized ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
