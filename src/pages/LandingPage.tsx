import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Star,
  TrendingDown,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarketplaceLogo, type MarketplaceKey } from "@/components/MarketplaceLogo";
import { FichaMargem } from "@/components/landing/FichaMargem";
import { VideoFeature } from "@/components/landing/VideoFeature";
import logo from "@/assets/logo.png";
import logoLight from "@/assets/logo-light.png";
import avatarAna from "@/assets/avatar-ana.jpg";
import avatarMarcos from "@/assets/avatar-marcos.jpg";
import avatarJuliana from "@/assets/avatar-juliana.jpg";

const PLATAFORMAS: { key: MarketplaceKey; nome: string }[] = [
  { key: "shopee", nome: "Shopee" },
  { key: "mercadolivre", nome: "Mercado Livre" },
  { key: "amazon", nome: "Amazon" },
  { key: "magalu", nome: "Magalu" },
  { key: "tiktok", nome: "TikTok Shop" },
  { key: "shein", nome: "Shein" },
];

const DEPOIMENTOS = [
  {
    nome: "Ana Paula S.",
    papel: "Vendedora na Shopee há 2 anos",
    texto:
      "Antes eu chutava o preço e vivia no prejuízo sem saber. Com o Vetrex descobri que estava perdendo R$3 em cada venda. Corrigi em 1 dia.",
    avatar: avatarAna,
  },
  {
    nome: "Marcos R.",
    papel: "Seller no Mercado Livre",
    texto:
      "Ferramenta simples e certeira. Já calculei mais de 200 produtos e nunca mais tive surpresa com as comissões da plataforma.",
    avatar: avatarMarcos,
  },
  {
    nome: "Juliana T.",
    papel: "Loja no TikTok Shop e Amazon",
    texto:
      "O que mais gosto é ter tudo em um lugar só. Comparo os lucros lado a lado antes de decidir onde anunciar.",
    avatar: avatarJuliana,
  },
];

const INCLUSO = [
  "Seis calculadoras, uma por marketplace",
  "Comparador entre as seis",
  "Precificação reversa por margem",
  "Calculadora de anúncios com ROAS de equilíbrio",
  "Painel de estoque e margem da carteira",
  "Cadastro de embalagem e etiqueta reutilizável",
  "RPA de afiliados da Shopee em massa",
  "Perfil com regime tributário",
  "Atualizações vitalícias, incluindo as taxas",
];

