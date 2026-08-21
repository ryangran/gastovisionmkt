import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarketplaceLogo, type MarketplaceKey } from "@/components/MarketplaceLogo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoHorizontal from "@/assets/logo-horizontal.png";
import logoHorizontalLight from "@/assets/logo-horizontal-light.png";

import {
  FATURAMENTOS,
  OBJETIVOS,
  PLATAFORMAS,
  PRECIFICACAO,
  RESPOSTAS_VAZIAS,
  TEMPOS,
  URGENCIAS,
  type Opcao,
  type RespostasMentoria,
} from "@/lib/mentoria/perguntas";
import {
  emailValido,
  formatarTelefone,
  linkWhatsApp,
  soNumeros,
  telefoneValido,
} from "@/lib/mentoria/whatsapp";

const PASSOS = [
  { titulo: "Como falo com você", legenda: "Só o necessário para te achar" },
  { titulo: "Seu negócio hoje", legenda: "Para eu já chegar com contexto" },
  { titulo: "Onde você quer chegar", legenda: "A parte que mais importa" },
];

const DOR_MINIMA = 15;

/* ------------------------------------------------------------------ campos */

interface EscolhasProps {
  opcoes: readonly Opcao[];
  valor: string | string[];
  onEscolher: (valor: string) => void;
  colunas?: string;
}

/**
 * Botões de escolha. Serve para uma opção só e para várias, porque o que muda
 * é apenas como o componente pai guarda o valor.
 */
