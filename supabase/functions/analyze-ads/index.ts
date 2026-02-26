import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdsMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  avgCPA: number;
  avgROAS: number;
  reportPeriod?: string;
  platform?: string;
  campaigns?: Array<{
    name: string;
    spend: number;
    revenue: number;
    roas: number;
    conversions: number;
    clicks: number;
    impressions: number;
  }>;
}

interface ComparisonMetrics {
  file1: AdsMetrics;
  file2: AdsMetrics;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, metrics, comparisonMetrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "single") {
      // Single file analysis
      const m = metrics as AdsMetrics;
      
      systemPrompt = `Você é um especialista em marketing digital e análise de campanhas de anúncios. 
Analise os dados de performance de ads fornecidos e gere insights acionáveis em português brasileiro.

IMPORTANTE:
- Seja específico e prático nas recomendações
- Use linguagem profissional mas acessível
- Foque em ações que podem melhorar os resultados
- Considere benchmarks do mercado para cada plataforma
- Identifique problemas e oportunidades

Formato da resposta (JSON):
{
  "resumoExecutivo": "Resumo de 2-3 frases sobre a performance geral",
  "destaques": [
    {"tipo": "positivo|negativo|neutro", "texto": "destaque importante"}
  ],
  "recomendacoes": [
    {
      "tipo": "urgente|importante|otimizacao",
      "titulo": "Título curto",
      "descricao": "Descrição detalhada da ação recomendada",
      "impactoEsperado": "O que esperar se implementar"
    }
  ],
  "diagnostico": {
    "roas": {"status": "excelente|bom|alerta|critico", "analise": "análise do ROAS"},
    "ctr": {"status": "excelente|bom|alerta|critico", "analise": "análise do CTR"},
    "cpc": {"status": "excelente|bom|alerta|critico", "analise": "análise do CPC"},
    "conversoes": {"status": "excelente|bom|alerta|critico", "analise": "análise das conversões"}
  },
  "proximosPassos": ["Passo 1", "Passo 2", "Passo 3"]
}`;

      const campaignsSummary = m.campaigns 
        ? m.campaigns.map(c => `- ${c.name}: Gasto R$${c.spend.toFixed(2)}, Receita R$${c.revenue.toFixed(2)}, ROAS ${c.roas.toFixed(2)}x`).join('\n')
        : 'Dados por campanha não disponíveis';

      userPrompt = `Analise estes dados de performance de ADS:

Plataforma: ${m.platform || 'Não especificada'}
Período: ${m.reportPeriod || 'Não especificado'}

MÉTRICAS GERAIS:
- Investimento Total: R$ ${m.totalSpend.toFixed(2)}
- Receita Total: R$ ${m.totalRevenue.toFixed(2)}
- ROAS Médio: ${m.avgROAS.toFixed(2)}x
- Total de Impressões: ${m.totalImpressions.toLocaleString('pt-BR')}
- Total de Cliques: ${m.totalClicks.toLocaleString('pt-BR')}
- Total de Conversões: ${m.totalConversions.toLocaleString('pt-BR')}
- CTR Médio: ${m.avgCTR.toFixed(2)}%
- CPC Médio: R$ ${m.avgCPC.toFixed(2)}
- CPM Médio: R$ ${m.avgCPM.toFixed(2)}
- CPA Médio: R$ ${m.avgCPA.toFixed(2)}

CAMPANHAS:
${campaignsSummary}

Gere uma análise detalhada com recomendações práticas.`;

    } else if (type === "comparison") {
      // Comparison analysis
      const cm = comparisonMetrics as ComparisonMetrics;
      
      systemPrompt = `Você é um especialista em marketing digital e análise comparativa de campanhas.
Compare dois períodos/relatórios de ADS e identifique:
- Qual período teve melhor performance e por quê
- Mudanças significativas entre os períodos
- Possíveis causas para as diferenças
- Lições aprendidas e recomendações

Formato da resposta (JSON):
{
  "vencedor": "periodo1|periodo2|empate",
  "resumoComparativo": "Resumo de 2-3 frases comparando os períodos",
  "diferencasChave": [
    {"metrica": "nome", "periodo1": "valor", "periodo2": "valor", "analise": "explicação da diferença"}
  ],
  "possivelCausaVitoria": "Explicação detalhada do que provavelmente causou a diferença de performance",
  "licoes": [
    "Lição aprendida 1",
    "Lição aprendida 2"
  ],
  "recomendacoes": [
    {
      "titulo": "Título",
      "descricao": "O que fazer baseado nessa comparação"
    }
  ],
  "alertas": ["Alerta se houver algo preocupante em ambos os períodos"]
}`;

      userPrompt = `Compare estes dois períodos de campanhas de ADS:

=== PERÍODO 1 (${cm.file1.reportPeriod || 'Arquivo 1'}) ===
- Investimento: R$ ${cm.file1.totalSpend.toFixed(2)}
- Receita: R$ ${cm.file1.totalRevenue.toFixed(2)}
- ROAS: ${cm.file1.avgROAS.toFixed(2)}x
- Impressões: ${cm.file1.totalImpressions.toLocaleString('pt-BR')}
- Cliques: ${cm.file1.totalClicks.toLocaleString('pt-BR')}
- Conversões: ${cm.file1.totalConversions.toLocaleString('pt-BR')}
- CTR: ${cm.file1.avgCTR.toFixed(2)}%
- CPC: R$ ${cm.file1.avgCPC.toFixed(2)}
- CPA: R$ ${cm.file1.avgCPA.toFixed(2)}

=== PERÍODO 2 (${cm.file2.reportPeriod || 'Arquivo 2'}) ===
- Investimento: R$ ${cm.file2.totalSpend.toFixed(2)}
- Receita: R$ ${cm.file2.totalRevenue.toFixed(2)}
- ROAS: ${cm.file2.avgROAS.toFixed(2)}x
- Impressões: ${cm.file2.totalImpressions.toLocaleString('pt-BR')}
- Cliques: ${cm.file2.totalClicks.toLocaleString('pt-BR')}
- Conversões: ${cm.file2.totalConversions.toLocaleString('pt-BR')}
- CTR: ${cm.file2.avgCTR.toFixed(2)}%
- CPC: R$ ${cm.file2.avgCPC.toFixed(2)}
- CPA: R$ ${cm.file2.avgCPA.toFixed(2)}

Faça uma análise comparativa detalhada identificando o vencedor e as possíveis causas.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Tipo de análise inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com o serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response
    let analysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = { rawAnalysis: content };
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      analysisResult = { rawAnalysis: content };
    }

    return new Response(
      JSON.stringify({ success: true, analysis: analysisResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-ads:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
