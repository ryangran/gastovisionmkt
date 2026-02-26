import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Cakto envia dados do comprador no webhook
    const email = body?.customer?.email || body?.buyer?.email || body?.email;
    const transactionId = body?.transaction?.id || body?.transaction_id || body?.id || "unknown";
    const status = body?.transaction?.status || body?.status || "approved";

    if (!email) {
      console.error("No email found in webhook payload:", JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Email not found in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only process approved transactions
    if (status !== "approved" && status !== "completed" && status !== "paid") {
      console.log(`Transaction ${transactionId} status: ${status} - skipping`);
      return new Response(
        JSON.stringify({ message: "Transaction not approved, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert purchase record
    const { error } = await supabase.from("purchases").insert({
      user_email: email.toLowerCase().trim(),
      transaction_id: transactionId,
      status: "approved",
    });

    if (error) {
      console.error("Error inserting purchase:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save purchase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Purchase recorded for ${email}, transaction: ${transactionId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
