import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Routine {
  id: string;
  person_name: string;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'conditional';
  day_of_week: number | null;
  day_of_month_start: number | null;
  day_of_month_end: number | null;
  exclude_weekends: boolean;
  is_active: boolean;
}

// Variações para tarefas diárias do Ryan
const ryanVariations: Record<string, string[]> = {
  'Amazon – Operação Completa': [
    '🔍 Foco: Verificar pedidos pendentes e acompanhar entregas atrasadas',
    '📊 Foco: Analisar métricas de performance e taxa de conversão',
    '⚠️ Foco: Revisar alertas de conta e resolver pendências',
    '📦 Foco: Conferir status de anúncios e otimizar listings',
    '💰 Foco: Verificar Buy Box e ajustar preços competitivos',
  ],
  'Análise de Contas (Marketplaces)': [
    '🏪 Foco: Mercado Livre - verificar reputação e métricas',
    '🛒 Foco: Shopee - conferir penalidades e pontos de atenção',
    '📱 Foco: Magalu - status da conta e notificações',
    '🎯 Foco: Revisão geral de todas as contas',
    '📋 Foco: Documentar pendências encontradas para resolver',
  ],
  'Gestão de ADS (exceto Shopee BMS)': [
    '📈 Foco: Mercado Livre Ads - verificar ROI e ajustar lances',
    '🎯 Foco: Amazon Ads - otimizar campanhas com baixo desempenho',
    '💡 Foco: TikTok Ads - revisar criativos e engajamento',
    '🔧 Foco: Site próprio - Google Ads e Meta Ads',
    '📊 Foco: Análise comparativa de performance entre plataformas',
  ],
  'Gerenciamento de Revisões': [
    '⭐ Foco: Responder avaliações negativas com prioridade',
    '💬 Foco: Agradecer avaliações positivas recentes',
    '🔍 Foco: Identificar padrões em reclamações',
    '📝 Foco: Documentar feedbacks para melhoria de produtos',
    '🎯 Foco: Solicitar reviews de clientes satisfeitos',
  ],
  'Transmissão por Chat': [
    '💬 Foco: Responder mensagens urgentes primeiro',
    '🤝 Foco: Follow-up com clientes em negociação',
    '❓ Foco: Esclarecer dúvidas sobre produtos',
    '📦 Foco: Atualizar clientes sobre status de pedidos',
    '🎯 Foco: Converter leads em vendas',
  ],
  'Site Próprio': [
    '🛒 Foco: Processar pedidos novos e verificar pagamentos',
    '🔧 Foco: Testar checkout e corrigir erros',
    '📱 Foco: Verificar responsividade mobile',
    '🔍 Foco: Conferir SEO e indexação de produtos',
    '💳 Foco: Verificar integrações de pagamento',
  ],
  'TikTok Shop': [
    '📦 Foco: Processar pedidos e preparar envios',
    '📊 Foco: Analisar métricas de vendas e views',
    '🎬 Foco: Revisar performance de vídeos de produtos',
    '⚠️ Foco: Verificar avisos e pendências da conta',
    '🏷️ Foco: Atualizar preços e promoções',
  ],
};

// Variações para tarefas diárias da Miria
const miriaVariations: Record<string, string[]> = {
  'Magalu – Operação Completa': [
    '📦 Foco: Gerenciar pedidos novos e pendentes',
    '📊 Foco: Verificar métricas de performance',
    '🏷️ Foco: Atualizar anúncios e descrições',
    '⚠️ Foco: Resolver pendências e alertas',
    '💰 Foco: Revisar preços e margem de lucro',
  ],
  'Análise de Produtos': [
    '📉 Foco: Identificar produtos com baixa saída (últimos 30 dias)',
    '📦 Foco: Verificar estoque alto x demanda',
    '🔄 Foco: Sugerir produtos para promoção',
    '❌ Foco: Avaliar produtos para descontinuar',
    '✨ Foco: Identificar oportunidades de novos produtos',
  ],
  'Precificação': [
    '💰 Foco: Revisar margem de produtos principais',
    '🔍 Foco: Análise de concorrência nos marketplaces',
    '📊 Foco: Atualizar custos recentes no sistema',
    '🏷️ Foco: Criar promoções estratégicas',
    '📈 Foco: Ajustar preços baseado em performance',
  ],
  'ADS Shopee BMS': [
    '📈 Foco: Otimizar campanhas com baixo ROI',
    '💰 Foco: Ajustar orçamento por produto',
    '🎯 Foco: Testar novos públicos-alvo',
    '📊 Foco: Analisar relatório de performance',
    '🔧 Foco: Pausar campanhas não rentáveis',
  ],
};

