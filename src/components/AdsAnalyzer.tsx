import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, TrendingUp, TrendingDown, Target, DollarSign, MousePointerClick, Eye, AlertTriangle, CheckCircle, Lightbulb, Sparkles, Brain, FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface AIAnalysis {
  resumoExecutivo?: string;
  destaques?: Array<{ tipo: string; texto: string }>;
  recomendacoes?: Array<{
    tipo: string;
    titulo: string;
    descricao: string;
    impactoEsperado?: string;
  }>;
  diagnostico?: {
    roas?: { status: string; analise: string };
    ctr?: { status: string; analise: string };
    cpc?: { status: string; analise: string };
    conversoes?: { status: string; analise: string };
  };
  proximosPassos?: string[];
  rawAnalysis?: string;
}

type AdPlatform = "mercado_livre_bms" | "mercado_livre_ms" | "shopee_bms" | "shopee_ms" | "magalu_bms" | "amazon_bms" | "tiktok_bms" | "site_bms";

interface AdsData {
  campaign?: string;
  adset?: string;
  ad?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpa?: number;
  roas?: number;
  date?: string;
  [key: string]: string | number | undefined;
}

interface AnalysisResult {
  summary: {
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
  };
  reportPeriod?: string;
  campaigns: AdsData[];
  recommendations: Recommendation[];
  chartData: {
    campaignPerformance: any[];
    roasByCampaign: any[];
    spendBySource: any[];
    conversionFunnel: any[];
  };
}

interface Recommendation {
  type: "warning" | "success" | "tip";
  title: string;
  description: string;
  metric?: string;
  value?: string;
}

const PLATFORM_COLUMNS: Record<AdPlatform, { display: string; mappings: Record<string, string[]> }> = {
  mercado_livre_bms: {
    display: "Mercado Livre BMS",
    mappings: {
      campaign: ["campanha", "campaign", "nome da campanha", "nome"],
      adset: ["status"],
      ad: ["título do anúncio patrocinado", "titulo do anuncio patrocinado", "ad name", "anúncio", "anuncio"],
      impressions: ["impressões", "impressoes", "impressions"],
      clicks: ["cliques", "clicks"],
      spend: ["investimento (moeda local)", "investimento\n(moeda local)", "investimento", "spend", "custo"],
      conversions: ["vendas por publicidade (diretas + indiretas)", "vendas por publicidade\n(diretas + indiretas)", "vendas por publicidade", "conversions", "vendas"],
      revenue: ["receita (moeda local)", "receita\n(moeda local)", "receita", "revenue"],
      date: ["desde", "date", "data"],
      // Additional ML-specific columns - these come directly from the report
      ctr: ["ctr (click through rate)", "ctr\n(click through rate)", "ctr"],
      cpc: ["cpc (custo por clique)", "cpc\n(custo por clique)", "cpc"],
      cvr: ["cvr (conversion rate)", "cvr\n(conversion rate)", "cvr"],
      acos: ["acos (investimento / receitas)", "acos\n(investimento / receitas)", "acos"],
      roas: ["roas (receitas / investimento)", "roas\n(receitas / investimento)", "roas"],
    }
  },
  mercado_livre_ms: {
    display: "Mercado Livre MS",
    mappings: {
      campaign: ["campanha", "campaign", "nome da campanha", "nome"],
      adset: ["status"],
      ad: ["título do anúncio patrocinado", "titulo do anuncio patrocinado", "ad name", "anúncio", "anuncio"],
      impressions: ["impressões", "impressoes", "impressions"],
      clicks: ["cliques", "clicks"],
      spend: ["investimento (moeda local)", "investimento\n(moeda local)", "investimento", "spend", "custo"],
      conversions: ["vendas por publicidade (diretas + indiretas)", "vendas por publicidade\n(diretas + indiretas)", "vendas por publicidade", "conversions", "vendas"],
      revenue: ["receita (moeda local)", "receita\n(moeda local)", "receita", "revenue"],
      date: ["desde", "date", "data"],
      ctr: ["ctr (click through rate)", "ctr\n(click through rate)", "ctr"],
      cpc: ["cpc (custo por clique)", "cpc\n(custo por clique)", "cpc"],
      cvr: ["cvr (conversion rate)", "cvr\n(conversion rate)", "cvr"],
      acos: ["acos (investimento / receitas)", "acos\n(investimento / receitas)", "acos"],
      roas: ["roas (receitas / investimento)", "roas\n(receitas / investimento)", "roas"],
    }
  },
  shopee_bms: {
    display: "Shopee BMS",
    mappings: {
      campaign: ["nome do anúncio", "nome do anuncio", "ad name", "campaign name", "campanha"],
      adset: ["tipos de anúncios", "tipos de anuncios", "ad set name", "conjunto"],
      ad: ["id do produto", "nome do anúncio", "produto"],
      impressions: ["impressões", "impressions", "impr."],
      clicks: ["cliques", "clicks"],
      spend: ["despesas", "cost", "custo", "spend", "gasto"],
      conversions: ["conversões", "conversoes", "conversions", "itens vendidos"],
      revenue: ["gmv", "receita", "revenue", "receita direta"],
      date: ["data de início", "data de inicio", "date", "data"],
    }
  },
  shopee_ms: {
    display: "Shopee MS",
    mappings: {
      campaign: ["nome do anúncio", "nome do anuncio", "ad name", "campaign name", "campanha"],
      adset: ["tipos de anúncios", "tipos de anuncios", "ad set name", "conjunto"],
      ad: ["id do produto", "nome do anúncio", "produto"],
      impressions: ["impressões", "impressions", "impr."],
      clicks: ["cliques", "clicks"],
      spend: ["despesas", "cost", "custo", "spend", "gasto"],
      conversions: ["conversões", "conversoes", "conversions", "itens vendidos"],
      revenue: ["gmv", "receita", "revenue", "receita direta"],
      date: ["data de início", "data de inicio", "date", "data"],
    }
  },
  magalu_bms: {
    display: "Magalu BMS",
    mappings: {
      campaign: ["campaign name", "campaign", "campanha", "nome da campanha"],
      adset: ["ad group", "grupo de anúncios", "conjunto"],
      ad: ["ad", "anúncio", "produto", "sku"],
      impressions: ["impressions", "impr.", "impressões", "visualizações"],
      clicks: ["clicks", "cliques", "visitas"],
      spend: ["cost", "custo", "spend", "gasto", "investimento"],
      conversions: ["conversions", "conv.", "conversões", "vendas", "pedidos"],
      revenue: ["revenue", "receita", "faturamento", "valor de vendas"],
      date: ["day", "date", "data"],
    }
  },
  amazon_bms: {
    display: "Amazon BMS",
    mappings: {
      campaign: ["campaign name", "campaign", "campanha"],
      adset: ["ad group name", "ad group", "grupo de anúncios"],
      ad: ["ad name", "ad", "anúncio", "asin", "produto"],
      impressions: ["impressions", "impressões"],
      clicks: ["clicks", "cliques"],
      spend: ["spend", "cost", "custo", "gasto"],
      conversions: ["orders", "14 day total orders", "conversions", "pedidos", "vendas"],
      revenue: ["sales", "14 day total sales", "revenue", "receita", "vendas"],
      date: ["date", "data"],
    }
  },
  tiktok_bms: {
    display: "TikTok BMS",
    mappings: {
      campaign: ["campaign name", "campaign", "campanha"],
      adset: ["ad group name", "ad group", "grupo de anúncios"],
      ad: ["ad name", "ad", "anúncio"],
      impressions: ["impressions", "impression", "impressões"],
      clicks: ["clicks", "click", "cliques"],
      spend: ["cost", "total cost", "spend", "custo", "gasto"],
      conversions: ["conversions", "complete payment", "conversões", "pagamentos", "vendas"],
      revenue: ["total complete payment value", "revenue", "receita", "valor de vendas"],
      date: ["date", "data"],
    }
  },
  site_bms: {
    display: "Site BMS",
    mappings: {
      campaign: ["campaign name", "campaign", "campanha", "fonte", "source"],
      adset: ["ad set name", "adset", "conjunto", "medium", "mídia"],
      ad: ["ad name", "ad", "anúncio", "content", "conteúdo"],
      impressions: ["impressions", "impressões", "sessions", "sessões", "pageviews"],
      clicks: ["clicks", "cliques", "sessions", "sessões"],
      spend: ["cost", "custo", "spend", "gasto", "investimento"],
      conversions: ["transactions", "conversions", "conversões", "pedidos", "vendas"],
      revenue: ["revenue", "receita", "transaction revenue", "faturamento"],
      date: ["date", "data", "dia"],
    }
  },
};