const Escolhas = ({ opcoes, valor, onEscolher, colunas = "sm:grid-cols-2" }: EscolhasProps) => {
  const marcado = (v: string) => (Array.isArray(valor) ? valor.includes(v) : valor === v);

  return (
    <div className={cn("grid gap-2", colunas)}>
      {opcoes.map((o) => {
        const ativo = marcado(o.valor);
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => onEscolher(o.valor)}
            aria-pressed={ativo}
            className={cn(
              "group rounded-lg border px-4 py-3 text-left transition-all",
              ativo
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <span className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  ativo ? "border-primary bg-primary" : "border-muted-foreground/40",
                )}
              >
                {ativo && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    ativo ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {o.rotulo}
                </span>
                {o.ajuda && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{o.ajuda}</span>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface CampoProps {
  htmlFor: string;
  rotulo: string;
  obrigatorio?: boolean;
  ajuda?: string;
  children: ReactNode;
}

const Campo = ({ htmlFor, rotulo, obrigatorio, ajuda, children }: CampoProps) => (
  <div className="space-y-2">
    <Label htmlFor={htmlFor} className="text-sm">
      {rotulo}
      {!obrigatorio && <span className="ml-1.5 text-xs text-muted-foreground">(opcional)</span>}
    </Label>
    {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
    {children}
  </div>
);

const Erro = ({ texto }: { texto?: string }) =>
  texto ? <p className="text-xs text-destructive">{texto}</p> : null;

/** Preto com os halos vermelhos da marca, o mesmo tratamento do resto do app. */
const Fundo = ({ children }: { children: ReactNode }) => (
  <div className="relative min-h-screen bg-background">
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-primary/[0.06]"
    />
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(1100px 700px at 85% 12%, hsl(var(--primary) / 0.08), transparent 65%), radial-gradient(900px 600px at 10% 78%, hsl(var(--primary) / 0.06), transparent 65%)",
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

const Pitch = () => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    className="lg:sticky lg:top-16 lg:self-start"
  >
    <p className="font-mono text-xs tracking-[0.3em] text-primary">MENTORIA VETREX</p>
    <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
      Antes de falar em mentoria, a gente faz um diagnóstico gratuito
    </h1>
    <p className="mt-5 text-base leading-relaxed text-muted-foreground">
      Vender bem e não sobrar nada no fim do mês quase nunca é um problema só. É comissão, frete,
      imposto, anúncio e embalagem se acumulando em lugares que a sua planilha não mostra juntos.
      Sem olhar seus números, qualquer conselho que eu desse seria chute.
    </p>
    <p className="mt-4 text-base leading-relaxed text-muted-foreground">
      Por isso o primeiro passo é o diagnóstico, e ele não custa nada. Responda as perguntas ao
      lado e eu chego na conversa já sabendo do seu caso, em vez de te fazer contar tudo de novo.
    </p>

    <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      O que a gente olha junto
    </p>
    <ul className="mt-3 space-y-3">
      {[
        "Onde a margem some entre o preço e o repasse",
        "Qual marketplace faz sentido para o seu produto",
        "Quanto de anúncio o seu produto aguenta antes de dar prejuízo",
        "Quais dos seus produtos estão saindo no prejuízo agora",
      ].map((item) => (
        <li key={item} className="flex gap-3 text-sm text-foreground">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          {item}
        </li>
      ))}
    </ul>

    <p className="mt-8 border-l-2 border-primary pl-4 text-sm text-muted-foreground">
      O formulário leva menos de dois minutos. O diagnóstico é gratuito e sem compromisso.
    </p>
  </motion.section>
);

/* -------------------------------------------------------------------- página */

const Mentoria = () => {
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<RespostasMentoria>(RESPOSTAS_VAZIAS);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [tentouAvancar, setTentouAvancar] = useState(false);
  /** Isca para robô. Formulário aberto ao público sem login precisa disso. */
  const [isca, setIsca] = useState("");

  const setar = <K extends keyof RespostasMentoria>(campo: K, valor: RespostasMentoria[K]) =>
    setRespostas((r) => ({ ...r, [campo]: valor }));

  const alternar = (campo: "plataformas" | "objetivos", valor: string) =>
    setRespostas((r) => {
      const atual = r[campo];
      return {
        ...r,
        [campo]: atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor],
      };
    });

  const erros = useMemo(() => {
    const e: Partial<Record<keyof RespostasMentoria, string>> = {};
    if (respostas.nome.trim().length < 2) e.nome = "Escreva seu nome";
    if (!telefoneValido(respostas.telefone)) e.telefone = "Telefone com DDD, como (11) 94480-4280";
    if (!emailValido(respostas.email)) e.email = "Esse email parece incompleto";
    if (!respostas.faturamento) e.faturamento = "Escolha uma faixa";
    if (!respostas.plataformas.length) e.plataformas = "Marque pelo menos uma";
    if (!respostas.tempo_vendendo) e.tempo_vendendo = "Escolha uma opção";
    if (!respostas.precifica_hoje) e.precifica_hoje = "Escolha uma opção";
    if (!respostas.urgencia) e.urgencia = "Escolha uma opção";
    if (respostas.dor.trim().length < DOR_MINIMA) e.dor = "Conte um pouco mais, em uma frase";
    return e;
  }, [respostas]);

  const camposDoPasso: (keyof RespostasMentoria)[][] = [
    ["nome", "telefone", "email"],
    ["faturamento", "plataformas", "tempo_vendendo", "precifica_hoje"],
    ["urgencia", "dor"],
  ];

  const passoValido = camposDoPasso[passo].every((c) => !erros[c]);
  const erro = (campo: keyof RespostasMentoria) =>
    tentouAvancar && erros[campo] ? erros[campo] : undefined;

  const avancar = () => {
    if (!passoValido) {
      setTentouAvancar(true);
      return;
    }
    setTentouAvancar(false);
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  };

  const voltar = () => {
    setTentouAvancar(false);
    setPasso((p) => Math.max(p - 1, 0));
  };

  const link = useMemo(() => linkWhatsApp(respostas), [respostas]);

  const enviar = async () => {
    if (Object.keys(erros).length) {
      setTentouAvancar(true);
      return;
    }
    setEnviando(true);

    // Robô preencheu o campo escondido: finge que deu certo e não grava nada.
    if (isca.trim()) {
      setEnviando(false);
      setEnviado(true);
      return;
    }

    // O cast existe porque os tipos gerados do Supabase só ganham esta tabela
    // depois que a migration roda. Sem ele o build quebra no meio do caminho.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("mentoria_leads").insert({
      nome: respostas.nome.trim(),
      telefone: soNumeros(respostas.telefone),
      email: respostas.email.trim() || null,
      faturamento: respostas.faturamento,
      plataformas: respostas.plataformas,
      tempo_vendendo: respostas.tempo_vendendo,
      precifica_hoje: respostas.precifica_hoje,
      objetivos: respostas.objetivos,
      urgencia: respostas.urgencia,
      dor: respostas.dor.trim(),
    });

    setEnviando(false);

    if (error) {
      console.error("Erro ao gravar lead de mentoria:", error);
      // O contato não pode se perder por causa do banco. Segue para o WhatsApp
      // do mesmo jeito, que é o que a pessoa veio fazer aqui.
      toast.error("Não consegui salvar o formulário, mas vou te levar para a conversa.");
    }

    setEnviado(true);
  };

  /* ------------------------------------------------------------ confirmação */

  // Sem redirecionamento automático de propósito. A pessoa precisa ler o que
  // é o diagnóstico antes de abrir a conversa, senão chega no WhatsApp sem
  // saber o que foi que ela pediu.
  if (enviado) {
    return (
      <Fundo>
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-xl rounded-2xl border border-border bg-card/80 p-6 backdrop-blur sm:p-9"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <CalendarCheck className="h-7 w-7 text-primary" />
            </span>

            <p className="mt-6 font-mono text-xs tracking-[0.3em] text-primary">
              PRÓXIMO PASSO
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              Vamos marcar seu diagnóstico, e ele é gratuito
            </h1>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Recebi suas respostas, {respostas.nome.trim().split(" ")[0]}. Antes de qualquer
                conversa sobre mentoria, a gente senta e olha os seus números.
              </p>
              <p>
                No diagnóstico eu pego os produtos que você já vende e passo pela conta inteira:
                comissão, frete, imposto, embalagem e anúncio, plataforma por plataforma. No fim
                você enxerga onde a margem está indo embora e quanto sobra de verdade em cada
                marketplace.
              </p>
              <p>
                É de graça e sem compromisso. Se fizer sentido a gente trabalhar junto depois, eu
                te explico como funciona. Se não fizer, você fica com o diagnóstico do mesmo jeito.
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm text-foreground">
                Agora é só abrir o WhatsApp e enviar. Suas respostas já vão escritas na mensagem,
                então a gente começa direto pelo seu caso e marca o horário por lá.
              </p>
            </div>

            <Button asChild size="lg" className="mt-6 w-full gap-2">
              <a href={link}>
                <MessageCircle className="h-4 w-4" />
                Abrir o WhatsApp e marcar
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Respondo de segunda a sexta, no horário comercial.
            </p>
          </motion.div>
        </div>
      </Fundo>
    );
  }

  /* ------------------------------------------------------------- formulário */

  const progresso = ((passo + (passoValido ? 1 : 0)) / PASSOS.length) * 100;

  return (
    <Fundo>
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Vetrex">
            <img src={logoHorizontal} alt="Vetrex" className="hidden h-7 w-auto dark:block" />
            <img src={logoHorizontalLight} alt="Vetrex" className="block h-7 w-auto dark:hidden" />
          </Link>
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:py-16">
        <Pitch />

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="relative rounded-2xl border border-border bg-card/70 p-5 backdrop-blur sm:p-7"
        >
          <div className="mb-6">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-xs tracking-[0.25em] text-primary">
                PASSO {passo + 1} DE {PASSOS.length}
              </p>
              <p className="truncate text-xs text-muted-foreground">{PASSOS[passo].legenda}</p>
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold text-foreground sm:text-2xl">
              {PASSOS[passo].titulo}
            </h2>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${progresso}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Isca para robô: fora da tela e pulada por quem navega pelo teclado. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={isca}
            onChange={(e) => setIsca(e.target.value)}
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={passo}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {passo === 0 && (
                <>
                  <Campo htmlFor="nome" rotulo="Seu nome" obrigatorio>
                    <Input
                      id="nome"
                      value={respostas.nome}
                      onChange={(e) => setar("nome", e.target.value)}
                      placeholder="Como você quer ser chamado"
                      autoComplete="name"
                    />
                    <Erro texto={erro("nome")} />
                  </Campo>

                  <Campo htmlFor="telefone" rotulo="WhatsApp com DDD" obrigatorio>
                    <Input
                      id="telefone"
                      inputMode="tel"
                      value={respostas.telefone}
                      onChange={(e) => setar("telefone", formatarTelefone(e.target.value))}
                      placeholder="(11) 94480-4280"
                      autoComplete="tel"
                    />
                    <Erro texto={erro("telefone")} />
                  </Campo>

                  <Campo
                    htmlFor="email"
                    rotulo="Email"
                    ajuda="Só para eu te achar caso o WhatsApp não funcione."
                  >
                    <Input
                      id="email"
                      type="email"
                      value={respostas.email}
                      onChange={(e) => setar("email", e.target.value)}
                      placeholder="voce@email.com"
                      autoComplete="email"
                    />
                    <Erro texto={erro("email")} />
                  </Campo>
                </>
              )}

              {passo === 1 && (
                <>
                  <Campo htmlFor="faturamento" rotulo="Quanto você fatura por mês hoje" obrigatorio>
                    <Escolhas
                      opcoes={FATURAMENTOS}
                      valor={respostas.faturamento}
                      onEscolher={(v) => setar("faturamento", v)}
                    />
                    <Erro texto={erro("faturamento")} />
                  </Campo>

                  <Campo
                    htmlFor="plataformas"
                    rotulo="Onde você vende ou quer vender"
                    obrigatorio
                    ajuda="Pode marcar quantas quiser."
                  >
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {PLATAFORMAS.map((p) => {
                        const ativo = respostas.plataformas.includes(p.valor);
                        return (
                          <button
                            key={p.valor}
                            type="button"
                            onClick={() => alternar("plataformas", p.valor)}
                            aria-pressed={ativo}
                            className={cn(
                              "flex flex-col items-center justify-center gap-2 rounded-lg border px-2 py-4 transition-all",
                              ativo
                                ? "border-primary bg-primary/10"
                                : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
                            )}
                          >
                            <MarketplaceLogo
                              platform={p.valor as MarketplaceKey}
                              className="h-5 w-auto max-w-[76px] object-contain"
                            />
                            <span
                              className={cn(
                                "text-[11px] font-medium",
                                ativo ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {p.rotulo}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <Erro texto={erro("plataformas")} />
                  </Campo>

                  <Campo htmlFor="tempo" rotulo="Há quanto tempo você vende" obrigatorio>
                    <Escolhas
                      opcoes={TEMPOS}
                      valor={respostas.tempo_vendendo}
                      onEscolher={(v) => setar("tempo_vendendo", v)}
                    />
                    <Erro texto={erro("tempo_vendendo")} />
                  </Campo>

                  <Campo htmlFor="precifica" rotulo="Como você define seu preço hoje" obrigatorio>
                    <Escolhas
                      opcoes={PRECIFICACAO}
                      valor={respostas.precifica_hoje}
                      onEscolher={(v) => setar("precifica_hoje", v)}
                    />
                    <Erro texto={erro("precifica_hoje")} />
                  </Campo>
                </>
              )}

              {passo === 2 && (
                <>
                  <Campo
                    htmlFor="dor"
                    rotulo="Qual a sua maior dificuldade nos marketplaces hoje"
                    obrigatorio
                    ajuda="Escreva do seu jeito. Quanto mais específico, melhor eu te ajudo."
                  >
                    <Textarea
                      id="dor"
                      rows={5}
                      maxLength={2000}
                      value={respostas.dor}
                      onChange={(e) => setar("dor", e.target.value)}
                      placeholder="Ex: vendo bem na Shopee mas no fim do mês não sobra nada, e não sei se o problema é o preço, o frete ou o anúncio."
                    />
                    <div className="flex items-center justify-between gap-3">
                      <Erro texto={erro("dor")} />
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {respostas.dor.length}/2000
                      </span>
                    </div>
                  </Campo>

                  <Campo
                    htmlFor="objetivos"
                    rotulo="O que você quer resolver"
                    ajuda="Marque quantas quiser."
                  >
                    <Escolhas
                      opcoes={OBJETIVOS}
                      valor={respostas.objetivos}
                      onEscolher={(v) => alternar("objetivos", v)}
                      colunas="sm:grid-cols-1"
                    />
                  </Campo>

                  <Campo htmlFor="urgencia" rotulo="Para quando" obrigatorio>
                    <Escolhas
                      opcoes={URGENCIAS}
                      valor={respostas.urgencia}
                      onEscolher={(v) => setar("urgencia", v)}
                      colunas="sm:grid-cols-3"
                    />
                    <Erro texto={erro("urgencia")} />
                  </Campo>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
            {passo > 0 && (
              <Button type="button" variant="ghost" onClick={voltar} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}

            {passo < PASSOS.length - 1 ? (
              <Button type="button" onClick={avancar} className="ml-auto gap-2">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={enviar}
                disabled={enviando}
                size="lg"
                className="ml-auto gap-2"
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Quero meu diagnóstico
                  </>
                )}
              </Button>
            )}
          </div>

          {tentouAvancar && !passoValido && (
            <p className="mt-3 text-right text-xs text-destructive">
              Falta preencher algum campo acima.
            </p>
          )}
        </motion.section>
      </main>
    </Fundo>
  );
};

export default Mentoria;