// Tarefas extras ocasionais
const bonusTasks: { person: string; title: string; description: string; chance: number }[] = [
  { person: 'Ryan', title: '🧹 Limpeza de Dados', description: 'Revisar e organizar planilhas, remover duplicatas, atualizar informações desatualizadas.', chance: 0.15 },
  { person: 'Ryan', title: '📚 Capacitação', description: 'Dedicar 30min para estudar novidades das plataformas ou assistir tutorial relevante.', chance: 0.1 },
  { person: 'Ryan', title: '🤝 Networking', description: 'Verificar grupos de sellers, fóruns ou comunidades para trocar experiências.', chance: 0.08 },
  { person: 'Ryan', title: '📋 Documentação', description: 'Atualizar procedimentos, criar SOPs ou documentar processos importantes.', chance: 0.1 },
  { person: 'Miria', title: '📸 Banco de Imagens', description: 'Organizar fotos de produtos, criar novas imagens ou editar existentes.', chance: 0.15 },
  { person: 'Miria', title: '📊 Relatório de Custos', description: 'Atualizar planilha de custos com valores recentes de fornecedores.', chance: 0.12 },
  { person: 'Miria', title: '🎨 Inspiração Visual', description: 'Pesquisar referências de design, tendências de mercado para artes futuras.', chance: 0.08 },
  { person: 'Miria', title: '📦 Inventário Físico', description: 'Conferir estoque físico x sistema, identificar divergências.', chance: 0.1 },
];