const COLORS = ["#8b5cf6", "#06b6d4", "#22c55e", "#f97316", "#ef4444", "#ec4899", "#6366f1"];

export function AdsAnalyzer() {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<AdPlatform | "">("");
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchAIAnalysis = async (result: AnalysisResult, platformKey: string) => {
    setIsAnalyzingAI(true);
    try {
      const campaigns = result.campaigns.slice(0, 10).map(c => ({
        name: c.campaign || "Sem nome",
        spend: c.spend,
        revenue: c.revenue,
        roas: c.roas || 0,
        conversions: c.conversions,
        clicks: c.clicks,
        impressions: c.impressions,
      }));

      const { data, error } = await supabase.functions.invoke("analyze-ads", {
        body: {
          type: "single",
          metrics: {
            ...result.summary,
            reportPeriod: result.reportPeriod,
            platform: PLATFORM_COLUMNS[platformKey as AdPlatform]?.display || platformKey,
            campaigns,
          },
        },
      });

      if (error) {
        console.error("AI analysis error:", error);
        toast.error("Erro ao obter análise da IA");
        return;
      }

      if (data?.analysis) {
        setAiAnalysis(data.analysis);
        toast.success("Análise da IA concluída!");
      }
    } catch (err) {
      console.error("Error fetching AI analysis:", err);
      toast.error("Erro ao conectar com a IA");
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const findColumnIndex = (headers: string[], mappings: string[]): number => {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    for (const mapping of mappings) {
      const index = normalizedHeaders.findIndex(h => h.includes(mapping.toLowerCase()));
      if (index !== -1) return index;
    }
    return -1;
  };

  const parseNumber = (value: string, useBrazilianFormat: boolean = false): number => {
    if (!value || value === "-") return 0;
    
    // Remove currency symbols, spaces, and percentage signs
    let cleaned = value.replace(/[R$€£¥\s%]/g, "").trim();
    
    // Check if it's already a valid number (Shopee format uses dot as decimal)
    // If the string has only one dot and no commas, treat it as international format
    const hasDot = cleaned.includes(".");
    const hasComma = cleaned.includes(",");
    
    if (useBrazilianFormat || (hasComma && hasDot)) {
      // Brazilian format: 1.234,56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (hasComma && !hasDot) {
      // Could be Brazilian short format: 1234,56
      cleaned = cleaned.replace(",", ".");
    }
    // If only dot, assume international format (e.g., 667.58)
    
    return parseFloat(cleaned) || 0;
  };

  const analyzeData = (data: AdsData[], reportPeriod?: string): AnalysisResult => {
    // Calculate totals
    const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
    const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
    const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
    const totalConversions = data.reduce((sum, d) => sum + d.conversions, 0);
    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    // Add calculated metrics to each row
    // If ROAS was provided directly from the platform (e.g., ML), use it; otherwise calculate
    const enrichedData = data.map(d => ({
      ...d,
      ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
      cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
      cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
      cpa: d.conversions > 0 ? d.spend / d.conversions : 0,
      // Use provided ROAS if available, otherwise calculate from revenue/spend
      roas: d.roas !== undefined && d.roas > 0 ? d.roas : (d.spend > 0 ? d.revenue / d.spend : 0),
    }));

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    // CTR Analysis
    if (avgCTR < 1) {
      recommendations.push({
        type: "warning",
        title: "CTR Baixo",
        description: "Seu CTR está abaixo de 1%. Considere melhorar os criativos, headlines e segmentação do público.",
        metric: "CTR",
        value: `${avgCTR.toFixed(2)}%`,
      });
    } else if (avgCTR >= 2) {
      recommendations.push({
        type: "success",
        title: "CTR Excelente",
        description: "Seu CTR está acima de 2%, indicando que seus anúncios estão atraindo interesse.",
        metric: "CTR",
        value: `${avgCTR.toFixed(2)}%`,
      });
    }

    // ROAS Analysis
    if (avgROAS < 1) {
      recommendations.push({
        type: "warning",
        title: "ROAS Negativo",
        description: "Você está gastando mais do que está faturando. Revise urgentemente suas campanhas, públicos e ofertas.",
        metric: "ROAS",
        value: `${avgROAS.toFixed(2)}x`,
      });
    } else if (avgROAS >= 3) {
      recommendations.push({
        type: "success",
        title: "ROAS Excelente",
        description: "Seu retorno sobre investimento está ótimo! Considere aumentar o orçamento das campanhas mais rentáveis.",
        metric: "ROAS",
        value: `${avgROAS.toFixed(2)}x`,
      });
    } else if (avgROAS >= 1 && avgROAS < 2) {
      recommendations.push({
        type: "tip",
        title: "ROAS Pode Melhorar",
        description: "Seu ROAS está positivo, mas há espaço para otimização. Teste novos públicos e criativos.",
        metric: "ROAS",
        value: `${avgROAS.toFixed(2)}x`,
      });
    }

    // CPA Analysis
    if (totalConversions > 0) {
      if (avgCPA > avgROAS * 100) {
        recommendations.push({
          type: "warning",
          title: "CPA Alto",
          description: "O custo por aquisição está elevado. Otimize seu funil de conversão e teste diferentes públicos.",
          metric: "CPA",
          value: `R$ ${avgCPA.toFixed(2)}`,
        });
      }
    } else {
      recommendations.push({
        type: "warning",
        title: "Sem Conversões Registradas",
        description: "Nenhuma conversão foi detectada. Verifique se o pixel/tag está configurado corretamente.",
      });
    }

    // Find worst performing campaigns
    const campaignsByROAS = [...new Map(enrichedData.map(d => [d.campaign, d])).values()]
      .sort((a, b) => (a.roas || 0) - (b.roas || 0));

    if (campaignsByROAS.length > 0 && campaignsByROAS[0].roas !== undefined && campaignsByROAS[0].roas < 1) {
      recommendations.push({
        type: "tip",
        title: "Pausar Campanhas Ruins",
        description: `A campanha "${campaignsByROAS[0].campaign}" tem ROAS de ${campaignsByROAS[0].roas.toFixed(2)}x. Considere pausá-la ou otimizá-la.`,
      });
    }

    // Find best performing campaigns
    const bestCampaign = campaignsByROAS[campaignsByROAS.length - 1];
    if (bestCampaign && bestCampaign.roas !== undefined && bestCampaign.roas > 2) {
      recommendations.push({
        type: "success",
        title: "Escalar Campanha Top",
        description: `A campanha "${bestCampaign.campaign}" tem ROAS de ${bestCampaign.roas.toFixed(2)}x. Considere aumentar seu orçamento.`,
      });
    }

    // CPM Analysis
    if (avgCPM > 50) {
      recommendations.push({
        type: "tip",
        title: "CPM Alto",
        description: "O custo por mil impressões está elevado. Teste públicos mais amplos ou diferentes posicionamentos.",
        metric: "CPM",
        value: `R$ ${avgCPM.toFixed(2)}`,
      });
    }

    // Generate chart data
    // Check if we have meaningful date data (not just campaign start dates)
    // Shopee reports are aggregate, so we use campaign-based charts instead
    const uniqueDates = new Set(enrichedData.map(d => d.date).filter(Boolean));
    const hasMultipleDates = uniqueDates.size > 1;
    
    // For aggregate reports, create campaign comparison instead of time series
    const campaignPerformance = enrichedData
      .filter(d => d.campaign)
      .map(d => ({
        name: d.campaign && d.campaign.length > 25 ? d.campaign.substring(0, 25) + "..." : d.campaign,
        fullName: d.campaign,
        cliques: d.clicks,
        conversoes: d.conversions,
        gasto: d.spend,
        receita: d.revenue,
        roas: d.roas || 0,
      }))
      .sort((a, b) => b.gasto - a.gasto)
      .slice(0, 8);

    const spendBySource = Object.entries(
      enrichedData.reduce((acc: Record<string, number>, d) => {
        const source = d.campaign || "Outros";
        acc[source] = (acc[source] || 0) + d.spend;
        return acc;
      }, {})
    )
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 20) + "..." : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const conversionFunnel = [
      { name: "Impressões", value: totalImpressions },
      { name: "Cliques", value: totalClicks },
      { name: "Conversões", value: totalConversions },
    ];
    
    // ROAS by campaign for bar chart
    const roasByCampaign = enrichedData
      .filter(d => d.campaign && d.spend > 0)
      .map(d => ({
        name: d.campaign && d.campaign.length > 20 ? d.campaign.substring(0, 20) + "..." : d.campaign,
        fullName: d.campaign,
        roas: d.roas || 0,
        gasto: d.spend,
      }))
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 8);

    return {
      summary: {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        totalRevenue,
        avgCTR,
        avgCPC,
        avgCPM,
        avgCPA,
        avgROAS,
      },
      reportPeriod,
      campaigns: enrichedData,
      recommendations,
      chartData: {
        campaignPerformance,
        roasByCampaign,
        spendBySource,
        conversionFunnel,
      },
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = [".csv", ".xlsx", ".xls"];
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!hasValidExtension) {
        toast.error("Por favor, envie um arquivo CSV ou Excel (.xlsx, .xls)");
        return;
      }
      setDataFile(file);
    }
  };

  const parseExcelFile = async (file: File): Promise<string[][]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    
    // Get all sheets and find the one with data
    const allData: string[][] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
      
      // Add data from this sheet
      for (const row of data) {
        if (Array.isArray(row) && row.some(cell => cell !== "")) {
          allData.push(row.map(cell => String(cell ?? "")));
        }
      }
    }
    
    return allData;
  };

  const handleAnalyze = async () => {
    if (!platform || !dataFile) {
      toast.error("Selecione a plataforma e o arquivo");
      return;
    }

    setIsAnalyzing(true);

    try {
      let rows: string[][];
      const isExcel = dataFile.name.toLowerCase().endsWith(".xlsx") || dataFile.name.toLowerCase().endsWith(".xls");
      
      if (isExcel) {
        rows = await parseExcelFile(dataFile);
      } else {
        const text = await dataFile.text();
        rows = parseCSV(text);
      }
      
      if (rows.length < 2) {
        toast.error("O arquivo está vazio ou mal formatado");
        setIsAnalyzing(false);
        return;
      }

      // Detect platform type and find header row
      let headerRowIndex = 0;
      let reportPeriod: string | undefined;
      const isShopee = platform.includes("shopee");
      const isMercadoLivre = platform.includes("mercado_livre");
      
      if (isMercadoLivre && isExcel) {
        // Mercado Livre Excel format has:
        // Row 0: "Relatório de publicidade..." with date range
        // Row 1: Headers: "Desde", "Até", "Campanha", etc.
        // Row 2+: Data
        
        // Extract period from first row (title contains date range)
        if (rows.length > 0) {
          const titleRow = rows[0];
          const titleText = titleRow.join(" ");
          // Look for pattern like "12 janeiro 2026 - 19 janeiro 2026"
          const periodMatch = titleText.match(/(\d+\s+\w+\s+\d{4})\s*-\s*(\d+\s+\w+\s+\d{4})/);
          if (periodMatch) {
            reportPeriod = `${periodMatch[1]} - ${periodMatch[2]}`;
          }
        }
        
        // Find header row - look for row containing "Desde" or "Campanha" or "Impressões"
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          const rowLower = row.map(c => String(c).toLowerCase().trim());
          
          // Check for ML header pattern
          const hasDesde = rowLower.some(c => c.includes("desde"));
          const hasCampanha = rowLower.some(c => c.includes("campanha"));
          const hasImpressoes = rowLower.some(c => c.includes("impressões") || c.includes("impressoes"));
          
          if ((hasDesde && hasCampanha) || (hasCampanha && hasImpressoes)) {
            headerRowIndex = i;
            break;
          }
        }
        
        console.log("ML Excel - Found header at row:", headerRowIndex);
        console.log("ML Excel - Headers:", rows[headerRowIndex]);
        console.log("ML Excel - Period:", reportPeriod);
      } else if (isShopee) {
        // Extract report period from metadata (usually line 6: "Período,05/01/2026 - 12/01/2026")
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row[0]?.toLowerCase().includes("período") || row[0]?.toLowerCase().includes("periodo")) {
            reportPeriod = row[1]?.trim();
            break;
          }
        }
        
        // Find the row that contains the actual column headers
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (row.length > 5) {
            const firstCell = row[0]?.toLowerCase().trim();
            const hasNameColumn = row.some(cell => 
              cell.toLowerCase().includes("nome do anúncio") || 
              cell.toLowerCase().includes("nome do anuncio") ||
              cell.toLowerCase().includes("impressões") ||
              cell.toLowerCase().includes("impressoes")
            );
            if (firstCell === "#" || hasNameColumn) {
              headerRowIndex = i;
              break;
            }
          }
        }
      }

      const headers = rows[headerRowIndex];
      const platformConfig = PLATFORM_COLUMNS[platform];

      console.log("All rows preview:", rows.slice(0, 10));
      console.log("Header row index:", headerRowIndex);
      console.log("Detected headers:", headers);
      console.log("Report period:", reportPeriod);

      // Find column indices - normalize headers for better matching
      // Remove accents and normalize for comparison
      const normalizeString = (s: string): string => {
        return s.toLowerCase()
          .replace(/\n/g, " ")
          .replace(/[áàãâä]/g, "a")
          .replace(/[éèêë]/g, "e")
          .replace(/[íìîï]/g, "i")
          .replace(/[óòõôö]/g, "o")
          .replace(/[úùûü]/g, "u")
          .replace(/[ç]/g, "c")
          .trim();
      };
      
      const normalizedHeaders = headers.map(h => normalizeString(String(h)));
      console.log("Normalized headers:", normalizedHeaders);
      
      const findIndex = (mappings: string[]): number => {
        for (const mapping of mappings) {
          const normalizedMapping = normalizeString(mapping);
          const index = normalizedHeaders.findIndex(h => 
            h.includes(normalizedMapping) || normalizedMapping.includes(h)
          );
          if (index !== -1) {
            console.log(`  Found mapping "${mapping}" at index ${index}`);
            return index;
          }
        }
        return -1;
      };

      const indices = {
        campaign: findIndex(platformConfig.mappings.campaign),
        adset: findIndex(platformConfig.mappings.adset),
        ad: platformConfig.mappings.ad ? findIndex(platformConfig.mappings.ad) : -1,
        impressions: findIndex(platformConfig.mappings.impressions),
        clicks: findIndex(platformConfig.mappings.clicks),
        spend: findIndex(platformConfig.mappings.spend),
        conversions: findIndex(platformConfig.mappings.conversions),
        revenue: findIndex(platformConfig.mappings.revenue),
        date: findIndex(platformConfig.mappings.date),
        // ML-specific indices
        ctr: platformConfig.mappings.ctr ? findIndex(platformConfig.mappings.ctr) : -1,
        cpc: platformConfig.mappings.cpc ? findIndex(platformConfig.mappings.cpc) : -1,
        roas: platformConfig.mappings.roas ? findIndex(platformConfig.mappings.roas) : -1,
        acos: platformConfig.mappings.acos ? findIndex(platformConfig.mappings.acos) : -1,
      };

      console.log("Column indices:", indices);

      // For ML Excel files, numbers are already parsed correctly
      const usesBrazilianFormat = !isExcel && !platform.includes("shopee");

      // Parse data rows (skip header row)
      const data: AdsData[] = rows.slice(headerRowIndex + 1)
        .filter(row => row.some(cell => cell !== "")) // Skip empty rows
        .map(row => {
          // Get raw values
          const rawSpend = indices.spend >= 0 ? row[indices.spend] : "0";
          const rawRevenue = indices.revenue >= 0 ? row[indices.revenue] : "0";
          const rawConversions = indices.conversions >= 0 ? row[indices.conversions] : "0";
          const rawClicks = indices.clicks >= 0 ? row[indices.clicks] : "0";
          const rawImpressions = indices.impressions >= 0 ? row[indices.impressions] : "0";
          const rawRoas = indices.roas >= 0 ? row[indices.roas] : undefined;
          
          return {
            campaign: indices.campaign >= 0 ? row[indices.campaign] : undefined,
            adset: indices.adset >= 0 ? row[indices.adset] : undefined,
            ad: indices.ad >= 0 ? row[indices.ad] : undefined,
            impressions: parseNumber(String(rawImpressions), usesBrazilianFormat),
            clicks: parseNumber(String(rawClicks), usesBrazilianFormat),
            spend: parseNumber(String(rawSpend), usesBrazilianFormat),
            conversions: parseNumber(String(rawConversions), usesBrazilianFormat),
            revenue: parseNumber(String(rawRevenue), usesBrazilianFormat),
            date: indices.date >= 0 ? row[indices.date] : undefined,
            // Store raw ROAS if available from ML 
            // ML returns ROAS as percentage (e.g., 285.4 means 285.4% return = 2.854x)
            // So we divide by 100 to get the actual multiplier
            roas: rawRoas && rawRoas !== "-" ? parseNumber(String(rawRoas), usesBrazilianFormat) / 100 : undefined,
          };
        })
        .filter(d => d.impressions > 0 || d.spend > 0 || d.campaign);

      console.log("Parsed data sample:", data.slice(0, 3));

      if (data.length === 0) {
        toast.error("Não foi possível extrair dados do arquivo. Verifique o formato.");
        setIsAnalyzing(false);
        return;
      }

      const result = analyzeData(data, reportPeriod);
      setAnalysisResult(result);
      toast.success(`Análise concluída! ${data.length} registros processados.${reportPeriod ? ` Período: ${reportPeriod}` : ''}`);
      
      // Trigger AI analysis automatically
      fetchAIAnalysis(result, platform);
    } catch (error) {
      console.error("Error analyzing file:", error);
      toast.error("Erro ao analisar o arquivo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setDataFile(null);
    setPlatform("");
    setAnalysisResult(null);
    setAiAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(Math.round(value));
  };

  const handleExportPDF = () => {
    if (!analysisResult) {
      toast.error("Nenhum relatório para exportar");
      return;
    }

    const platformDisplay = platform ? PLATFORM_COLUMNS[platform]?.display || platform : "Desconhecida";
    const currentDate = new Date().toLocaleDateString("pt-BR");

    // Build AI Analysis sections
    let aiSectionsHTML = "";
    
    if (aiAnalysis) {
      // Executive Summary
      if (aiAnalysis.resumoExecutivo) {
        aiSectionsHTML += `
          <div class="ai-section" style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 24px; border-radius: 12px; color: white; margin-bottom: 24px;">
            <h2 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">🤖 Resumo Executivo da IA</h2>
            <p style="margin: 0; line-height: 1.6;">${aiAnalysis.resumoExecutivo}</p>
          </div>
        `;
      }

      // Highlights
      if (aiAnalysis.destaques && aiAnalysis.destaques.length > 0) {
        aiSectionsHTML += `
          <div class="section">
            <h2>✨ Destaques da Análise</h2>
            <div style="display: grid; gap: 12px;">
              ${aiAnalysis.destaques.map(d => `
                <div style="padding: 12px 16px; border-radius: 8px; background: ${d.tipo === 'positivo' ? '#f0fdf4' : d.tipo === 'negativo' ? '#fef2f2' : '#f5f3ff'}; border-left: 4px solid ${d.tipo === 'positivo' ? '#16a34a' : d.tipo === 'negativo' ? '#dc2626' : '#8b5cf6'};">
                  <span style="font-weight: 500;">${d.tipo === 'positivo' ? '✅' : d.tipo === 'negativo' ? '⚠️' : '💡'} ${d.texto}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      // Diagnostics
      if (aiAnalysis.diagnostico) {
        const diagnostics = aiAnalysis.diagnostico;
        aiSectionsHTML += `
          <div class="section">
            <h2>🔬 Diagnóstico Detalhado</h2>
            <div style="display: grid; gap: 16px;">
              ${diagnostics.roas ? `
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${diagnostics.roas.status === 'bom' || diagnostics.roas.status === 'excelente' ? '#16a34a' : diagnostics.roas.status === 'ruim' ? '#dc2626' : '#f59e0b'};">
                  <div style="font-weight: 600; margin-bottom: 8px;">📈 ROAS - ${diagnostics.roas.status?.toUpperCase() || 'N/A'}</div>
                  <p style="margin: 0; color: #64748b;">${diagnostics.roas.analise}</p>
                </div>
              ` : ''}
              ${diagnostics.ctr ? `
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${diagnostics.ctr.status === 'bom' || diagnostics.ctr.status === 'excelente' ? '#16a34a' : diagnostics.ctr.status === 'ruim' ? '#dc2626' : '#f59e0b'};">
                  <div style="font-weight: 600; margin-bottom: 8px;">🖱️ CTR - ${diagnostics.ctr.status?.toUpperCase() || 'N/A'}</div>
                  <p style="margin: 0; color: #64748b;">${diagnostics.ctr.analise}</p>
                </div>
              ` : ''}
              ${diagnostics.cpc ? `
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${diagnostics.cpc.status === 'bom' || diagnostics.cpc.status === 'excelente' ? '#16a34a' : diagnostics.cpc.status === 'ruim' ? '#dc2626' : '#f59e0b'};">
                  <div style="font-weight: 600; margin-bottom: 8px;">💰 CPC - ${diagnostics.cpc.status?.toUpperCase() || 'N/A'}</div>
                  <p style="margin: 0; color: #64748b;">${diagnostics.cpc.analise}</p>
                </div>
              ` : ''}
              ${diagnostics.conversoes ? `
                <div style="padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${diagnostics.conversoes.status === 'bom' || diagnostics.conversoes.status === 'excelente' ? '#16a34a' : diagnostics.conversoes.status === 'ruim' ? '#dc2626' : '#f59e0b'};">
                  <div style="font-weight: 600; margin-bottom: 8px;">🎯 Conversões - ${diagnostics.conversoes.status?.toUpperCase() || 'N/A'}</div>
                  <p style="margin: 0; color: #64748b;">${diagnostics.conversoes.analise}</p>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }

      // AI Recommendations
      if (aiAnalysis.recomendacoes && aiAnalysis.recomendacoes.length > 0) {
        aiSectionsHTML += `
          <div class="section">
            <h2>🎯 Recomendações da IA</h2>
            <div style="display: grid; gap: 16px;">
              ${aiAnalysis.recomendacoes.map(rec => `
                <div style="padding: 16px; background: ${rec.tipo === 'urgente' ? '#fef2f2' : rec.tipo === 'oportunidade' ? '#f0fdf4' : '#f5f3ff'}; border-radius: 8px; border-left: 4px solid ${rec.tipo === 'urgente' ? '#dc2626' : rec.tipo === 'oportunidade' ? '#16a34a' : '#8b5cf6'};">
                  <div style="font-weight: 600; margin-bottom: 8px;">${rec.tipo === 'urgente' ? '🚨' : rec.tipo === 'oportunidade' ? '🚀' : '💡'} ${rec.titulo}</div>
                  <p style="margin: 0 0 8px 0; color: #374151;">${rec.descricao}</p>
                  ${rec.impactoEsperado ? `<p style="margin: 0; font-size: 12px; color: #8b5cf6; font-weight: 500;">📊 Impacto esperado: ${rec.impactoEsperado}</p>` : ''}
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      // Next Steps
      if (aiAnalysis.proximosPassos && aiAnalysis.proximosPassos.length > 0) {
        aiSectionsHTML += `
          <div class="section">
            <h2>📋 Próximos Passos</h2>
            <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
              ${aiAnalysis.proximosPassos.map(step => `<li style="margin-bottom: 8px;">${step}</li>`).join("")}
            </ol>
          </div>
        `;
      }
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de ADS - ${platformDisplay}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
          h1 { text-align: center; margin-bottom: 8px; }
          h2 { font-size: 18px; margin: 0 0 16px 0; color: #1f2937; }
          .header { text-align: center; margin-bottom: 30px; }
          .header p { color: #666; margin: 4px 0; }
          .metrics { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 30px; }
          .metric { flex: 1; min-width: 150px; background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; }
          .metric-label { font-size: 12px; color: #666; margin-bottom: 4px; }
          .metric-value { font-size: 18px; font-weight: bold; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .rec { padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #f59e0b; background: #fefce8; }
          .rec-warning { border-left-color: #dc2626; background: #fef2f2; }
          .rec-success { border-left-color: #16a34a; background: #f0fdf4; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
          th { background: #f3f4f6; }
          .page-break { page-break-before: always; }
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 20px; } 
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Relatório de Performance de ADS</h1>
          <p>Plataforma: ${platformDisplay}</p>
          ${analysisResult.reportPeriod ? `<p>Período: ${analysisResult.reportPeriod}</p>` : ""}
          <p style="font-size: 12px; color: #999;">Gerado em: ${currentDate}</p>
        </div>

        <div class="metrics">
          <div class="metric"><div class="metric-label">💰 Gasto Total</div><div class="metric-value" style="color:#dc2626">${formatCurrency(analysisResult.summary.totalSpend)}</div></div>
          <div class="metric"><div class="metric-label">💵 Receita</div><div class="metric-value" style="color:#16a34a">${formatCurrency(analysisResult.summary.totalRevenue)}</div></div>
          <div class="metric"><div class="metric-label">📈 ROAS</div><div class="metric-value" style="color:${analysisResult.summary.avgROAS >= 1 ? "#16a34a" : "#dc2626"}">${analysisResult.summary.avgROAS.toFixed(2)}x</div></div>
          <div class="metric"><div class="metric-label">🖱️ CTR</div><div class="metric-value">${analysisResult.summary.avgCTR.toFixed(2)}%</div></div>
          <div class="metric"><div class="metric-label">🎯 Conversões</div><div class="metric-value">${formatNumber(analysisResult.summary.totalConversions)}</div></div>
        </div>

        <div class="metrics">
          <div class="metric"><div class="metric-label">👁️ Impressões</div><div class="metric-value">${formatNumber(analysisResult.summary.totalImpressions)}</div></div>
          <div class="metric"><div class="metric-label">🖱️ Cliques</div><div class="metric-value">${formatNumber(analysisResult.summary.totalClicks)}</div></div>
          <div class="metric"><div class="metric-label">💵 CPC Médio</div><div class="metric-value">${formatCurrency(analysisResult.summary.avgCPC)}</div></div>
          <div class="metric"><div class="metric-label">💰 CPM</div><div class="metric-value">${formatCurrency(analysisResult.summary.avgCPM)}</div></div>
          <div class="metric"><div class="metric-label">🎯 CPA</div><div class="metric-value">${formatCurrency(analysisResult.summary.avgCPA)}</div></div>
        </div>

        ${aiSectionsHTML}

        <div class="section">
          <h2>📋 Recomendações do Sistema</h2>
          ${analysisResult.recommendations.map(rec => `
            <div class="rec ${rec.type === "warning" ? "rec-warning" : rec.type === "success" ? "rec-success" : ""}">
              <strong>${rec.type === "warning" ? "⚠️" : rec.type === "success" ? "✅" : "💡"} ${rec.title}</strong>
              ${rec.metric && rec.value ? `<span style="float: right; font-weight: 600;">${rec.metric}: ${rec.value}</span>` : ""}
              <p style="margin: 8px 0 0 0;">${rec.description}</p>
            </div>
          `).join("")}
        </div>

        ${analysisResult.campaigns.length > 0 ? `
        <div class="section">
          <h2>📊 Todas as Campanhas</h2>
          <table>
            <thead>
              <tr>
                <th>Campanha</th>
                <th>Impressões</th>
                <th>Cliques</th>
                <th>Gasto</th>
                <th>Conversões</th>
                <th>Receita</th>
                <th>ROAS</th>
              </tr>
            </thead>
            <tbody>
              ${analysisResult.campaigns
                .filter(c => c.campaign && c.spend > 0)
                .sort((a, b) => (b.roas || 0) - (a.roas || 0))
                .map(c => `
                  <tr>
                    <td>${c.campaign}</td>
                    <td>${formatNumber(c.impressions)}</td>
                    <td>${formatNumber(c.clicks)}</td>
                    <td>${formatCurrency(c.spend)}</td>
                    <td>${formatNumber(c.conversions)}</td>
                    <td>${formatCurrency(c.revenue)}</td>
                    <td style="color:${(c.roas || 0) >= 1 ? "#16a34a" : "#dc2626"}; font-weight: 600;">${(c.roas || 0).toFixed(2)}x</td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>` : ""}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>Relatório gerado automaticamente com análise de IA</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      toast.success("Janela de impressão aberta! Salve como PDF.");
    } else {
      toast.error("Popup bloqueado. Permita popups para exportar.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Analisar ADS (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Análise de Performance de ADS
          </DialogTitle>
          <DialogDescription>
            Faça upload do seu relatório CSV para análise detalhada com recomendações de melhorias.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          {!analysisResult ? (
            <div className="space-y-6 py-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label htmlFor="platform">Qual plataforma de anúncios?</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as AdPlatform)}>
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_COLUMNS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="datafile">Arquivo do relatório (CSV ou Excel)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Input
                    ref={fileInputRef}
                    id="datafile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  {dataFile ? (
                    <p className="text-sm font-medium">{dataFile.name}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar arquivo CSV ou Excel (.xlsx)
                    </p>
                  )}
                </div>
              </div>

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={!platform || !dataFile || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Analisar Dados
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Report Period */}
              {analysisResult.reportPeriod && (
                <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                  <Badge variant="outline" className="text-sm">
                    📅 Período do Relatório: {analysisResult.reportPeriod}
                  </Badge>
                </div>
              )}
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-destructive" />
                    <p className="text-xs text-muted-foreground">Gasto Total</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(analysisResult.summary.totalSpend)}</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-success" />
                    <p className="text-xs text-muted-foreground">Receita</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(analysisResult.summary.totalRevenue)}</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">ROAS</p>
                  </div>
                  <p className={`text-lg font-bold ${analysisResult.summary.avgROAS >= 1 ? "text-success" : "text-destructive"}`}>
                    {analysisResult.summary.avgROAS.toFixed(2)}x
                  </p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MousePointerClick className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                  <p className="text-lg font-bold">{analysisResult.summary.avgCTR.toFixed(2)}%</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-primary" />
                    <p className="text-xs text-muted-foreground">Conversões</p>
                  </div>
                  <p className="text-lg font-bold">{formatNumber(analysisResult.summary.totalConversions)}</p>
                </Card>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                <Card className="p-2 text-center">
                  <p className="text-xs text-muted-foreground">Impressões</p>
                  <p className="text-sm font-semibold">{formatNumber(analysisResult.summary.totalImpressions)}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-xs text-muted-foreground">Cliques</p>
                  <p className="text-sm font-semibold">{formatNumber(analysisResult.summary.totalClicks)}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-xs text-muted-foreground">CPC</p>
                  <p className="text-sm font-semibold">{formatCurrency(analysisResult.summary.avgCPC)}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-xs text-muted-foreground">CPM</p>
                  <p className="text-sm font-semibold">{formatCurrency(analysisResult.summary.avgCPM)}</p>
                </Card>
                <Card className="p-2 text-center">
                  <p className="text-xs text-muted-foreground">CPA</p>
                  <p className="text-sm font-semibold">{formatCurrency(analysisResult.summary.avgCPA)}</p>
                </Card>
              </div>

              {/* AI Analysis Section */}
              <Card className="p-4 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Análise Inteligente (IA)
                </h3>
                
                {isAnalyzingAI ? (
                  <div className="flex items-center justify-center p-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
                    <span className="text-muted-foreground">Gerando análise com IA...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-4">
                    {/* Executive Summary */}
                    {aiAnalysis.resumoExecutivo && (
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-sm font-medium text-primary mb-1">📊 Resumo Executivo</p>
                        <p className="text-sm">{aiAnalysis.resumoExecutivo}</p>
                      </div>
                    )}

                    {/* Highlights */}
                    {aiAnalysis.destaques && aiAnalysis.destaques.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">🎯 Destaques</p>
                        {aiAnalysis.destaques.map((d, i) => (
                          <div key={i} className={`p-2 rounded-lg text-sm ${
                            d.tipo === "positivo" ? "bg-green-500/10 text-green-700" :
                            d.tipo === "negativo" ? "bg-red-500/10 text-red-700" :
                            "bg-muted"
                          }`}>
                            {d.tipo === "positivo" ? "✅" : d.tipo === "negativo" ? "⚠️" : "📌"} {d.texto}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Diagnostic */}
                    {aiAnalysis.diagnostico && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(aiAnalysis.diagnostico).map(([key, value]) => (
                          <div key={key} className={`p-2 rounded-lg text-center ${
                            value.status === "excelente" ? "bg-green-500/10" :
                            value.status === "bom" ? "bg-blue-500/10" :
                            value.status === "alerta" ? "bg-yellow-500/10" :
                            "bg-red-500/10"
                          }`}>
                            <p className="text-xs font-medium uppercase">{key}</p>
                            <Badge variant={
                              value.status === "excelente" ? "default" :
                              value.status === "bom" ? "secondary" :
                              value.status === "alerta" ? "outline" :
                              "destructive"
                            } className="mt-1">
                              {value.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {aiAnalysis.recomendacoes && aiAnalysis.recomendacoes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">💡 Recomendações da IA</p>
                        {aiAnalysis.recomendacoes.map((rec, i) => (
                          <div key={i} className={`p-3 rounded-lg ${
                            rec.tipo === "urgente" ? "bg-red-500/10 border-l-4 border-red-500" :
                            rec.tipo === "importante" ? "bg-yellow-500/10 border-l-4 border-yellow-500" :
                            "bg-blue-500/10 border-l-4 border-blue-500"
                          }`}>
                            <p className="font-medium text-sm">{rec.titulo}</p>
                            <p className="text-sm text-muted-foreground mt-1">{rec.descricao}</p>
                            {rec.impactoEsperado && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                ⚡ Impacto esperado: {rec.impactoEsperado}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Next Steps */}
                    {aiAnalysis.proximosPassos && aiAnalysis.proximosPassos.length > 0 && (
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-sm font-medium text-primary mb-2">🚀 Próximos Passos</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {aiAnalysis.proximosPassos.map((step, i) => (
                            <li key={i} className="text-sm">{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Raw analysis fallback */}
                    {aiAnalysis.rawAnalysis && !aiAnalysis.resumoExecutivo && (
                      <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                        {aiAnalysis.rawAnalysis}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <p>Análise da IA não disponível</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => analysisResult && platform && fetchAIAnalysis(analysisResult, platform)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Análise IA
                    </Button>
                  </div>
                )}
              </Card>

              {/* Recommendations */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Recomendações Automáticas
                </h3>
                <div className="space-y-3">
                  {analysisResult.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      {rec.type === "warning" && <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                      {rec.type === "success" && <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />}
                      {rec.type === "tip" && <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{rec.title}</p>
                          {rec.metric && rec.value && (
                            <Badge variant={rec.type === "success" ? "default" : rec.type === "warning" ? "destructive" : "secondary"}>
                              {rec.metric}: {rec.value}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ROAS by Campaign */}
                {analysisResult.chartData.roasByCampaign.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">ROAS por Campanha</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={analysisResult.chartData.roasByCampaign} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === 'roas' ? `${value.toFixed(2)}x` : formatCurrency(value),
                            name === 'roas' ? 'ROAS' : 'Gasto'
                          ]}
                        />
                        <Bar dataKey="roas" fill="#22c55e" name="ROAS" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Spend by Campaign */}
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Distribuição de Gasto por Campanha</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={analysisResult.chartData.spendBySource}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {analysisResult.chartData.spendBySource.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                {/* Conversion Funnel */}
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Funil de Conversão</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analysisResult.chartData.conversionFunnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number) => formatNumber(value)} />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Cliques vs Conversões por Campanha */}
                {analysisResult.chartData.campaignPerformance.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3">Cliques vs Conversões por Campanha</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={analysisResult.chartData.campaignPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [formatNumber(value), name]}
                        />
                        <Legend />
                        <Bar dataKey="cliques" name="Cliques" fill="#06b6d4" />
                        <Bar dataKey="conversoes" name="Conversões" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Analisar Novo Arquivo
                </Button>
                <Button 
                  onClick={handleExportPDF} 
                  disabled={isExportingPDF}
                  className="flex-1 gap-2"
                >
                  {isExportingPDF ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4" />
                      Exportar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
