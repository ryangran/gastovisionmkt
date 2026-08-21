import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  GraduationCap,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  FATURAMENTOS,
  OBJETIVOS,
  PLATAFORMAS,
  PRECIFICACAO,
  STATUS_LEAD,
  TEMPOS,
  URGENCIAS,
  rotuloDe,
  rotulosDe,
  type StatusLead,
} from "@/lib/mentoria/perguntas";
import { formatarTelefone } from "@/lib/mentoria/whatsapp";

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  faturamento: string;
  plataformas: string[];
  tempo_vendendo: string;
  precifica_hoje: string;
  objetivos: string[];
  urgencia: string;
  dor: string;
  status: StatusLead;
  observacoes: string;
  created_at: string;
}

/** Cor do selo por status. Vermelho só para o que exige ação. */
const COR_STATUS: Record<StatusLead, string> = {
  novo: "bg-primary/15 text-primary border-primary/30",
  contatado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  respondeu: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  fechado: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  perdido: "bg-muted text-muted-foreground border-border",
};

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

const horaCurta = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Quantos dias se passaram desde que o lead chegou. */
const diasDesde = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export const MentoriaLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<StatusLead | "todos">("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [paraApagar, setParaApagar] = useState<Lead | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("mentoria_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar leads de mentoria:", error);
      toast.error("Não consegui carregar os leads.");
      setLeads([]);
    } else {
      setLeads((data ?? []) as Lead[]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const atualizar = async (id: string, campos: Partial<Pick<Lead, "status" | "observacoes">>) => {
    // Otimista: a lista responde na hora e volta atrás se o banco recusar.
    const anterior = leads;
    setLeads((atual) => atual.map((l) => (l.id === id ? { ...l, ...campos } : l)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("mentoria_leads")
      .update(campos)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar lead:", error);
      toast.error("Não consegui salvar a alteração.");
      setLeads(anterior);
    }
  };

  const apagar = async (lead: Lead) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("mentoria_leads").delete().eq("id", lead.id);
    if (error) {
      console.error("Erro ao apagar lead:", error);
      toast.error("Não consegui apagar o lead.");
      return;
    }
    setLeads((atual) => atual.filter((l) => l.id !== lead.id));
    toast.success("Lead apagado.");
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leads.filter((l) => {
      if (filtro !== "todos" && l.status !== filtro) return false;
      if (!termo) return true;
      return (
        l.nome.toLowerCase().includes(termo) ||
        l.telefone.includes(termo.replace(/\D/g, "")) ||
        (l.email ?? "").toLowerCase().includes(termo) ||
        l.dor.toLowerCase().includes(termo)
      );
    });
  }, [leads, busca, filtro]);

  const stats = useMemo(
    () => ({
      total: leads.length,
      novos: leads.filter((l) => l.status === "novo").length,
      emAndamento: leads.filter((l) => l.status === "contatado" || l.status === "respondeu").length,
      fechados: leads.filter((l) => l.status === "fechado").length,
    }),
    [leads],
  );

  if (carregando) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: stats.total, cor: "text-foreground" },
          { label: "Novos", value: stats.novos, cor: "text-primary" },
          { label: "Em andamento", value: stats.emAndamento, cor: "text-blue-400" },
          { label: "Fechados", value: stats.fechados, cor: "text-emerald-400" },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="px-4 pb-3 pt-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 text-2xl font-bold", s.cor)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email ou dor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as StatusLead | "todos")}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_LEAD.map((s) => (
              <SelectItem key={s.valor} value={s.valor}>
                {s.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => void carregar()} aria-label="Recarregar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {leads.length === 0 ? "Nenhum lead ainda" : "Nada com esse filtro"}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {leads.length === 0
                ? "Os formulários enviados em /mentoria aparecem aqui, com todas as respostas."
                : "Tente outro termo ou volte para todos os status."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((lead) => {
            const expandido = aberto === lead.id;
            const dias = diasDesde(lead.created_at);
            const esfriando = lead.status === "novo" && dias >= 2;

            return (
              <Card
                key={lead.id}
                className={cn("border-border transition-colors", esfriando && "border-primary/40")}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{lead.nome}</p>
                        <Badge variant="outline" className={cn("text-[11px]", COR_STATUS[lead.status])}>
                          {rotuloDe(STATUS_LEAD, lead.status)}
                        </Badge>
                        {esfriando && (
                          <span className="text-[11px] font-medium text-primary">
                            {dias} dias sem contato
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatarTelefone(lead.telefone)}
                        {lead.email ? ` · ${lead.email}` : ""} · {dataCurta(lead.created_at)} às{" "}
                        {horaCurta(lead.created_at)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild size="sm" className="gap-1.5">
                        <a
                          href={`https://wa.me/55${lead.telefone}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Chamar
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Copiar telefone"
                        onClick={() => {
                          void navigator.clipboard.writeText(lead.telefone);
                          toast.success("Telefone copiado.");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={expandido ? "Recolher" : "Ver respostas"}
                        onClick={() => setAberto(expandido ? null : lead.id)}
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", expandido && "rotate-180")}
                        />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {rotuloDe(FATURAMENTOS, lead.faturamento)}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {rotuloDe(URGENCIAS, lead.urgencia)}
                    </Badge>
                    {rotulosDe(PLATAFORMAS, lead.plataformas).map((p) => (
                      <Badge key={p} variant="outline" className="text-[11px] font-normal">
                        {p}
                      </Badge>
                    ))}
                  </div>

                  {!expandido && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{lead.dor}</p>
                  )}

                  {expandido && (
                    <div className="mt-4 space-y-4 border-t border-border pt-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Maior dificuldade
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
                          {lead.dor}
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Vende há
                          </p>
                          <p className="mt-1 text-sm text-foreground">
                            {rotuloDe(TEMPOS, lead.tempo_vendendo)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Precifica hoje
                          </p>
                          <p className="mt-1 text-sm text-foreground">
                            {rotuloDe(PRECIFICACAO, lead.precifica_hoje)}
                          </p>
                        </div>
                      </div>

                      {lead.objetivos.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Quer resolver
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {rotulosDe(OBJETIVOS, lead.objetivos).map((o) => (
                              <li key={o} className="flex gap-2 text-sm text-foreground">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="space-y-1.5">
                          <Label htmlFor={`status-${lead.id}`} className="text-xs">
                            Status
                          </Label>
                          <Select
                            value={lead.status}
                            onValueChange={(v) => void atualizar(lead.id, { status: v as StatusLead })}
                          >
                            <SelectTrigger id={`status-${lead.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_LEAD.map((s) => (
                                <SelectItem key={s.valor} value={s.valor}>
                                  {s.rotulo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`obs-${lead.id}`} className="text-xs">
                            Suas anotações
                          </Label>
                          <Textarea
                            id={`obs-${lead.id}`}
                            rows={3}
                            defaultValue={lead.observacoes}
                            placeholder="O que ficou combinado, quando retornar..."
                            onBlur={(e) => {
                              if (e.target.value !== lead.observacoes) {
                                void atualizar(lead.id, { observacoes: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-destructive"
                          onClick={() => setParaApagar(lead)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Apagar lead
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={Boolean(paraApagar)} onOpenChange={(o) => !o && setParaApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar o lead de {paraApagar?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              As respostas e o telefone somem para sempre. Se for só para tirar da lista de
              pendências, use o status Perdido no lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (paraApagar) void apagar(paraApagar);
                setParaApagar(null);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