// Lembretes por dia da semana
const weekdayReminders: Record<number, { person: string; reminder: string }[]> = {
  1: [ // Segunda
    { person: 'Ryan', reminder: '📅 Início de semana: revisar metas e prioridades.' },
    { person: 'Miria', reminder: '📅 Início de semana: organizar tarefas prioritárias.' },
  ],
  2: [ // Terça
    { person: 'Ryan', reminder: '💡 Terça de otimização: foco em melhorar processos.' },
  ],
  3: [ // Quarta
    { person: 'Miria', reminder: '📊 Meio de semana: verificar progresso das metas.' },
  ],
  4: [ // Quinta
    { person: 'Ryan', reminder: '🔍 Quinta de análise: revisar métricas da semana.' },
  ],
  5: [ // Sexta
    { person: 'Ryan', reminder: '📝 Sexta: preparar resumo da semana.' },
    { person: 'Miria', reminder: '✅ Sexta: finalizar pendências antes do fim de semana.' },
  ],
};

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isBusinessDay(date: Date): boolean {
  return !isWeekend(date);
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getVariation(title: string, personName: string, date: Date): string | null {
  const variations = personName === 'Ryan' ? ryanVariations[title] : miriaVariations[title];
  if (!variations || variations.length === 0) return null;
  
  // Usa o dia do ano para determinar qual variação usar (rotaciona)
  const dayOfYear = getDayOfYear(date);
  const index = dayOfYear % variations.length;
  return variations[index];
}

function shouldCreateBonusTask(chance: number): boolean {
  return Math.random() < chance;
}

function shouldCreateTask(routine: Routine, today: Date): boolean {
  const dayOfWeek = today.getDay();
  const dayOfMonth = today.getDate();

  if (routine.exclude_weekends && isWeekend(today)) {
    return false;
  }

  switch (routine.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return routine.day_of_week !== null && dayOfWeek === routine.day_of_week;
    case 'monthly':
      if (routine.day_of_month_start !== null && routine.day_of_month_end !== null) {
        return dayOfMonth >= routine.day_of_month_start && dayOfMonth <= routine.day_of_month_end;
      }
      return false;
    case 'conditional':
      return false;
    default:
      return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date in Brazil timezone (UTC-3)
    const now = new Date();
    const brazilOffset = -3 * 60;
    const utcOffset = now.getTimezoneOffset();
    const brazilTime = new Date(now.getTime() + (utcOffset + brazilOffset) * 60000);
    
    const today = new Date(brazilTime.getFullYear(), brazilTime.getMonth(), brazilTime.getDate());
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay();

    console.log(`[generate-crm-tasks] Running for date: ${todayStr}`);
    console.log(`[generate-crm-tasks] Day of week: ${dayOfWeek} (0=Sun, 1=Mon, ..., 6=Sat)`);
    console.log(`[generate-crm-tasks] Is weekend: ${isWeekend(today)}`);

    // Skip weekends
    if (isWeekend(today)) {
      console.log('[generate-crm-tasks] Weekend - skipping task generation');
      return new Response(JSON.stringify({
        date: todayStr,
        message: 'Fim de semana - nenhuma tarefa gerada',
        tasksCreated: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch all active routines
    const { data: routines, error: routinesError } = await supabase
      .from('crm_routines')
      .select('*')
      .eq('is_active', true);

    if (routinesError) {
      console.error('[generate-crm-tasks] Error fetching routines:', routinesError);
      throw routinesError;
    }

    console.log(`[generate-crm-tasks] Found ${routines?.length || 0} active routines`);

    const tasksCreated: string[] = [];
    const tasksSkipped: string[] = [];

    // Process regular routines
    for (const routine of routines || []) {
      if (!shouldCreateTask(routine, today)) {
        tasksSkipped.push(`${routine.person_name}: ${routine.title} (not scheduled for today)`);
        continue;
      }

      // Check if task already exists for today
      const { data: existingTask, error: checkError } = await supabase
        .from('crm_tasks')
        .select('id')
        .eq('routine_id', routine.id)
        .eq('scheduled_date', todayStr)
        .maybeSingle();

      if (checkError) {
        console.error(`[generate-crm-tasks] Error checking existing task for ${routine.title}:`, checkError);
        continue;
      }

      if (existingTask) {
        tasksSkipped.push(`${routine.person_name}: ${routine.title} (already exists)`);
        continue;
      }

      // Get variation for daily tasks
      let description = routine.description || '';
      if (routine.frequency === 'daily') {
        const variation = getVariation(routine.title, routine.person_name, today);
        if (variation) {
          description = variation + (description ? `\n\n${description}` : '');
        }
      }

      // Create the task
      const { error: insertError } = await supabase
        .from('crm_tasks')
        .insert({
          person_name: routine.person_name,
          title: routine.title,
          description,
          status: 'pending',
          routine_id: routine.id,
          frequency: routine.frequency,
          is_auto_generated: true,
          scheduled_date: todayStr,
        });

      if (insertError) {
        console.error(`[generate-crm-tasks] Error creating task ${routine.title}:`, insertError);
        continue;
      }

      tasksCreated.push(`${routine.person_name}: ${routine.title}`);
      console.log(`[generate-crm-tasks] Created task: ${routine.person_name} - ${routine.title}`);
    }

    // Add bonus tasks (occasional)
    for (const bonus of bonusTasks) {
      if (!shouldCreateBonusTask(bonus.chance)) continue;

      // Check if already created today
      const { data: existingBonus } = await supabase
        .from('crm_tasks')
        .select('id')
        .eq('person_name', bonus.person)
        .eq('title', bonus.title)
        .eq('scheduled_date', todayStr)
        .maybeSingle();

      if (existingBonus) continue;

      const { error: bonusError } = await supabase
        .from('crm_tasks')
        .insert({
          person_name: bonus.person,
          title: bonus.title,
          description: bonus.description,
          status: 'pending',
          frequency: 'occasional',
          is_auto_generated: true,
          scheduled_date: todayStr,
        });

      if (!bonusError) {
        tasksCreated.push(`${bonus.person}: ${bonus.title} (bônus)`);
        console.log(`[generate-crm-tasks] Created bonus task: ${bonus.person} - ${bonus.title}`);
      }
    }

    // Add weekday reminders
    const reminders = weekdayReminders[dayOfWeek] || [];
    for (const reminder of reminders) {
      const reminderTitle = `📌 Lembrete do Dia`;
      
      const { data: existingReminder } = await supabase
        .from('crm_tasks')
        .select('id')
        .eq('person_name', reminder.person)
        .eq('title', reminderTitle)
        .eq('scheduled_date', todayStr)
        .maybeSingle();

      if (existingReminder) continue;

      const { error: reminderError } = await supabase
        .from('crm_tasks')
        .insert({
          person_name: reminder.person,
          title: reminderTitle,
          description: reminder.reminder,
          status: 'pending',
          frequency: 'weekly',
          is_auto_generated: true,
          scheduled_date: todayStr,
        });

      if (!reminderError) {
        tasksCreated.push(`${reminder.person}: ${reminderTitle}`);
        console.log(`[generate-crm-tasks] Created reminder: ${reminder.person} - ${reminderTitle}`);
      }
    }

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const summary = {
      date: todayStr,
      dayOfWeek: dayNames[dayOfWeek],
      isBusinessDay: isBusinessDay(today),
      tasksCreated: tasksCreated.length,
      tasksSkipped: tasksSkipped.length,
      created: tasksCreated,
      skipped: tasksSkipped,
    };

    console.log('[generate-crm-tasks] Summary:', JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[generate-crm-tasks] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
