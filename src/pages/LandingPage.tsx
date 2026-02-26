import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Eye,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Star,
} from "lucide-react";

const CHECKOUT_URL_MONTHLY = "https://pay.cakto.com.br/SEU_PRODUTO_MENSAL"; // Substituir pela URL real
const CHECKOUT_URL_LIFETIME = "https://pay.cakto.com.br/SEU_PRODUTO_VITALICIO"; // Substituir pela URL real

const features = [
  {
    icon: ShoppingCart,
    title: "Multi-plataforma",
    desc: "Shopee, Mercado Livre, Amazon, Magalu e TikTok em um só lugar",
  },
  {
    icon: TrendingUp,
    title: "Margens Precisas",
    desc: "Cálculo automático com comissões, frete, impostos e marketing",
  },
  {
    icon: DollarSign,
    title: "Lucro Real",
    desc: "Saiba exatamente quanto vai lucrar antes de anunciar",
  },
  {
    icon: Shield,
    title: "Sempre Atualizado",
    desc: "Tabelas de comissão atualizadas conforme as plataformas",
  },
];

const benefits = [
  "Calcule margens em segundos",
  "Compare preços entre plataformas",
  "Inclua impostos e custos de marketing",
  "Tabelas completas de comissão",
  "Frete e taxas fixas inclusos",
  "Compare preços entre plataformas",
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 pt-16 pb-20 relative">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Gasto Vision</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Já sou aluno
            </Button>
          </nav>

          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                <Zap className="w-3 h-3 mr-1" />
                Ferramenta #1 para sellers
              </Badge>

              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-6">
                Pare de{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  perder dinheiro
                </span>{" "}
                nos marketplaces
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Calcule suas margens de lucro com precisão em Shopee, Mercado Livre,
                Amazon e Magalu. Descubra o preço ideal antes de anunciar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 gap-2 shadow-lg shadow-primary/20"
                  onClick={() =>
                    document
                      .getElementById("pricing")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Quero Acessar Agora
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6"
                  onClick={() =>
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Saiba Mais
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y bg-card/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-primary fill-primary"
                  />
                ))}
              </div>
              <span className="text-sm font-medium">4.9/5 avaliação</span>
            </div>
            <div className="text-sm">
              <span className="font-bold text-foreground">500+</span> sellers usando
            </div>
            <div className="text-sm">
              <span className="font-bold text-foreground">R$2M+</span> em vendas calculadas
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para{" "}
              <span className="text-primary">precificar com lucro</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Calculadoras específicas para cada marketplace com todas as taxas e
              comissões atualizadas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Plataformas Suportadas
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {["🛒 Shopee", "🛍️ Mercado Livre", "📦 Amazon", "🏪 Magalu", "🎵 TikTok"].map(
              (p) => (
                <div
                  key={p}
                  className="px-8 py-4 rounded-2xl border bg-card text-foreground font-semibold text-lg hover:border-primary/50 transition-colors"
                >
                  {p}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                O que está incluso
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((b) => (
                <div
                  key={b}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-card"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha seu plano
            </h2>
            <p className="text-muted-foreground">
              Comece a precificar com inteligência hoje mesmo
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Mensal */}
            <div className="p-8 rounded-3xl border bg-card text-center">
              <h3 className="text-lg font-semibold text-foreground mb-1">Mensal</h3>
              <p className="text-sm text-muted-foreground mb-6">Cancele quando quiser</p>
              <div className="mb-6">
                <div className="text-4xl font-extrabold text-foreground">
                  R$<span className="text-primary">19</span>
                  <span className="text-lg font-normal text-muted-foreground">,90/mês</span>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-3 mb-8 text-left">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Todas as calculadoras</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Atualizações inclusas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Suporte por email</li>
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="w-full text-base py-6"
                onClick={() => window.open(CHECKOUT_URL_MONTHLY, "_blank")}
              >
                Assinar Mensal
              </Button>
            </div>

            {/* Vitalício - Destaque */}
            <div className="relative p-8 rounded-3xl border-2 border-primary bg-gradient-to-br from-primary/5 via-card to-accent/5 text-center shadow-lg shadow-primary/10">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-0 px-4 py-1">
                ⭐ Mais Popular
              </Badge>
              <h3 className="text-lg font-semibold text-foreground mb-1">Vitalício</h3>
              <p className="text-sm text-muted-foreground mb-6">Pague uma vez, use para sempre</p>
              <div className="mb-6">
                <div className="text-sm text-muted-foreground line-through">De R$197,00</div>
                <div className="text-5xl font-extrabold text-foreground">
                  R$<span className="text-primary">97</span>
                  <span className="text-lg font-normal text-muted-foreground">,00</span>
                </div>
                <div className="text-sm text-primary font-medium mt-1">Pagamento único</div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-3 mb-8 text-left">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Todas as calculadoras</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Atualizações vitalícias</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Suporte prioritário</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> Economia de R$141/ano</li>
              </ul>
              <Button
                size="lg"
                className="w-full text-base py-6 gap-2 shadow-lg shadow-primary/20"
                onClick={() => window.open(CHECKOUT_URL_LIFETIME, "_blank")}
              >
                Garantir Acesso Vitalício
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Pagamento seguro via Cakto • Acesso imediato após confirmação
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Gasto Vision. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
