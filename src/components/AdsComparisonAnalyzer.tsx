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
import { 
  Upload, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  MousePointerClick, 
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
  Trophy,
  AlertCircle,
  Lightbulb,
  Check,
  X,
  Brain,
  Sparkles
} from "lucide-react";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface AIComparisonAnalysis {
  vencedor?: string;
  resumoComparativo?: string;
  diferencasChave?: Array<{
    metrica: string;
    periodo1: string;
    periodo2: string;
    analise: string;
  }>;
  possivelCausaVitoria?: string;
  licoes?: string[];
  recomendacoes?: Array<{
    titulo: string;
    descricao: string;
  }>;
  alertas?: string[];
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

interface AnalysisSummary {
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
  fileName?: string;
}

interface ComparisonResult {
  file1: AnalysisSummary;
  file2: AnalysisSummary;
  winner: "file1" | "file2" | "tie";
  winnerScore: number;
  insights: ComparisonInsight[];
  metricComparison: MetricComparison[];
  radarData: any[];
}

interface ComparisonInsight {
  type: "winner" | "improvement" | "warning" | "tip";
  title: string;
  description: string;
  metric?: string;
}

interface MetricComparison {
  metric: string;
  label: string;
  file1Value: number;
  file2Value: number;
  file1Display: string;
  file2Display: string;
  winner: "file1" | "file2" | "tie";
  difference: number;
  differencePercent: number;
  higherIsBetter: boolean;
}

const PLATFORM_COLUMNS: Record<AdPlatform, { display: string; mappings: Record<string, string[]> }> = {
  mercado_livre_bms: {
    display: "Mercado Livre BMS",
    mappings: {
      campaign: ["nome", "campaign name", "campaign", "campanha", "nome da campanha"],
      adset: ["status", "ad set name", "adset", "conjunto"],
      ad: ["ad name", "ad", "anúncio"],
      impressions: ["impressões", "impressions", "impr."],
      clicks: ["cliques", "clicks"],
      spend: ["investimento", "investimento\n(moeda local)", "amount spent", "spend", "cost", "gasto", "custo"],
      conversions: ["vendas por publicidade", "vendas por publicidade\n(diretas + indiretas)", "purchases", "conversions", "vendas"],
      revenue: ["receita", "receita\n(moeda local)", "purchase value", "revenue", "faturamento"],
      date: ["desde", "day", "date", "data"],
      ctr: ["ctr", "ctr\n(click through rate)", "click through rate"],
      cpc: ["cpc", "cpc\n(custo por clique)", "custo per clique", "custo por clique"],
      cvr: ["cvr", "cvr\n(conversion rate)", "conversion rate", "taxa de conversão"],
      acos: ["acos", "acos\n(investimento / receitas)", "advertising cost of sales"],
      roas: ["roas", "roas\n(receitas / investimento)", "return on advertising spend"],
    }
  },
  mercado_livre_ms: {
    display: "Mercado Livre MS",
    mappings: {
      campaign: ["nome", "campaign name", "campaign", "campanha", "nome da campanha"],
      adset: ["status", "ad set name", "adset", "conjunto"],
      ad: ["ad name", "ad", "anúncio"],
      impressions: ["impressões", "impressions", "impr."],
      clicks: ["cliques", "clicks"],
      spend: ["investimento", "investimento\n(moeda local)", "amount spent", "spend", "cost", "gasto", "custo"],
      conversions: ["vendas por publicidade", "vendas por publicidade\n(diretas + indiretas)", "purchases", "conversions", "vendas"],
      revenue: ["receita", "receita\n(moeda local)", "purchase value", "revenue", "faturamento"],
      date: ["desde", "day", "date", "data"],
      ctr: ["ctr", "ctr\n(click through rate)", "click through rate"],
      cpc: ["cpc", "cpc\n(custo por clique)", "custo per clique", "custo por clique"],
      cvr: ["cvr", "cvr\n(conversion rate)", "conversion rate", "taxa de conversão"],
      acos: ["acos", "acos\n(investimento / receitas)", "advertising cost of sales"],
      roas: ["roas", "roas\n(receitas / investimento)", "return on advertising spend"],
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

export function AdsComparisonAnalyzer() {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<AdPlatform | "">("");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIComparisonAnalysis | null>(null);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const fetchAIComparison = async (result: ComparisonResult) => {
    setIsAnalyzingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-ads", {
        body: {
          type: "comparison",
          comparisonMetrics: {
            file1: result.file1,
            file2: result.file2,
          },
        },
      });

      if (error) {
        console.error("AI comparison error:", error);
        toast.error("Erro ao obter análise comparativa da IA");
        return;
      }

      if (data?.analysis) {
        setAiAnalysis(data.analysis);
        toast.success("Análise comparativa da IA concluída!");
      }
    } catch (err) {
      console.error("Error fetching AI comparison:", err);
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

  const parseNumber = (value: string, useBrazilianFormat: boolean = false): number => {
    if (!value || value === "-") return 0;
    
    let cleaned = value.replace(/[R$€£¥\s%]/g, "").trim();
    
    const hasDot = cleaned.includes(".");
    const hasComma = cleaned.includes(",");
    
    if (useBrazilianFormat || (hasComma && hasDot)) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (hasComma && !hasDot) {
      cleaned = cleaned.replace(",", ".");
    }
    
    return parseFloat(cleaned) || 0;
  };

  const parseExcelFile = async (file: File): Promise<string[][]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    
    const allData: string[][] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
      
      for (const row of data) {
        if (Array.isArray(row) && row.some(cell => cell !== "")) {
          allData.push(row.map(cell => String(cell ?? "")));
        }
      }
    }
    
    return allData;
  };

  const parseFile = async (file: File, platformKey: AdPlatform): Promise<AnalysisSummary | null> => {
    try {
      let rows: string[][];
      const isExcel = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
      
      if (isExcel) {
        rows = await parseExcelFile(file);
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }
      
      if (rows.length < 2) return null;

      let headerRowIndex = 0;
      let reportPeriod: string | undefined;
      const isShopee = platformKey.includes("shopee");
      const isMercadoLivre = platformKey.includes("mercado_livre");
      
      if (isMercadoLivre && isExcel) {
        if (rows.length > 0) {
          const titleRow = rows[0];
          const titleText = titleRow.join(" ");
          const periodMatch = titleText.match(/(\d+\s+\w+\s+\d{4})\s*-\s*(\d+\s+\w+\s+\d{4})/);
          if (periodMatch) {
            reportPeriod = `${periodMatch[1]} - ${periodMatch[2]}`;
          }
        }
        
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row[0]?.toLowerCase().trim() === "nome" && row.length > 10) {
            headerRowIndex = i;
            break;
          }
        }
      } else if (isShopee) {
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row[0]?.toLowerCase().includes("período") || row[0]?.toLowerCase().includes("periodo")) {
            reportPeriod = row[1]?.trim();
            break;
          }
        }
        
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
      const platformConfig = PLATFORM_COLUMNS[platformKey];
      
      const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\n/g, " ").trim());
      
      const findIndex = (mappings: string[]): number => {
        for (const mapping of mappings) {
          const normalizedMapping = mapping.toLowerCase().replace(/\n/g, " ").trim();
          const index = normalizedHeaders.findIndex(h => h.includes(normalizedMapping) || normalizedMapping.includes(h));
          if (index !== -1) return index;
        }
        return -1;
      };

      const indices = {
        impressions: findIndex(platformConfig.mappings.impressions),
        clicks: findIndex(platformConfig.mappings.clicks),
        spend: findIndex(platformConfig.mappings.spend),
        conversions: findIndex(platformConfig.mappings.conversions),
        revenue: findIndex(platformConfig.mappings.revenue),
        roas: platformConfig.mappings.roas ? findIndex(platformConfig.mappings.roas) : -1,
      };

      const usesBrazilianFormat = !isExcel && !platformKey.includes("shopee");

      const data: AdsData[] = rows.slice(headerRowIndex + 1)
        .filter(row => row.some(cell => cell !== ""))
        .map(row => {
          const rawRoas = indices.roas >= 0 ? row[indices.roas] : undefined;
          
          return {
            impressions: parseNumber(String(row[indices.impressions] || "0"), usesBrazilianFormat),
            clicks: parseNumber(String(row[indices.clicks] || "0"), usesBrazilianFormat),
            spend: parseNumber(String(row[indices.spend] || "0"), usesBrazilianFormat),
            conversions: parseNumber(String(row[indices.conversions] || "0"), usesBrazilianFormat),
            revenue: parseNumber(String(row[indices.revenue] || "0"), usesBrazilianFormat),
            roas: rawRoas ? parseNumber(String(rawRoas), usesBrazilianFormat) / 100 : undefined,
          };
        })
        .filter(d => d.impressions > 0 || d.spend > 0);

      if (data.length === 0) return null;

      const totalSpend = data.reduce((sum, d) => sum + d.spend, 0);
      const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
      const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
      const totalConversions = data.reduce((sum, d) => sum + d.conversions, 0);
      const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

      return {
        totalSpend,
        totalImpressions,
        totalClicks,
        totalConversions,
        totalRevenue,
        avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
        avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        avgCPA: totalConversions > 0 ? totalSpend / totalConversions : 0,
        avgROAS: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        reportPeriod,
        fileName: file.name,
      };
    } catch (error) {
      console.error("Error parsing file:", error);
      return null;
    }
  };

  const compareResults = (summary1: AnalysisSummary, summary2: AnalysisSummary): ComparisonResult => {
    const metrics: MetricComparison[] = [
      {
        metric: "roas",
        label: "ROAS",
        file1Value: summary1.avgROAS,
        file2Value: summary2.avgROAS,
        file1Display: `${summary1.avgROAS.toFixed(2)}x`,
        file2Display: `${summary2.avgROAS.toFixed(2)}x`,
        winner: summary1.avgROAS > summary2.avgROAS ? "file1" : summary1.avgROAS < summary2.avgROAS ? "file2" : "tie",
        difference: summary1.avgROAS - summary2.avgROAS,
        differencePercent: summary2.avgROAS > 0 ? ((summary1.avgROAS - summary2.avgROAS) / summary2.avgROAS) * 100 : 0,
        higherIsBetter: true,
      },
      {
        metric: "revenue",
        label: "Receita",
        file1Value: summary1.totalRevenue,
        file2Value: summary2.totalRevenue,
        file1Display: formatCurrency(summary1.totalRevenue),
        file2Display: formatCurrency(summary2.totalRevenue),
        winner: summary1.totalRevenue > summary2.totalRevenue ? "file1" : summary1.totalRevenue < summary2.totalRevenue ? "file2" : "tie",
        difference: summary1.totalRevenue - summary2.totalRevenue,
        differencePercent: summary2.totalRevenue > 0 ? ((summary1.totalRevenue - summary2.totalRevenue) / summary2.totalRevenue) * 100 : 0,
        higherIsBetter: true,
      },
      {
        metric: "conversions",
        label: "Conversões",
        file1Value: summary1.totalConversions,
        file2Value: summary2.totalConversions,
        file1Display: formatNumber(summary1.totalConversions),
        file2Display: formatNumber(summary2.totalConversions),
        winner: summary1.totalConversions > summary2.totalConversions ? "file1" : summary1.totalConversions < summary2.totalConversions ? "file2" : "tie",
        difference: summary1.totalConversions - summary2.totalConversions,
        differencePercent: summary2.totalConversions > 0 ? ((summary1.totalConversions - summary2.totalConversions) / summary2.totalConversions) * 100 : 0,
        higherIsBetter: true,
      },
      {
        metric: "ctr",
        label: "CTR",
        file1Value: summary1.avgCTR,
        file2Value: summary2.avgCTR,
        file1Display: `${summary1.avgCTR.toFixed(2)}%`,
        file2Display: `${summary2.avgCTR.toFixed(2)}%`,
        winner: summary1.avgCTR > summary2.avgCTR ? "file1" : summary1.avgCTR < summary2.avgCTR ? "file2" : "tie",
        difference: summary1.avgCTR - summary2.avgCTR,
        differencePercent: summary2.avgCTR > 0 ? ((summary1.avgCTR - summary2.avgCTR) / summary2.avgCTR) * 100 : 0,
        higherIsBetter: true,
      },
      {
        metric: "cpc",
        label: "CPC",
        file1Value: summary1.avgCPC,
        file2Value: summary2.avgCPC,
        file1Display: formatCurrency(summary1.avgCPC),
        file2Display: formatCurrency(summary2.avgCPC),
        winner: summary1.avgCPC < summary2.avgCPC ? "file1" : summary1.avgCPC > summary2.avgCPC ? "file2" : "tie",
        difference: summary1.avgCPC - summary2.avgCPC,
        differencePercent: summary2.avgCPC > 0 ? ((summary1.avgCPC - summary2.avgCPC) / summary2.avgCPC) * 100 : 0,
        higherIsBetter: false,
      },
      {
        metric: "cpa",
        label: "CPA",
        file1Value: summary1.avgCPA,
        file2Value: summary2.avgCPA,
        file1Display: formatCurrency(summary1.avgCPA),
        file2Display: formatCurrency(summary2.avgCPA),
        winner: summary1.avgCPA < summary2.avgCPA ? "file1" : summary1.avgCPA > summary2.avgCPA ? "file2" : "tie",
        difference: summary1.avgCPA - summary2.avgCPA,
        differencePercent: summary2.avgCPA > 0 ? ((summary1.avgCPA - summary2.avgCPA) / summary2.avgCPA) * 100 : 0,
        higherIsBetter: false,
      },
      {
        metric: "spend",
        label: "Investimento",
        file1Value: summary1.totalSpend,
        file2Value: summary2.totalSpend,
        file1Display: formatCurrency(summary1.totalSpend),
        file2Display: formatCurrency(summary2.totalSpend),
        winner: "tie", // Spend is informational, not a win/loss metric
        difference: summary1.totalSpend - summary2.totalSpend,
        differencePercent: summary2.totalSpend > 0 ? ((summary1.totalSpend - summary2.totalSpend) / summary2.totalSpend) * 100 : 0,
        higherIsBetter: false,
      },
    ];

    // Calculate overall winner based on weighted score
    // ROAS (40%), Conversions (25%), CTR (15%), CPC (10%), CPA (10%)
    const weights = { roas: 40, conversions: 25, ctr: 15, cpc: 10, cpa: 10 };
    let file1Score = 0;
    let file2Score = 0;

    metrics.forEach(m => {
      if (m.metric === "spend" || m.metric === "revenue") return;
      const weight = weights[m.metric as keyof typeof weights] || 0;
      if (m.winner === "file1") file1Score += weight;
      else if (m.winner === "file2") file2Score += weight;
    });

    const winner = file1Score > file2Score ? "file1" : file1Score < file2Score ? "file2" : "tie";
    const winnerScore = Math.max(file1Score, file2Score);

    // Generate insights
    const insights: ComparisonInsight[] = [];

    // Overall winner insight
    if (winner !== "tie") {
      const winnerName = winner === "file1" ? (summary1.reportPeriod || "Arquivo 1") : (summary2.reportPeriod || "Arquivo 2");
      const loserName = winner === "file1" ? (summary2.reportPeriod || "Arquivo 2") : (summary1.reportPeriod || "Arquivo 1");
      insights.push({
        type: "winner",
        title: `${winnerName} teve melhor performance geral`,
        description: `Com pontuação de ${winnerScore}% nas métricas analisadas, superou ${loserName} em eficiência de campanhas.`,
      });
    }

    // ROAS comparison
    const roasMetric = metrics.find(m => m.metric === "roas")!;
    if (roasMetric.winner !== "tie") {
      const betterROAS = roasMetric.winner === "file1" ? summary1 : summary2;
      const worseROAS = roasMetric.winner === "file1" ? summary2 : summary1;
      const roasDiff = Math.abs(roasMetric.differencePercent);
      
      if (roasDiff > 20) {
        insights.push({
          type: "improvement",
          title: `ROAS ${roasDiff.toFixed(0)}% maior`,
          description: `O período com ROAS de ${betterROAS.avgROAS.toFixed(2)}x foi significativamente mais rentável. Possível causa: melhor segmentação ou criativos mais eficientes.`,
          metric: "ROAS",
        });
      }
    }

    // CTR comparison
    const ctrMetric = metrics.find(m => m.metric === "ctr")!;
    if (ctrMetric.winner !== "tie" && Math.abs(ctrMetric.differencePercent) > 15) {
      const betterPeriod = ctrMetric.winner === "file1" ? "primeiro" : "segundo";
      insights.push({
        type: "tip",
        title: `CTR melhor no ${betterPeriod} período`,
        description: `Um CTR ${Math.abs(ctrMetric.differencePercent).toFixed(0)}% maior indica anúncios mais atrativos ou melhor posicionamento. Analise os criativos desse período.`,
        metric: "CTR",
      });
    }

    // CPC/CPA comparison
    const cpcMetric = metrics.find(m => m.metric === "cpc")!;
    if (cpcMetric.winner !== "tie" && Math.abs(cpcMetric.differencePercent) > 20) {
      const cheaperPeriod = cpcMetric.winner === "file1" ? (summary1.reportPeriod || "Arquivo 1") : (summary2.reportPeriod || "Arquivo 2");
      insights.push({
        type: "tip",
        title: `CPC mais baixo em ${cheaperPeriod}`,
        description: `Custo por clique foi ${Math.abs(cpcMetric.differencePercent).toFixed(0)}% menor. Possíveis causas: menor concorrência, melhor Quality Score ou lances mais eficientes.`,
        metric: "CPC",
      });
    }

    // Spend vs Revenue efficiency
    const spendRatio1 = summary1.totalRevenue / summary1.totalSpend;
    const spendRatio2 = summary2.totalRevenue / summary2.totalSpend;
    if (Math.abs(spendRatio1 - spendRatio2) > 0.5) {
      const moreEfficient = spendRatio1 > spendRatio2 ? (summary1.reportPeriod || "Arquivo 1") : (summary2.reportPeriod || "Arquivo 2");
      insights.push({
        type: "improvement",
        title: `Melhor eficiência de investimento`,
        description: `${moreEfficient} converteu melhor cada real investido em receita. Revise a estratégia de alocação de budget.`,
      });
    }

    // Warning if both periods had low ROAS
    if (summary1.avgROAS < 1 && summary2.avgROAS < 1) {
      insights.push({
        type: "warning",
        title: "Ambos períodos com ROAS abaixo de 1x",
        description: "Nenhum dos períodos foi rentável. Considere revisar fundamentalmente a estratégia de campanhas, públicos e ofertas.",
      });
    }

    // Radar chart data (normalize values for comparison)
    const maxROAS = Math.max(summary1.avgROAS, summary2.avgROAS);
    const maxCTR = Math.max(summary1.avgCTR, summary2.avgCTR);
    const maxConv = Math.max(summary1.totalConversions, summary2.totalConversions);
    const maxCPC = Math.max(summary1.avgCPC, summary2.avgCPC);
    const maxCPA = Math.max(summary1.avgCPA, summary2.avgCPA);

    const radarData = [
      { 
        metric: "ROAS", 
        file1: maxROAS > 0 ? (summary1.avgROAS / maxROAS) * 100 : 0, 
        file2: maxROAS > 0 ? (summary2.avgROAS / maxROAS) * 100 : 0 
      },
      { 
        metric: "CTR", 
        file1: maxCTR > 0 ? (summary1.avgCTR / maxCTR) * 100 : 0, 
        file2: maxCTR > 0 ? (summary2.avgCTR / maxCTR) * 100 : 0 
      },
      { 
        metric: "Conversões", 
        file1: maxConv > 0 ? (summary1.totalConversions / maxConv) * 100 : 0, 
        file2: maxConv > 0 ? (summary2.totalConversions / maxConv) * 100 : 0 
      },
      { 
        metric: "CPC (inv)", 
        file1: maxCPC > 0 ? (1 - summary1.avgCPC / maxCPC) * 100 : 0, 
        file2: maxCPC > 0 ? (1 - summary2.avgCPC / maxCPC) * 100 : 0 
      },
      { 
        metric: "CPA (inv)", 
        file1: maxCPA > 0 ? (1 - summary1.avgCPA / maxCPA) * 100 : 0, 
        file2: maxCPA > 0 ? (1 - summary2.avgCPA / maxCPA) * 100 : 0 
      },
    ];

    return {
      file1: summary1,
      file2: summary2,
      winner,
      winnerScore,
      insights,
      metricComparison: metrics,
      radarData,
    };
  };

  const handleFileChange = (fileNum: 1 | 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validExtensions = [".csv", ".xlsx", ".xls"];
      const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      if (!hasValidExtension) {
        toast.error("Por favor, envie um arquivo CSV ou Excel (.xlsx, .xls)");
        return;
      }
      if (fileNum === 1) setFile1(file);
      else setFile2(file);
    }
  };

  const handleAnalyze = async () => {
    if (!platform || !file1 || !file2) {
      toast.error("Selecione a plataforma e os dois arquivos");
      return;
    }

    setIsAnalyzing(true);

    try {
      const [summary1, summary2] = await Promise.all([
        parseFile(file1, platform),
        parseFile(file2, platform),
      ]);

      if (!summary1 || !summary2) {
        toast.error("Erro ao processar um ou ambos os arquivos");
        setIsAnalyzing(false);
        return;
      }

      const result = compareResults(summary1, summary2);
      setComparisonResult(result);
      toast.success("Comparação concluída!");
      
      // Trigger AI comparison analysis
      fetchAIComparison(result);
    } catch (error) {
      console.error("Error comparing files:", error);
      toast.error("Erro ao comparar os arquivos");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setPlatform("");
    setComparisonResult(null);
    setAiAnalysis(null);
    if (fileInput1Ref.current) fileInput1Ref.current.value = "";
    if (fileInput2Ref.current) fileInput2Ref.current.value = "";
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GitCompare className="w-4 h-4" />
          Comparar ADS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Comparação de Performance de ADS
          </DialogTitle>
          <DialogDescription>
            Envie dois relatórios de períodos diferentes para comparar a performance e identificar melhorias.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          {!comparisonResult ? (
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

              {/* File Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File 1 */}
                <div className="space-y-2">
                  <Label htmlFor="file1">📊 Arquivo 1 (Período A)</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInput1Ref.current?.click()}
                  >
                    <Input
                      ref={fileInput1Ref}
                      id="file1"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange(1)}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {file1 ? (
                      <p className="text-sm font-medium truncate">{file1.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                    )}
                  </div>
                </div>

                {/* File 2 */}
                <div className="space-y-2">
                  <Label htmlFor="file2">📊 Arquivo 2 (Período B)</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInput2Ref.current?.click()}
                  >
                    <Input
                      ref={fileInput2Ref}
                      id="file2"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange(2)}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    {file2 ? (
                      <p className="text-sm font-medium truncate">{file2.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={!platform || !file1 || !file2 || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Comparando...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-4 h-4 mr-2" />
                    Comparar Dados
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Winner Banner */}
              <Card className={`p-4 ${
                comparisonResult.winner === "tie" 
                  ? "bg-muted" 
                  : "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50"
              }`}>
                <div className="flex items-center gap-3">
                  <Trophy className={`w-8 h-8 ${comparisonResult.winner === "tie" ? "text-muted-foreground" : "text-yellow-500"}`} />
                  <div>
                    <h3 className="text-lg font-bold">
                      {comparisonResult.winner === "tie" 
                        ? "Empate técnico" 
                        : `Vencedor: ${comparisonResult.winner === "file1" 
                            ? (comparisonResult.file1.reportPeriod || "Arquivo 1") 
                            : (comparisonResult.file2.reportPeriod || "Arquivo 2")}`
                      }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {comparisonResult.winner === "tie" 
                        ? "Os dois períodos tiveram performance semelhante"
                        : `Pontuação: ${comparisonResult.winnerScore}% das métricas favoráveis`
                      }
                    </p>
                  </div>
                </div>
              </Card>

              {/* Period Labels */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                    📊 {comparisonResult.file1.reportPeriod || comparisonResult.file1.fileName || "Arquivo 1"}
                  </Badge>
                </div>
                <div className="text-center p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-700">
                    📊 {comparisonResult.file2.reportPeriod || comparisonResult.file2.fileName || "Arquivo 2"}
                  </Badge>
                </div>
              </div>

              {/* Metric Comparison Table */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Comparação de Métricas
                </h3>
                <div className="space-y-2">
                  {comparisonResult.metricComparison.map((m, index) => (
                    <div key={index} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center p-2 rounded-lg bg-muted/50">
                      <div className={`text-right flex items-center justify-end gap-2 ${
                        m.winner === "file1" ? "text-green-600 font-semibold" : ""
                      }`}>
                        {m.file1Display}
                        {m.winner === "file1" && <Check className="w-4 h-4" />}
                      </div>
                      <div className="text-center px-3">
                        <Badge variant="outline" className="text-xs">
                          {m.label}
                        </Badge>
                      </div>
                      <div className={`text-left flex items-center gap-2 ${
                        m.winner === "file2" ? "text-green-600 font-semibold" : ""
                      }`}>
                        {m.winner === "file2" && <Check className="w-4 h-4" />}
                        {m.file2Display}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* AI Comparison Analysis */}
              <Card className="p-4 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Análise Comparativa (IA)
                </h3>
                
                {isAnalyzingAI ? (
                  <div className="flex items-center justify-center p-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
                    <span className="text-muted-foreground">Gerando análise comparativa com IA...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-4">
                    {/* Comparative Summary */}
                    {aiAnalysis.resumoComparativo && (
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-sm font-medium text-primary mb-1">📊 Resumo Comparativo</p>
                        <p className="text-sm">{aiAnalysis.resumoComparativo}</p>
                      </div>
                    )}

                    {/* Possible Cause */}
                    {aiAnalysis.possivelCausaVitoria && (
                      <div className="p-3 bg-green-500/10 rounded-lg border-l-4 border-green-500">
                        <p className="text-sm font-medium text-green-700 mb-1">🎯 Possível Causa da Diferença</p>
                        <p className="text-sm">{aiAnalysis.possivelCausaVitoria}</p>
                      </div>
                    )}

                    {/* Key Differences */}
                    {aiAnalysis.diferencasChave && aiAnalysis.diferencasChave.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">📈 Diferenças-Chave</p>
                        {aiAnalysis.diferencasChave.map((d, i) => (
                          <div key={i} className="p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{d.metrica}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {d.periodo1} → {d.periodo2}
                              </span>
                            </div>
                            <p className="text-sm">{d.analise}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lessons */}
                    {aiAnalysis.licoes && aiAnalysis.licoes.length > 0 && (
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-sm font-medium text-primary mb-2">📚 Lições Aprendidas</p>
                        <ul className="list-disc list-inside space-y-1">
                          {aiAnalysis.licoes.map((licao, i) => (
                            <li key={i} className="text-sm">{licao}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {aiAnalysis.recomendacoes && aiAnalysis.recomendacoes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">💡 Recomendações da IA</p>
                        {aiAnalysis.recomendacoes.map((rec, i) => (
                          <div key={i} className="p-3 rounded-lg bg-blue-500/10 border-l-4 border-blue-500">
                            <p className="font-medium text-sm">{rec.titulo}</p>
                            <p className="text-sm text-muted-foreground mt-1">{rec.descricao}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alerts */}
                    {aiAnalysis.alertas && aiAnalysis.alertas.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-destructive">⚠️ Alertas</p>
                        {aiAnalysis.alertas.map((alerta, i) => (
                          <div key={i} className="p-2 bg-red-500/10 rounded-lg text-sm text-red-700">
                            {alerta}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Raw analysis fallback */}
                    {aiAnalysis.rawAnalysis && !aiAnalysis.resumoComparativo && (
                      <div className="p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                        {aiAnalysis.rawAnalysis}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    <p>Análise comparativa da IA não disponível</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => comparisonResult && fetchAIComparison(comparisonResult)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Análise IA
                    </Button>
                  </div>
                )}
              </Card>

              {/* Insights */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Insights Automáticos
                </h3>
                <div className="space-y-3">
                  {comparisonResult.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      {insight.type === "winner" && <Trophy className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />}
                      {insight.type === "improvement" && <TrendingUp className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />}
                      {insight.type === "warning" && <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                      {insight.type === "tip" && <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{insight.title}</p>
                          {insight.metric && (
                            <Badge variant="secondary" className="text-xs">
                              {insight.metric}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Radar Chart */}
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Comparação Visual (Radar)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={comparisonResult.radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                      <Radar
                        name={comparisonResult.file1.reportPeriod || "Arquivo 1"}
                        dataKey="file1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name={comparisonResult.file2.reportPeriod || "Arquivo 2"}
                        dataKey="file2"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.3}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Bar Chart Comparison */}
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">ROAS e Conversões</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={[
                        {
                          metric: "ROAS",
                          file1: comparisonResult.file1.avgROAS,
                          file2: comparisonResult.file2.avgROAS,
                        },
                        {
                          metric: "Conversões (÷100)",
                          file1: comparisonResult.file1.totalConversions / 100,
                          file2: comparisonResult.file2.totalConversions / 100,
                        },
                        {
                          metric: "CTR",
                          file1: comparisonResult.file1.avgCTR,
                          file2: comparisonResult.file2.avgCTR,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="file1" 
                        name={comparisonResult.file1.reportPeriod || "Arquivo 1"} 
                        fill="#3b82f6" 
                      />
                      <Bar 
                        dataKey="file2" 
                        name={comparisonResult.file2.reportPeriod || "Arquivo 2"} 
                        fill="#a855f7" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Reset Button */}
              <Button variant="outline" onClick={handleReset} className="w-full">
                Nova Comparação
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
