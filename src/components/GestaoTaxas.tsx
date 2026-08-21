import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformFees } from "@/hooks/usePlatformFees";
import { PLATFORM_KEYS, PLATFORM_LABELS, TAXAS_PADRAO } from "@/lib/pricing";
import type { PlatformKey } from "@/lib/pricing/types";
import { recalcularCarteira, type ResultadoRecalculo } from "@/lib/pricing/recalcular";
import type { ProdutoSalvo } from "@/lib/carteira";

export const GestaoTaxas = () => {
  const { taxas, versoes, carregando, recarregar } = usePlatformFees();
  const [plataforma, setPlataforma] = useState<PlatformKey>("shopee");
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [previa, setPrevia] = useState<ResultadoRecalculo | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const configAtual = useMemo(
    () => taxas[plataforma] ?? TAXAS_PADRAO[plataforma],
    [taxas, plataforma],
  );

  const textoAtual = useMemo(
    () => JSON.stringify(configAtual, null, 2),
    [configAtual],
  );

  const texto = rascunho ?? textoAtual;

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, valor: JSON.parse(texto) };
    } catch (e) {
      return { ok: false as const, erro: (e as Error).message };
    }
  }, [texto]);

  const trocarPlataforma = (v: string) => {
    setPlataforma(v as PlatformKey);
    setRascunho(null);
    setPrevia(null);
  };

  const buscarCarteiras = async (): Promise<ProdutoSalvo[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("saved_calculations")
      .select("*")
      .eq("platform", PLATFORM_LABELS[plataforma]);
    if (error) throw error;
    return (data ?? []) as ProdutoSalvo[];
  };

  const preVisualizar = async () => {
    if (!parsed.ok) return;
    setOcupado(true);
    try {
      const produtos = await buscarCarteiras();
      setPrevia(recalcularCarteira(produtos, { [plataforma]: parsed.valor }));
    } catch (e) {
      console.error("Erro ao pré-visualizar impacto:", e);
      toast.error("Não foi possível ler as carteiras para simular o impacto.");
    }
    setOcupado(false);
  };

  const salvarERecalcular = async () => {
    if (!parsed.ok || !previa) return;
    setOcupado(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email ?? null;
      // Tira os separadores do ISO e sobra só o carimbo: v20260821143022.
      // Usa \D em vez de listar hífen, dois pontos e T numa classe de
      // caracteres: o Tailwind varre este arquivo inteiro atrás de classes,
      // comentários incluídos, e um colchete com dois pontos no meio vira
      // propriedade arbitrária, gerando regra morta e aviso de CSS no build.
      // No recorte ISO todo separador é não dígito, então o resultado é igual.
      const versao = `v${new Date().toISOString().slice(0, 19).replace(/\D/g, "")}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      await sb.from("platform_fees")
        .update({ active: false })
        .eq("platform", plataforma)
        .eq("active", true);

      const { error: erroInsert } = await sb.from("platform_fees").insert({
        platform: plataforma,
        version: versao,
        config: parsed.valor,
        active: true,
        created_by: email,
      });
      if (erroInsert) throw erroInsert;

      const agora = new Date().toISOString();
      for (const m of previa.mudancas) {
        const { error } = await sb
          .from("saved_calculations")
          .update({
            previous_margin_percent: m.margemAntes,
            profit_margin_percent: m.margemDepois,
            profit_margin_value: m.lucroDepois,
            fee_version: versao,
            recalculated_at: agora,
          })
          .eq("id", m.produto.id);
        if (error) throw error;
      }

      toast.success(
        `Taxas da ${PLATFORM_LABELS[plataforma]} atualizadas. ` +
          `${previa.mudancas.length} produto(s) recalculado(s).`,
      );
      setRascunho(null);
      setPrevia(null);
      recarregar();
    } catch (e) {
      console.error("Erro ao salvar taxas:", e);
      toast.error("Erro ao salvar. Nada foi alterado nas carteiras.");
    }
    setOcupado(false);
  };

  const versao = versoes[plataforma];

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base">Taxas dos marketplaces</CardTitle>
        <p className="text-sm text-muted-foreground">
          Alterar uma taxa muda a margem de todos os produtos já salvos pelos clientes.
          Veja o impacto antes de confirmar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Plataforma</Label>
            <Select value={plataforma} onValueChange={trocarPlataforma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORM_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>{PLATFORM_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Versão em uso</Label>
            <p className="pt-2 text-sm text-muted-foreground">
              {carregando
                ? "Carregando…"
                : versao
                  ? `${versao.version} · ${new Date(versao.created_at).toLocaleDateString("pt-BR")}`
                  : "Tabela do código (nenhuma versão no banco)"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="taxas-json">Configuração</Label>
          <Textarea
            id="taxas-json"
            value={texto}
            onChange={(e) => { setRascunho(e.target.value); setPrevia(null); }}
            spellCheck={false}
            className="h-80 font-mono text-xs"
          />
          {!parsed.ok && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              JSON inválido: {parsed.erro}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={preVisualizar}
            disabled={!parsed.ok || ocupado || rascunho === null}>
            {ocupado && !previa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ver impacto
          </Button>
          <Button onClick={salvarERecalcular} disabled={!previa || ocupado}>
            {ocupado && previa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar e recalcular
          </Button>
          {rascunho !== null && (
            <Button variant="ghost" onClick={() => { setRascunho(null); setPrevia(null); }}
              disabled={ocupado}>
              Descartar
            </Button>
          )}
        </div>

        {previa && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <p className="mb-2 font-medium text-foreground">
              Impacto em {PLATFORM_LABELS[plataforma]}
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>{previa.totalAvaliados} produto(s) salvos nesta plataforma</li>
              <li className={previa.mudancas.length ? "text-foreground" : undefined}>
                {previa.mudancas.length} teriam a margem alterada
              </li>
              <li
                className={
                  previa.mudancas.some((m) => m.virouPrejuizo)
                    ? "text-destructive"
                    : undefined
                }
              >
                {previa.mudancas.filter((m) => m.virouPrejuizo).length} passariam a vender
                no prejuízo
              </li>
              {previa.naoRecalculaveis.length > 0 && (
                <li className="text-warning">
                  {previa.naoRecalculaveis.length} não podem ser recalculados: foram salvos
                  antes de o sistema guardar as entradas do cálculo
                </li>
              )}
            </ul>
            {previa.mudancas.length === 0 && previa.naoRecalculaveis.length === 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" />
                Nenhuma carteira é afetada por esta mudança.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
