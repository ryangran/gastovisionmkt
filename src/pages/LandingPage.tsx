import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import logo from "@/assets/logo.png";
import shopeeLogo from "@/assets/shopee-logo.png";
import mercadolivreLogo from "@/assets/mercadolivre-logo.png";
import amazonLogo from "@/assets/amazon-logo.png";
import magaluLogo from "@/assets/magalu-logo.png";
import tiktokLogo from "@/assets/tiktok-logo.png";
import sheinLogo from "@/assets/shein-logo.png";
import avatarAna from "@/assets/avatar-ana.jpg";
import avatarMarcos from "@/assets/avatar-marcos.jpg";
import avatarJuliana from "@/assets/avatar-juliana.jpg";
import avatarRicardo from "@/assets/avatar-ricardo.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Star,
  Quote,
  Users,
  Clock,
  Play,
  ShieldCheck } from
"lucide-react";

const CHECKOUT_URL_MONTHLY = "https://pay.cakto.com.br/vgi2b7q";
const CHECKOUT_URL_LIFETIME = "https://pay.cakto.com.br/6m7kaiz_785267";

const features = [
{
  icon: ShoppingCart,
  title: "Multi-plataforma",
  desc: "Shopee, Mercado Livre, Amazon, Magalu e TikTok em um só lugar"
},
{
  icon: TrendingUp,
  title: "Margens Precisas",
  desc: "Cálculo automático com comissões, frete, impostos e marketing"
},
{
  icon: DollarSign,
  title: "Lucro Real",
  desc: "Saiba exatamente quanto vai lucrar antes de anunciar"
},
{
  icon: Shield,
  title: "Sempre Atualizado",
  desc: "Tabelas de comissão atualizadas conforme as plataformas"
}];


const testimonials = [
{
  name: "Ana Paula S.",
  role: "Vendedora na Shopee há 2 anos",
  text: "Antes eu chutava o preço e vivia no prejuízo sem saber. Com o Gasto Vision descobri que estava perdendo R$3 em cada venda. Corrigi em 1 dia.",
  rating: 5,
  avatar: avatarAna
},
{
  name: "Marcos R.",
  role: "Seller no Mercado Livre",
  text: "Ferramenta simples e certeira. Já calculei mais de 200 produtos e nunca mais tive surpresa com as comissões da plataforma.",
  rating: 5,
  avatar: avatarMarcos
},
{
  name: "Juliana T.",
  role: "Loja no TikTok Shop e Amazon",
  text: "O que mais gosto é ter tudo em um lugar só. Shopee, ML, Amazon — comparo os lucros lado a lado antes de decidir onde anunciar.",
  rating: 5,
  avatar: avatarJuliana
},
{
  name: "Ricardo L.",
  role: "Seller na Shopee e Magalu",
  text: "Eu perdia tempo toda semana atualizando planilha. Agora em 2 minutos sei a margem exata de cada produto em cada plataforma. Indispensável.",
  rating: 5,
  avatar: avatarRicardo
}];


const stats = [
{ value: "500+", label: "Sellers ativos", icon: Users },
{ value: "R$2M+", label: "Em vendas calculadas", icon: DollarSign },
{ value: "4.9/5", label: "Avaliação média", icon: Star },
{ value: "1 min", label: "Para precificar", icon: Clock }];


const benefits = [
"Calcule margens em segundos",
"Compare preços entre plataformas",
"Inclua impostos e custos de marketing",
"Tabelas completas de comissão",
"Frete e taxas fixas inclusos",
"Histórico de precificações salvo"];


