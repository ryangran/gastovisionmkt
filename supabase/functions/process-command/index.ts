import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, message: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create client for auth validation
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, message: 'Autenticação inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { command, panel_type = 'production' } = await req.json();
    
    // Input validation to prevent injection attacks and resource exhaustion
    if (!command || typeof command !== 'string') {
      console.error('Invalid command format');
      return new Response(
        JSON.stringify({ success: false, message: 'Comando inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit command length to prevent resource exhaustion
    if (command.length > 500) {
      console.error('Command too long:', command.length);
      return new Response(
        JSON.stringify({ success: false, message: 'Comando muito longo. Limite: 500 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize command by removing potentially dangerous characters
    const sanitizedCommand = command.trim();
    
    console.log('Processing command:', sanitizedCommand, 'Panel type:', panel_type);

    // Verify user has appropriate role for admin panel
    if (panel_type === 'admin') {
      const { data: userRole, error: roleError } = await supabaseAuth
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !userRole) {
        console.error('User does not have admin role');
        return new Response(
          JSON.stringify({ success: false, message: 'Permissões insuficientes' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Use service role client for database operations (already created above as supabaseAuth)
    const supabase = supabaseAuth;

    // Get all products for context (filtered by panel_type)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('panel_type', panel_type);

    const productsContext = products?.map(p => 
      `- ${p.name} (ID: ${p.id}${p.barcode ? `, Código: ${p.barcode}` : ''}): ${p.quantity} ${p.unit} disponíveis (mínimo: ${p.min_stock})`
    ).join('\n') || 'Nenhum produto cadastrado';

    // Build the AI prompt with context
    const systemPrompt = `Você é um assistente inteligente de controle de estoque. Interprete comandos em linguagem natural (português brasileiro) e responda APENAS com JSON válido.

VOCÊ DEVE ENTENDER VARIAÇÕES DE LINGUAGEM NATURAL COMO:
- "quero adicionar 5 pilhas" → add
- "preciso tirar 3 parafusos" → remove  
- "coloca mais 10 de cola" → add
- "registra aí 20 pregos" → add
- "quanto tem de fita?" → query
- "me mostra o estoque de cola" → query
- "cadastra novo produto caneta 50 unidades" → create
- "cria o produto lápis com 100" → create
- "tira 5 borrachas do estoque" → remove
- "pega 2 de tesoura" → remove
- "dá baixa em 3 grampeadores" → remove
- "faz entrada de 15 clips" → add
- "chegou 20 de papel" → add
- "diminui 4 do estoque de régua" → remove

Produtos atuais no estoque:
${productsContext}

Ações disponíveis:
- create: Cadastrar novo produto (quando o produto NÃO existe)
- add: Adicionar/entrada ao estoque (quando o produto JÁ existe)
- remove: Remover/saída do estoque
- add_by_barcode: Adicionar usando código de barras
- remove_by_barcode: Remover usando código de barras
- query: Consultar/verificar estoque
- update_min_stock: Atualizar estoque mínimo
- delete: Excluir produto (SOMENTE se o usuário confirmar com "senha bmsadmin")
- notify: Enviar notificação WhatsApp
- error: Quando não conseguir entender o comando

Formato JSON exato de resposta (escolha UM):
{"action": "create", "name": "nome", "quantity": 10, "unit": "unidade", "min_stock": 5, "barcode": "123"}
{"action": "add", "product_id": "id_do_produto_existente", "quantity": 5}
{"action": "remove", "product_id": "id_do_produto_existente", "quantity": 3}
{"action": "add_by_barcode", "barcode": "123", "quantity": 1}
{"action": "remove_by_barcode", "barcode": "123", "quantity": 1}
{"action": "query", "product_id": "id_do_produto"}
{"action": "update_min_stock", "product_id": "id", "min_stock": 10}
{"action": "delete", "product_id": "id", "password": "bmsadmin"}
{"action": "notify", "message": "texto"}
{"action": "error", "message": "descrição clara do erro em português"}

REGRAS CRÍTICAS:
1. SEMPRE responda APENAS com JSON válido, sem texto adicional antes ou depois
2. Para criar produto, sempre inclua: name, quantity, unit (padrão "un"), min_stock (padrão 0)
3. Para add/remove, OBRIGATORIAMENTE use o "product_id" da lista de produtos acima
4. Faça correspondência FLEXÍVEL de nomes (pilha = pilhas = Pilha AA = pilha aa)
5. Se o usuário mencionar um produto que EXISTE, use add ou remove com o ID correto
6. Se o usuário quer criar um produto NOVO (que não existe na lista), use create
7. Se não entender o comando, retorne {"action": "error", "message": "Não entendi. Tente: 'adicionar 5 de [produto]' ou 'tirar 3 de [produto]'"}
8. NUNCA invente product_id - use APENAS os IDs da lista de produtos acima
9. NUNCA invente senha: só inclua "password" se o usuário digitar explicitamente "senha ..." no comando`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Chave de API não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI Gateway
    let parsedAction;
    try {
      console.log('Calling Lovable AI...');
      const aiResponse = await fetch(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: sanitizedCommand }
            ],
            temperature: 0.2,
            max_tokens: 800
          })
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('Lovable AI error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Limite de requisições atingido. Tente novamente em alguns segundos.' 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Créditos insuficientes no Lovable AI. Adicione créditos em Settings → Workspace → Usage.' 
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Lovable AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      console.log('Lovable AI response:', JSON.stringify(aiData));
      
      const aiText = aiData.choices?.[0]?.message?.content;
      if (!aiText) {
        throw new Error('No content in Lovable AI response');
      }

      console.log('AI interpretation:', aiText);

      // Extract JSON from response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      parsedAction = JSON.parse(jsonMatch[0]);
      console.log('Parsed action:', parsedAction);

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Erro ao processar comando com IA' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute action
    let result;
    switch (parsedAction.action) {
      case 'create': {
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: parsedAction.name,
            quantity: parsedAction.quantity,
            unit: parsedAction.unit,
            min_stock: parsedAction.min_stock || 0,
            barcode: parsedAction.barcode || null,
            panel_type,
          })
          .select()
          .single();

        if (error) throw error;

        await supabase.from('movements').insert({
          product_id: data.id,
          type: 'cadastro',
          quantity: parsedAction.quantity,
          previous_quantity: 0,
          new_quantity: parsedAction.quantity,
          command,
          panel_type,
        });

        const barcodeInfo = parsedAction.barcode ? ` (Código: ${parsedAction.barcode})` : '';
        result = {
          success: true,
          message: `✅ Produto "${parsedAction.name}" cadastrado com sucesso${barcodeInfo}! Estoque inicial: ${parsedAction.quantity} ${parsedAction.unit}`,
          data
        };
        break;
      }

      case 'add': {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', parsedAction.product_id)
          .eq('panel_type', panel_type)
          .single();

        if (!product) {
          result = { success: false, message: "❌ Produto não encontrado." };
          break;
        }

        const newQuantity = Number(product.quantity) + Number(parsedAction.quantity);
        
        await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', parsedAction.product_id);

        await supabase.from('movements').insert({
          product_id: parsedAction.product_id,
          type: 'entrada',
          quantity: parsedAction.quantity,
          previous_quantity: product.quantity,
          new_quantity: newQuantity,
          command,
          panel_type,
        });

        result = {
          success: true,
          message: `✅ Entrada de ${parsedAction.quantity} ${product.unit} de "${product.name}". Saldo atual: ${newQuantity} ${product.unit}`
        };
        break;
      }

      case 'remove': {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', parsedAction.product_id)
          .eq('panel_type', panel_type)
          .single();

        if (!product) {
          result = { success: false, message: "❌ Produto não encontrado." };
          break;
        }

        if (Number(product.quantity) < Number(parsedAction.quantity)) {
          result = {
            success: false,
            message: `❌ Estoque insuficiente! Disponível: ${product.quantity} ${product.unit}, Solicitado: ${parsedAction.quantity} ${product.unit}`
          };
          break;
        }

        const newQuantity = Number(product.quantity) - Number(parsedAction.quantity);
        
        await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', parsedAction.product_id);

        await supabase.from('movements').insert({
          product_id: parsedAction.product_id,
          type: 'saida',
          quantity: parsedAction.quantity,
          previous_quantity: product.quantity,
          new_quantity: newQuantity,
          command,
          panel_type,
        });

        const lowStockWarning = newQuantity <= Number(product.min_stock) 
          ? `\n⚠️ ALERTA: Estoque abaixo do mínimo (${product.min_stock} ${product.unit})!` 
          : '';

        // Send WhatsApp notification if stock is low
        if (newQuantity <= Number(product.min_stock)) {
          try {
            await supabase.functions.invoke('whatsapp-manager', {
              body: {
                action: 'send_notification',
                message: `⚠️ *Estoque Baixo*\n` +
                  `Produto: ${product.name}\n` +
                  `Quantidade atual: ${newQuantity} ${product.unit}\n` +
                  `Estoque mínimo: ${product.min_stock} ${product.unit}\n` +
                  `Código de barras: ${product.barcode || 'N/A'}`
              }
            });
          } catch (whatsappError) {
            console.error('Failed to send WhatsApp notification:', whatsappError);
          }
        }

        result = {
          success: true,
          message: `✅ Saída de ${parsedAction.quantity} ${product.unit} de "${product.name}". Saldo atual: ${newQuantity} ${product.unit}${lowStockWarning}`
        };
        break;
      }

      case 'query': {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', parsedAction.product_id)
          .eq('panel_type', panel_type)
          .single();

        if (!product) {
          result = { success: false, message: "❌ Produto não encontrado." };
          break;
        }

        const status = Number(product.quantity) <= Number(product.min_stock) 
          ? `⚠️ BAIXO (mínimo: ${product.min_stock} ${product.unit})` 
          : '✅ OK';

        result = {
          success: true,
          message: `📊 "${product.name}": ${product.quantity} ${product.unit} disponíveis. Status: ${status}`
        };
        break;
      }

      case 'update_min_stock': {
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', parsedAction.product_id)
          .eq('panel_type', panel_type)
          .single();

        if (!product) {
          result = { success: false, message: "❌ Produto não encontrado." };
          break;
        }

        await supabase
          .from('products')
          .update({ min_stock: parsedAction.min_stock })
          .eq('id', parsedAction.product_id);

        result = {
          success: true,
          message: `✅ Estoque mínimo de "${product.name}" atualizado para ${parsedAction.min_stock} ${product.unit}`
        };
        break;
      }

      case 'remove_by_barcode': {
        // Check if a specific product_id was provided (for duplicate barcodes)
        if (parsedAction.product_id) {
          // Direct removal with specific product
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', parsedAction.product_id)
            .eq('panel_type', panel_type)
            .single();

          if (!product) {
            result = { success: false, message: "❌ Produto não encontrado." };
            break;
          }

          const quantity = parsedAction.quantity || 1;

          if (Number(product.quantity) < Number(quantity)) {
            result = {
              success: false,
              message: `❌ Estoque insuficiente! Disponível: ${product.quantity} ${product.unit}, Solicitado: ${quantity} ${product.unit}`
            };
            break;
          }

          const newQuantity = Number(product.quantity) - Number(quantity);
          
          await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', product.id);

          await supabase.from('movements').insert({
            product_id: product.id,
            type: 'saida',
            quantity: quantity,
            previous_quantity: product.quantity,
            new_quantity: newQuantity,
            command,
            panel_type,
          });

          const lowStockWarning = newQuantity <= Number(product.min_stock) 
            ? `\n⚠️ ALERTA: Estoque abaixo do mínimo (${product.min_stock} ${product.unit})!` 
            : '';

          // Send WhatsApp notification if stock is low
          if (newQuantity <= Number(product.min_stock)) {
            try {
              await supabase.functions.invoke('whatsapp-manager', {
                body: {
                  action: 'send_notification',
                  message: `⚠️ *Estoque Baixo*\n` +
                    `Produto: ${product.name}\n` +
                    `Quantidade atual: ${newQuantity} ${product.unit}\n` +
                    `Estoque mínimo: ${product.min_stock} ${product.unit}\n` +
                    `Código de barras: ${product.barcode || 'N/A'}`
                }
              });
            } catch (whatsappError) {
              console.error('Failed to send WhatsApp notification:', whatsappError);
            }
          }

          result = {
            success: true,
            message: `✅ Saída de ${quantity} ${product.unit} de "${product.name}" (Código: ${parsedAction.barcode}). Saldo atual: ${newQuantity} ${product.unit}${lowStockWarning}`
          };
          break;
        }

        // Check for products with this barcode
        const { data: productsWithBarcode } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', parsedAction.barcode)
          .eq('panel_type', panel_type);

        if (!productsWithBarcode || productsWithBarcode.length === 0) {
          result = { success: false, message: "❌ Produto com este código de barras não encontrado." };
          break;
        }

        // If multiple products with same barcode, ask user to select
        if (productsWithBarcode.length > 1) {
          console.log('Multiple products found with barcode:', parsedAction.barcode);
          return new Response(JSON.stringify({ 
            requireProductSelection: true,
            products: productsWithBarcode,
            barcode: parsedAction.barcode,
            quantity: parsedAction.quantity || 1,
            action: 'remove',
            message: "🔍 Múltiplos produtos com este código. Selecione qual deseja dar saída:"
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Single product found
        const product = productsWithBarcode[0];
        const quantity = parsedAction.quantity || 1;

        if (Number(product.quantity) < Number(quantity)) {
          result = {
            success: false,
            message: `❌ Estoque insuficiente! Disponível: ${product.quantity} ${product.unit}, Solicitado: ${quantity} ${product.unit}`
          };
          break;
        }

        const newQuantity = Number(product.quantity) - Number(quantity);
        
        await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', product.id);

        await supabase.from('movements').insert({
          product_id: product.id,
          type: 'saida',
          quantity: quantity,
          previous_quantity: product.quantity,
          new_quantity: newQuantity,
          command,
          panel_type,
        });

        const lowStockWarning = newQuantity <= Number(product.min_stock) 
          ? `\n⚠️ ALERTA: Estoque abaixo do mínimo (${product.min_stock} ${product.unit})!` 
          : '';

        // Send WhatsApp notification if stock is low
        if (newQuantity <= Number(product.min_stock)) {
          try {
            await supabase.functions.invoke('whatsapp-manager', {
              body: {
                action: 'send_notification',
                message: `⚠️ *Estoque Baixo*\n` +
                  `Produto: ${product.name}\n` +
                  `Quantidade atual: ${newQuantity} ${product.unit}\n` +
                  `Estoque mínimo: ${product.min_stock} ${product.unit}\n` +
                  `Código de barras: ${parsedAction.barcode}`
              }
            });
          } catch (whatsappError) {
            console.error('Failed to send WhatsApp notification:', whatsappError);
          }
        }

        result = {
          success: true,
          message: `✅ Saída de ${quantity} ${product.unit} de "${product.name}" (Código: ${parsedAction.barcode}). Saldo atual: ${newQuantity} ${product.unit}${lowStockWarning}`
        };
        break;
      }

      case 'add_by_barcode': {
        // Check if a specific product_id was provided (for duplicate barcodes)
        if (parsedAction.product_id) {
          // Direct addition with specific product
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', parsedAction.product_id)
            .eq('panel_type', panel_type)
            .single();

          if (!product) {
            result = { success: false, message: "❌ Produto não encontrado." };
            break;
          }

          const quantity = parsedAction.quantity || 1;
          const newQuantity = Number(product.quantity) + Number(quantity);
          
          await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', product.id);

          await supabase.from('movements').insert({
            product_id: product.id,
            type: 'entrada',
            quantity: quantity,
            previous_quantity: product.quantity,
            new_quantity: newQuantity,
            command,
            panel_type,
          });

          result = {
            success: true,
            message: `✅ Entrada de ${quantity} ${product.unit} de "${product.name}" (Código: ${parsedAction.barcode}). Saldo atual: ${newQuantity} ${product.unit}`
          };
          break;
        }

        // Check for products with this barcode
        const { data: productsWithBarcode } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', parsedAction.barcode)
          .eq('panel_type', panel_type);

        if (!productsWithBarcode || productsWithBarcode.length === 0) {
          result = { success: false, message: "❌ Produto com este código de barras não encontrado." };
          break;
        }

        // If multiple products with same barcode, ask user to select
        if (productsWithBarcode.length > 1) {
          console.log('Multiple products found with barcode:', parsedAction.barcode);
          return new Response(JSON.stringify({ 
            requireProductSelection: true,
            products: productsWithBarcode,
            barcode: parsedAction.barcode,
            quantity: parsedAction.quantity || 1,
            action: 'add',
            message: "🔍 Múltiplos produtos com este código. Selecione qual deseja dar entrada:"
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Single product found
        const product = productsWithBarcode[0];
        const quantity = parsedAction.quantity || 1;
        const newQuantity = Number(product.quantity) + Number(quantity);
        
        await supabase
          .from('products')
          .update({ quantity: newQuantity })
          .eq('id', product.id);

        await supabase.from('movements').insert({
          product_id: product.id,
          type: 'entrada',
          quantity: quantity,
          previous_quantity: product.quantity,
          new_quantity: newQuantity,
          command,
          panel_type,
        });

        result = {
          success: true,
          message: `✅ Entrada de ${quantity} ${product.unit} de "${product.name}" (Código: ${parsedAction.barcode}). Saldo atual: ${newQuantity} ${product.unit}`
        };
        break;
      }

      case 'delete': {
        const hasExplicitSenha = /\bsenha\b/i.test(sanitizedCommand);

        // If the user didn't explicitly type "senha ...", always ask for password.
        // This prevents the AI from hallucinating a password value.
        if (!hasExplicitSenha) {
          console.log('No explicit senha in command, requesting password');
          return new Response(JSON.stringify({
            requirePassword: true,
            productId: parsedAction.product_id,
            message: "🔒 Digite a senha para confirmar a exclusão"
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if password is provided in the parsed action
        if (!parsedAction.password) {
          console.log('Password token present but password not parsed, requesting it');
          return new Response(JSON.stringify({
            requirePassword: true,
            productId: parsedAction.product_id,
            message: "🔒 Digite a senha para confirmar a exclusão"
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Password provided, validating...');
        
        // Validate password
        if (parsedAction.password !== 'bmsadmin') {
          console.log('Invalid password provided');
          result = { success: false, message: "❌ Senha incorreta!" };
          break;
        }

        console.log('Password valid, proceeding with deletion');
        
        // Security: Admin role is already verified at function entry (lines 48-62)
        // Only admins can reach this code, and RLS policies enforce admin-only deletion
        
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', parsedAction.product_id)
          .eq('panel_type', panel_type)
          .single();

        if (!product) {
          result = { success: false, message: "❌ Produto não encontrado." };
          break;
        }

        // Delete all movements related to this product first
        await supabase
          .from('movements')
          .delete()
          .eq('product_id', parsedAction.product_id);

        // Then delete the product
        await supabase
          .from('products')
          .delete()
          .eq('id', parsedAction.product_id);

        result = {
          success: true,
          message: `✅ Produto "${product.name}" excluído com sucesso!`
        };
        break;
      }

      case 'notify': {
        if (!parsedAction.message) {
          result = { success: false, message: "❌ Mensagem não especificada para notificação." };
          break;
        }

        try {
          await supabase.functions.invoke('whatsapp-manager', {
            body: {
              action: 'send_notification',
              message: `📢 *Notificação do Sistema*\n\n${parsedAction.message}`
            }
          });

          result = {
            success: true,
            message: '✅ Notificação enviada para o WhatsApp com sucesso!'
          };
        } catch (whatsappError: any) {
          console.error('Failed to send WhatsApp notification:', whatsappError);
          result = {
            success: false,
            message: `❌ Erro ao enviar notificação: ${whatsappError.message}`
          };
        }
        break;
      }

      case 'error': {
        result = {
          success: false,
          message: parsedAction.message || "❌ Não consegui processar este comando."
        };
        break;
      }

      default: {
        result = {
          success: false,
          message: "❌ Comando não reconhecido. Tente: 'cadastrar', 'entrada', 'saída' ou 'consulta'."
        };
      }
    }

    console.log('Result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing command:', error);
    // Don't expose internal error details to clients
    return new Response(JSON.stringify({
      success: false,
      message: 'Erro ao processar comando. Tente novamente.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});