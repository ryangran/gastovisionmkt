import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Cakto checkout URLs to identify plan type
const MONTHLY_CHECKOUT_IDENTIFIERS = ["32i2hyh"];
const LIFETIME_CHECKOUT_IDENTIFIERS = ["6m7kaiz"];

function identifyPlanType(body: any): "monthly" | "lifetime" {
  // Check product/offer info from Cakto payload
  const checkoutUrl = body?.checkout_url || body?.checkout?.url || body?.product?.checkout_url || "";
  const productName = (body?.product?.name || body?.product_name || "").toLowerCase();
  const offerId = body?.offer?.id || body?.offer_id || "";
  const transactionId = body?.transaction?.id || body?.transaction_id || body?.id || "";

  // Check if any lifetime identifier matches
  const allText = `${checkoutUrl} ${productName} ${offerId} ${transactionId}`.toLowerCase();
  
  if (LIFETIME_CHECKOUT_IDENTIFIERS.some(id => allText.includes(id))) {
    return "lifetime";
  }
  
  if (productName.includes("vitalício") || productName.includes("vitalicio") || productName.includes("lifetime")) {
    return "lifetime";
  }

  return "monthly";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    console.log("Webhook payload:", JSON.stringify(body));

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

    if (status !== "approved" && status !== "completed" && status !== "paid") {
      console.log(`Transaction ${transactionId} status: ${status} - skipping`);
      return new Response(
        JSON.stringify({ message: "Transaction not approved, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planType = identifyPlanType(body);
    console.log(`Identified plan type: ${planType}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedEmail = email.toLowerCase().trim();
    const defaultPassword = "Gasto123";

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!userExists) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: defaultPassword,
        email_confirm: true,
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`User created for ${normalizedEmail}`);
    } else {
      console.log(`User already exists for ${normalizedEmail}`);
    }

    // Calculate expires_at for monthly plans (30 days from now)
    const expiresAt = planType === "monthly" 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert purchase record
    const { error } = await supabase.from("purchases").insert({
      user_email: normalizedEmail,
      transaction_id: transactionId,
      status: "approved",
      plan_type: planType,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("Error inserting purchase:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save purchase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Purchase recorded for ${normalizedEmail}, plan: ${planType}, transaction: ${transactionId}, expires: ${expiresAt || 'never'}`);

    return new Response(
      JSON.stringify({ success: true, plan_type: planType }),
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