const LandingPage = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem("gv_timer");
    if (saved) {
      const remaining = Math.max(0, parseInt(saved, 10) - Math.floor(Date.now() / 1000));
      return remaining > 0 ? remaining : 0;
    }
    const end = Math.floor(Date.now() / 1000) + 300;
    localStorage.setItem("gv_timer", String(end));
    return 300;
  });

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timeLeft > 0]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerExpired = timeLeft <= 0;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 pt-16 pb-20 relative">
          {/* Nav */}
          <nav className="flex justify-center mb-20">
            <img src={logo} alt="Gasto Vision MKT" className="h-36" />
          </nav>

          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}>
              
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

              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">Calcule suas margens de lucro com precisão em Shopee, Mercado Livre, Tik Tok, Shein, Amazon e Magalu. Descubra o preço ideal antes de anunciar.


              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 gap-2 shadow-lg shadow-primary/20"
                  onClick={() =>
                  document.
                  getElementById("pricing")?.
                  scrollIntoView({ behavior: "smooth" })
                  }>
                  
                  Quero Acessar Agora
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6"
                  onClick={() => navigate("/auth")}>
                  
                  Já sou aluno
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Veja como funciona em 1 minuto
            </h2>
          </div>
          <div className="max-w-[800px] mx-auto">
            <video
              className="w-full aspect-video rounded-2xl border bg-card"
              controls
              preload="metadata"
              poster=""
            >
              <source src="/demo-video.mp4" type="video/mp4" />
            </video>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Precifique qualquer produto em menos de 60 segundos
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) =>
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-card border">
              
                <stat.icon className="w-6 h-6 text-primary mb-1" />
                <span className="text-3xl md:text-4xl font-extrabold text-foreground">{stat.value}</span>
                <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
              </motion.div>
            )}
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
            {features.map((f, i) =>
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            )}
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
            {[
              { name: "Shopee", logo: shopeeLogo },
              { name: "Mercado Livre", logo: mercadolivreLogo },
              { name: "Amazon", logo: amazonLogo },
              { name: "Magalu", logo: magaluLogo },
              { name: "TikTok", logo: tiktokLogo },
              { name: "Shein", logo: sheinLogo },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl border bg-card text-foreground font-semibold text-lg hover:border-primary/50 transition-colors">
                <img src={p.logo} alt={p.name} className="h-8 w-8 object-contain" />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              O que nossos <span className="text-primary">sellers dizem</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Veja como o Gasto Vision está transformando o negócio de centenas de vendedores
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((t, i) =>
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              
                <Quote className="w-8 h-8 text-primary/20 absolute top-4 right-4" />
                <div className="flex gap-1 mb-3">
                  {[...Array(t.rating)].map((_, j) =>
                <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                )}
                </div>
                <p className="text-foreground mb-4 text-sm leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" width={40} height={40} />
                  <div>
                    <p className="text-foreground font-semibold text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
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
              {benefits.map((b) =>
              <div
                key={b}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card">
                
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{b}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha seu plano
            </h2>
            <p className="text-muted-foreground mb-6">
              Comece a precificar com inteligência hoje mesmo
            </p>

            {/* Countdown Timer */}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full flex items-center justify-center gap-4 md:gap-6 px-4 py-4 rounded-2xl border border-destructive/30 bg-destructive/5 mb-10"
          >
            <p className="text-sm font-semibold text-destructive flex items-center gap-2 shrink-0">
              <Zap className="w-4 h-4" />
              {timerExpired ? "O tempo acabou! Mas ainda dá tempo..." : "🔥 Oferta expira em:"}
            </p>
            <div className="flex items-center gap-1">
              <span className={`text-3xl md:text-4xl font-mono font-extrabold tabular-nums ${timerExpired ? "text-muted-foreground" : timeLeft < 60 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                {String(minutes).padStart(2, "0")}
              </span>
              <span className="text-xl font-bold text-muted-foreground">:</span>
              <span className={`text-3xl md:text-4xl font-mono font-extrabold tabular-nums ${timerExpired ? "text-muted-foreground" : timeLeft < 60 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                {String(seconds).padStart(2, "0")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
              {timerExpired ? "Garanta seu acesso agora antes que o preço suba" : "Garanta o melhor preço antes que acabe"}
            </p>
          </motion.div>

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
                onClick={() => window.open(CHECKOUT_URL_MONTHLY, "_blank")}>
                
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
                <p className="text-sm font-semibold mt-1" style={{ color: 'hsl(25, 95%, 53%)' }}>⚡ Oferta por tempo limitado</p>
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
                onClick={() => window.open(CHECKOUT_URL_LIFETIME, "_blank")}>
                
                Garantir Acesso Vitalício
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Pagamento seguro via Cakto • Acesso imediato após confirmação
          </p>

          <div className="flex items-center justify-center gap-2 mt-6">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Garantia de 7 dias — Se não gostar, devolvemos 100% do valor. Sem perguntas.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Gasto Vision. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>);

};

export default LandingPage;