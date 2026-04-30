import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trash2, Calculator, BookmarkPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import shopeeLogo from "@/assets/shopee-logo.png";
import mercadolivreLogo from "@/assets/mercadolivre-logo.png";
import amazonLogo from "@/assets/amazon-logo.png";
import tiktokLogo from "@/assets/tiktok-logo.png";
import sheinLogo from "@/assets/shein-logo.png";
import magaluLogo from "@/assets/magalu-logo.png";

interface SavedCalc {
  id: string;
  platform: string;
  product_name: string;
  sale_price: number;
  cost: number;
  profit_margin_percent: number;
  profit_margin_value: number;
  created_at: string;
}

const PLATFORMS = [
  { key: "todos",          label: "Todos",         logo: null },
  { key: "Shopee",         label: "Shopee",         logo: shopeeLogo },
  { key: "Mercado Livre",  label: "Mercado Livre",  logo: mercadolivreLogo },
  { key: "Amazon",         label: "Amazon",         logo: amazonLogo },
  { key: "Magalu",         label: "Magalu",         logo: magaluLogo },
  { key: "TikTok Shop",    label: "TikTok",         logo: tiktokLogo },
  { key: "Shein",          label: "Shein",          logo: sheinLogo },
] as const;

const PLATFORM_STYLE: Record<string, string> = {
  Shopee:          "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Amazon:          "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Magalu:          "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Mercado Livre": "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
  "TikTok Shop":   "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Shein:           "bg-rose-700/15 text-rose-300 border-rose-700/30",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
}

const TableHeader = () => (
  <div className="hidden md:grid md:grid-cols-[1fr_105px_105px_85px_105px_70px_36px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
    <span>Produto</span>
    <span className="text-right">Preço venda</span>
    <span className="text-right">Custo</span>
    <span className="text-right">Margem</span>
    <span className="text-right">Lucro</span>
    <span className="text-right">Data</span>
    <span />
  </div>
);

const ProductRow = ({
  p,
  onDelete,
  showPlatform = false,
}: {
  p: SavedCalc;
  onDelete: (id: string) => void;
  showPlatform?: boolean;
}) => (
  <Card className="border-border bg-card hover:bg-muted/30 transition-colors">
    <CardContent className="py-3 px-4">
      {/* Desktop */}
      <div
        className={`hidden md:grid gap-3 items-center ${
          showPlatform
            ? "md:grid-cols-[1fr_120px_105px_105px_85px_105px_70px_36px]"
            : "md:grid-cols-[1fr_105px_105px_85px_105px_70px_36px]"
        }`}
      >
        <span className="font-medium text-foreground truncate text-sm">
          {p.product_name}
        </span>
        {showPlatform && (
          <span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                PLATFORM_STYLE[p.platform] ?? "bg-muted text-muted-foreground border-border"
              }`}
            >
              {p.platform}
            </span>
          </span>
        )}
        <span className="text-right text-sm text-foreground">
          {formatCurrency(p.sale_price)}
        </span>
        <span className="text-right text-sm text-muted-foreground">
          {formatCurrency(p.cost)}
        </span>
        <span
          className={`text-right text-sm font-semibold ${
            p.profit_margin_percent > 0 ? "text-success" : "text-destructive"
          }`}
        >
          {p.profit_margin_percent.toFixed(1)}%
        </span>
        <span
          className={`text-right text-sm font-semibold ${
            p.profit_margin_value > 0 ? "text-success" : "text-destructive"
          }`}
        >
          {formatCurrency(p.profit_margin_value)}
        </span>
        <span className="text-right text-xs text-muted-foreground">
          {formatDate(p.created_at)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(p.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {showPlatform && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  PLATFORM_STYLE[p.platform] ?? "bg-muted text-muted-foreground border-border"
                }`}
              >
                {p.platform}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
          </div>
          <p className="font-medium text-foreground truncate text-sm">{p.product_name}</p>
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span>Venda: <span className="text-foreground font-medium">{formatCurrency(p.sale_price)}</span></span>
            <span>Custo: <span className="text-foreground font-medium">{formatCurrency(p.cost)}</span></span>
          </div>
          <div className="flex gap-4 mt-0.5 text-xs">
            <span className={`font-semibold ${p.profit_margin_percent > 0 ? "text-success" : "text-destructive"}`}>
              Margem: {p.profit_margin_percent.toFixed(1)}%
            </span>
            <span className={`font-semibold ${p.profit_margin_value > 0 ? "text-success" : "text-destructive"}`}>
              Lucro: {formatCurrency(p.profit_margin_value)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(p.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ platform }: { platform: string }) => (
  <Card className="border-dashed border-border bg-card/50">
    <CardContent className="text-center py-12">
      <Calculator className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground font-medium text-sm">
        Nenhum produto salvo{platform !== "todos" ? ` na ${platform}` : ""}
      </p>
    </CardContent>
  </Card>
);

const ProdutosSalvos = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SavedCalc[]>([]);
  const [activeTab, setActiveTab] = useState("todos");

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("saved_calculations")
        .select("*")
        .eq("user_email", session.user.email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Erro ao carregar produtos. Verifique se a migration foi aplicada no Supabase.");
      } else {
        setProducts(data ?? []);
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleDelete = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("saved_calculations").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir produto."); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Produto removido.");
  };

  const filtered = (platform: string) =>
    platform === "todos" ? products : products.filter((p) => p.platform === platform);

  const countOf = (platform: string) => filtered(platform).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/calculadora")} className="gap-2 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">Produtos Salvos</h1>
            </div>
          </div>
          <Badge variant="secondary">
            {products.length} produto{products.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tabs header */}
          <TabsList className="flex flex-wrap gap-1 h-auto bg-transparent p-0 mb-4 w-full border-b border-border pb-3">
            {PLATFORMS.map(({ key, label, logo }) => {
              const count = countOf(key);
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all"
                >
                  {logo && <img src={logo} alt={label} className="h-3.5 object-contain" />}
                  {label}
                  {count > 0 && (
                    <span className="ml-1 text-xs bg-muted data-[state=active]:bg-primary-foreground/20 rounded-full px-1.5 py-0.5 font-medium">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab contents */}
          {PLATFORMS.map(({ key, label }) => {
            const list = filtered(key);
            const isAll = key === "todos";
            return (
              <TabsContent key={key} value={key} className="mt-0">
                {list.length === 0 ? (
                  <EmptyState platform={label} />
                ) : (
                  <div className="space-y-2">
                    {isAll && (
                      <div className="hidden md:grid md:grid-cols-[1fr_120px_105px_105px_85px_105px_70px_36px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
                        <span>Produto</span>
                        <span>Plataforma</span>
                        <span className="text-right">Preço venda</span>
                        <span className="text-right">Custo</span>
                        <span className="text-right">Margem</span>
                        <span className="text-right">Lucro</span>
                        <span className="text-right">Data</span>
                        <span />
                      </div>
                    )}
                    {!isAll && <TableHeader />}
                    {list.map((p) => (
                      <ProductRow key={p.id} p={p} onDelete={handleDelete} showPlatform={isAll} />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
};

export default ProdutosSalvos;