const LandingPage = () => {
  const navigate = useNavigate();
  const irParaPreco = () =>
    document.getElementById("preco")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      {/* Textura de grão, para o preto não ficar chapado */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10">
        {/* NAV em pill flutuante */}
        <header className="relative z-20">
          <div className="container mx-auto flex items-center justify-between px-4 pt-5">
            <a href="/" aria-label="Vetrex">
              <img src={logo} alt="Vetrex" className="hidden h-8 w-auto dark:block" />
              <img src={logoLight} alt="Vetrex" className="block h-8 w-auto dark:hidden" />
            </a>

            <div className="flex items-center gap-1 rounded-full border border-border bg-card/70 p-1 backdrop-blur">
              <button
                onClick={irParaPreco}
                className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Preço
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Já sou aluno
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]"
          />
          <div className="container relative mx-auto px-4 pb-20 pt-16 lg:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-border bg-card/70 px-2.5 py-1.5 backdrop-blur"
              >
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                  Vetrex
                </span>
                <span className="text-sm text-muted-foreground">
                  A plataforma de quem vende em marketplace
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="font-display text-4xl font-bold leading-[1.08] text-foreground sm:text-5xl lg:text-6xl"
              >
                Entre o preço que você cobra
                <br className="hidden sm:block" /> e o dinheiro que{" "}
                <span className="text-primary">chega na sua conta</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
                className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                Tem comissão, frete, imposto, anúncio e embalagem. Cada um cobra de um jeito, e
                muda por plataforma, por peso e por faixa de preço. A Vetrex controla todos eles
                num lugar só.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Button size="lg" onClick={irParaPreco} className="gap-2 rounded-full px-6 py-6 text-base">
                  Quero ver quanto sobra pra mim
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <button
                  onClick={() => document.getElementById("como")?.scrollIntoView({ behavior: "smooth" })}
                  className="rounded-full px-5 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Ver como funciona
                </button>
              </motion.div>
            </div>

            <div className="mx-auto mt-14 max-w-xl">
              <FichaMargem />
            </div>

            <div className="mx-auto mt-16 max-w-4xl">
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Calcula para
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
                {PLATAFORMAS.map((p) => (
                  <MarketplaceLogo
                    key={p.key}
                    platform={p.key}
                    className="h-6 w-auto max-w-24 opacity-70 transition-opacity hover:opacity-100"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEMA */}
        <section className="border-y border-border bg-card/40">
          <div className="container mx-auto grid gap-10 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                O problema não é falta de conta.
                <br />É falta de tabela.
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Quase todo seller já montou uma planilha. O problema não é a matemática, é a
                fonte dos números.
              </p>
              <p>
                A comissão da Shopee muda por faixa de preço. O frete do Magalu muda por faixa
                de peso e por nível de desconto. A Amazon cobra por categoria, e o frete depende
                de FBA, FBA Onsite ou DBA, e ainda da zona de entrega. O Mercado Livre tem custo
                fixo que some acima de R$79. A Shein cobra por peso cubado, que não é o peso da
                balança.
              </p>
              <p className="border-l-2 border-primary pl-4 text-foreground">
                Sua planilha tem um número. A plataforma tem uma tabela.
              </p>
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES COM VÍDEO */}
        <section id="como" className="container mx-auto px-4 py-20">
          <div className="mb-14 max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              O que você faz dentro do Vetrex
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Cada bloco abaixo mostra a tela funcionando de verdade.
            </p>
          </div>

          <div className="space-y-20 lg:space-y-24">
            <VideoFeature
              numero="01"
              titulo="Uma calculadora por marketplace, com a regra daquele marketplace"
              descricao={
                <p>
                  Shopee, Mercado Livre, Amazon, Magalu, TikTok Shop e Shein. Cada uma com as
                  faixas de comissão, tabela de frete e taxa fixa que a plataforma usa de
                  verdade. Você entra com custo, preço e peso. Em segundos sabe o que sobra.
                </p>
              }
              video="/videos/calculadora.mp4"
            />

            <VideoFeature
              numero="02"
              titulo="O comparador"
              invertido
              descricao={
                <p>
                  Um formulário, seis resultados lado a lado, ordenados por lucro. Cada linha
                  mostra a premissa usada, porque comparação que esconde a premissa engana. Foi
                  assim que apareceu a diferença do começo desta página.
                </p>
              }
              destaque="R$49 de diferença por unidade no mesmo produto."
              video="/videos/comparador.mp4"
            />

            <VideoFeature
              numero="03"
              titulo="Precificação reversa"
              descricao={
                <>
                  <p>
                    Você não chuta mais. Arrasta a barra até a margem que quer, de 0 a 50%, e o
                    preço aparece.
                  </p>
                  <p>
                    Com custo de R$40 na Shopee, 15% de margem dá R$77,20. E 20% dá R$96,56,
                    porque entre R$80 e R$96 a comissão muda de faixa e não existe preço nesse
                    intervalo que entregue 20%. Uma planilha comum não enxerga esse degrau.
                  </p>
                </>
              }
              video="/videos/precificacao-reversa.mp4"
            />

            <VideoFeature
              numero="04"
              titulo="Calculadora de anúncios"
              invertido
              descricao={
                <p>
                  Margem de 20% significa ROAS de equilíbrio 5. Abaixo disso o anúncio come o
                  lucro inteiro. O Vetrex mostra o teto de ACOS do produto, pergunta se você
                  quer girar estoque ou lucrar mais, e diz o ROAS para mirar em cada caso.
                </p>
              }
              destaque="Campanha em ROAS 4,1 com margem de 20% tira 4,39 pontos do seu bolso por venda."
              video="/videos/ads.mp4"
            />

            <VideoFeature
              numero="05"
              titulo="Painel do seu estoque"
              descricao={
                <p>
                  Cada produto salvo guarda a quantidade em estoque. O painel soma quanto
                  dinheiro está parado, quanto vale se vender tudo e quanto sobra de lucro. Os
                  produtos aparecem ordenados do pior para o melhor, para o problema aparecer
                  primeiro.
                </p>
              }
              video="/videos/dashboard.mp4"
            />

            <VideoFeature
              numero="06"
              titulo="Imposto do seu regime, não um chute"
              invertido
              descricao={
                <p>
                  Você escolhe entre MEI, Simples Nacional, Lucro Presumido ou pessoa física. No
                  Simples, informa o anexo e o faturamento de 12 meses e o sistema calcula a
                  alíquota efetiva pela fórmula oficial.
                </p>
              }
              destaque="Com R$300 mil no Anexo I dá 5,32%, não os 7,3% da tabela."
              video="/videos/perfil.mp4"
            />

            <VideoFeature
              numero="07"
              titulo="RPA de afiliados da Shopee"
              descricao={
                <p>
                  Sobe o relatório mensal, sai um recibo por afiliado em PDF, com INSS e IRRF
                  calculados. Quem trabalha com o Programa de Afiliados sabe o tempo que isso
                  toma na mão.
                </p>
              }
              video="/videos/rpa.mp4"
            />
          </div>
        </section>

        {/* TAXA MUDA */}
        <section className="border-y border-border bg-card/40">
          <div className="container mx-auto px-4 py-16 lg:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <TrendingDown className="mx-auto mb-5 h-8 w-8 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                Quando a taxa muda, seus produtos mudam junto
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                As taxas ficam no sistema, não no seu arquivo. Quando um marketplace altera uma
                regra, os produtos que você salvou são recalculados e você recebe o aviso com a
                margem de antes e a de depois. Você fica sabendo antes do repasse, não depois.
              </p>
            </div>
          </div>
        </section>

        {/* DEPOIMENTOS */}
        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-5 md:grid-cols-3">
            {DEPOIMENTOS.map((d, i) => (
              <motion.figure
                key={d.nome}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-sm leading-relaxed text-foreground">
                  {d.texto}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <img src={d.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {d.nome}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.papel}
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </section>

        {/* PREÇO */}
        <section id="preco" className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-lg">
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
              />
              <div className="relative p-8">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  Acesso completo
                </p>

                <div className="mt-5 flex items-end gap-3">
                  <span className="text-sm text-muted-foreground line-through">R$197,00</span>
                  <span className="font-display text-5xl font-bold leading-none text-foreground">
                    R$97
                  </span>
                </div>
                <p className="mt-2 text-sm text-primary">
                  Pagamento único. Sem mensalidade.
                </p>

                <ul className="mt-7 space-y-2.5">
                  {INCLUSO.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className="mt-8 w-full gap-2 py-6 text-base"
                  onClick={() => navigate("/auth")}
                >
                  Quero ver onde meu produto lucra mais
                  <ArrowRight className="h-5 w-5" />
                </Button>

                <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="text-foreground">Garantia de 7 dias.</span> Entra, calcula
                    seus produtos, e se não encontrar dinheiro que estava escapando, devolvemos.
                    Sem burocracia.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* P.S. */}
        <section className="border-t border-border">
          <div className="container mx-auto max-w-3xl px-4 py-14">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="text-foreground">P.S.</span> Se você está começando, o Vetrex
              evita o erro que a maioria comete na primeira semana: colocar preço olhando o
              concorrente, sem saber o que a plataforma desconta. Se você já vende, ele confirma
              se o que você calcula está certo, e mostra os produtos da sua lista que estão
              saindo no prejuízo agora.
            </p>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-8 text-center">
            <img src={logo} alt="Vetrex" className="hidden h-7 w-auto dark:block" />
            <img src={logoLight} alt="Vetrex" className="block h-7 w-auto dark:hidden" />
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Vetrex. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
