import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, userId, data } = await req.json();

    switch (action) {
      case "delete_user": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Delete purchases first
        const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (targetUser?.user?.email) {
          await supabaseAdmin.from("purchases").delete().eq("user_email", targetUser.user.email);
        }
        // Delete user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_purchase": {
        if (!data?.purchaseId) {
          return new Response(JSON.stringify({ error: "purchaseId obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const updateData: Record<string, unknown> = {};
        if (data.plan_type) updateData.plan_type = data.plan_type;
        if (data.status) updateData.status = data.status;
        if (data.expires_at !== undefined) updateData.expires_at = data.expires_at;

        const { error: updateError } = await supabaseAdmin
          .from("purchases")
          .update(updateData)
          .eq("id", data.purchaseId);
        if (updateError) throw updateError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_purchase": {
        if (!data?.userEmail || !data?.plan_type) {
          return new Response(JSON.stringify({ error: "userEmail e plan_type obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const insertData: Record<string, unknown> = {
          user_email: data.userEmail,
          plan_type: data.plan_type,
          status: "approved",
          purchased_at: new Date().toISOString(),
        };
        if (data.plan_type === "monthly") {
          const exp = new Date();
          exp.setDate(exp.getDate() + 30);
          insertData.expires_at = exp.toISOString();
        } else if (data.plan_type === "daily") {
          const exp = new Date();
          exp.setDate(exp.getDate() + 1);
          insertData.expires_at = exp.toISOString();
        }
        const { error: insertError } = await supabaseAdmin.from("purchases").insert(insertData);
        if (insertError) throw insertError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_user": {
        if (!data?.email || !data?.password) {
          return new Response(JSON.stringify({ error: "email e password obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: data.email as string,
          password: data.password as string,
          email_confirm: true,
        });
        if (createError) throw createError;

        // Create purchase for the new user
        const planType = (data.plan_type as string) || "monthly";
        const purchaseData: Record<string, unknown> = {
          user_email: data.email,
          plan_type: planType,
          status: "approved",
          purchased_at: new Date().toISOString(),
        };
        if (planType === "monthly") {
          const exp = new Date();
          exp.setDate(exp.getDate() + 30);
          purchaseData.expires_at = exp.toISOString();
        } else if (planType === "daily") {
          const exp = new Date();
          exp.setDate(exp.getDate() + 1);
          purchaseData.expires_at = exp.toISOString();
        }
        await supabaseAdmin.from("purchases").insert(purchaseData);

        return new Response(JSON.stringify({ success: true, userId: newUser.user?.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: "Gasto123",
        });
        if (resetError) throw resetError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Admin action error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
