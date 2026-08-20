import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Save, User, Landmark, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePerfil, PERFIL_VAZIO, type Perfil as DadosPerfil } from "@/hooks/usePerfil";
import {
  REGIMES,
  SIMPLES_ANEXOS,
  definicaoRegime,
  faixaSimples,
  impostoSugerido,
  type AnexoSimples,
  type RegimeTributario,
} from "@/lib/perfil/regimes";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseNum(val: string): number {
  return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
}

function iniciais(nome: string, email: string): string {
  const base = nome.trim() || email;
  const partes = base.split(/[\s@.]+/).filter(Boolean);
  return (partes[0]?.[0] ?? "?").toUpperCase() + (partes[1]?.[0] ?? "").toUpperCase();
}

const Perfil = () => {
  const { perfil: salvo, carregando, salvar, enviarFoto } = usePerfil();
  const [form, setForm] = useState<DadosPerfil>(PERFIL_VAZIO);
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  /** Texto digitado no faturamento e no imposto, separado do número: campo
   *  controlado por número apaga a vírgula no meio da digitação. */
  const [rbtTexto, setRbtTexto] = useState<string | null>(null);
  const [impostoTexto, setImpostoTexto] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (salvo) setForm(salvo);
  }, [salvo]);

  useEffect(() => {
    void (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email ?? "");
    })();
  }, []);

  const definicao = definicaoRegime(form.regime);
  const sugerido = impostoSugerido({
    regime: form.regime,
    anexo: form.anexo ?? "I",
    rbt12: form.rbt12 ?? 0,
  });

  const editar = (mudanca: Partial<DadosPerfil>) => setForm((p) => ({ ...p, ...mudanca }));

  const trocarRegime = (v: string) => {
    const regime = v as RegimeTributario;
    const novo = impostoSugerido({
      regime,
      anexo: form.anexo ?? "I",
      rbt12: form.rbt12 ?? 0,
    });
    setImpostoTexto(null);
    editar({
      regime,
      anexo: regime === "simples" ? (form.anexo ?? "I") : null,
      // Regime que o sistema calcula sozinho define o imposto; os outros
      // preservam o que o contador informou.
      impostoPercent: novo !== null ? novo : form.impostoPercent,
    });
  };

  const recalcularSimples = (anexo: AnexoSimples, rbt12: number) => {
    const novo = impostoSugerido({ regime: "simples", anexo, rbt12 });
    setImpostoTexto(null);
    editar({ anexo, rbt12, impostoPercent: novo ?? form.impostoPercent });
  };

  const escolherFoto = async (arquivo: File) => {
    setEnviando(true);
    const url = await enviarFoto(arquivo);
    setEnviando(false);
    if (url) editar({ fotoUrl: url });
  };

  const gravar = async () => {
    setSalvando(true);
    const ok = await salvar(form);
    setSalvando(false);
    if (ok) {
      setRbtTexto(null);
      setImpostoTexto(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>
        <p className="text-sm text-muted-foreground">
          Seus dados e o regime tributário que a calculadora usa
        </p>
      </header>

      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Dados pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border border-border">
                {form.fotoUrl && <AvatarImage src={form.fotoUrl} alt={form.nome} />}
                <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                  {iniciais(form.nome, email)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => inputFoto.current?.click()}
                  disabled={enviando}
                >
                  {enviando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {form.fotoUrl ? "Trocar foto" : "Adicionar foto"}
                </Button>
                <p className="text-xs text-muted-foreground">JPG ou PNG, até 2 MB.</p>
              </div>
              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) void escolherFoto(arquivo);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="perfil-nome">Seu nome</Label>
                <Input id="perfil-nome" value={form.nome}
                  onChange={(e) => editar({ nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="perfil-loja">Nome da loja</Label>
                <Input id="perfil-loja" value={form.nomeLoja}
                  onChange={(e) => editar({ nomeLoja: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="perfil-tel">WhatsApp</Label>
                <Input id="perfil-tel" value={form.telefone}
                  onChange={(e) => editar({ telefone: e.target.value })}
                  placeholder="(11) 90000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={email} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-primary" />
              Regime tributário
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Define o imposto que a calculadora preenche sozinha em cada produto.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Como você vende</Label>
              <Select value={form.regime} onValueChange={trocarRegime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIMES.map((r) => (
                    <SelectItem key={r.chave} value={r.chave}>
                      {r.rotulo} — {r.resumo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {definicao.explicacao}
              </p>
            </div>

            {form.regime === "simples" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Anexo</Label>
                  <Select
                    value={form.anexo ?? "I"}
                    onValueChange={(v) => recalcularSimples(v as AnexoSimples, form.rbt12 ?? 0)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIMPLES_ANEXOS.map((a) => (
                        <SelectItem key={a.chave} value={a.chave}>{a.rotulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="perfil-rbt">Faturamento dos últimos 12 meses (R$)</Label>
                  <Input
                    id="perfil-rbt"
                    inputMode="decimal"
                    value={rbtTexto ?? (form.rbt12 ? String(form.rbt12) : "")}
                    onChange={(e) => {
                      const texto = e.target.value.replace(/[^\d,.]/g, "");
                      setRbtTexto(texto);
                      recalcularSimples(form.anexo ?? "I", parseNum(texto));
                    }}
                    placeholder="Ex.: 300000"
                  />
                  {form.rbt12 ? (
                    <p className="text-xs text-muted-foreground">
                      Faixa: nominal{" "}
                      {faixaSimples(form.anexo ?? "I", form.rbt12).nominal
                        .toLocaleString("pt-BR")}
                      % · dedução{" "}
                      {formatCurrency(faixaSimples(form.anexo ?? "I", form.rbt12).deducao)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Sem informar, usamos a primeira faixa.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="perfil-imposto">Imposto sobre a venda (%)</Label>
              <Input
                id="perfil-imposto"
                inputMode="decimal"
                value={impostoTexto ?? (form.impostoPercent ? String(form.impostoPercent).replace(".", ",") : "")}
                onChange={(e) => {
                  const texto = e.target.value.replace(/[^\d,.]/g, "");
                  setImpostoTexto(texto);
                  editar({ impostoPercent: parseFloat(texto.replace(",", ".")) || 0 });
                }}
                placeholder={definicao.calculaSozinho ? "Calculado pelo regime" : "Informe o percentual"}
              />
              {sugerido !== null ? (
                <p className="text-xs text-muted-foreground">
                  Calculado pelo seu regime:{" "}
                  <span className="text-foreground">
                    {sugerido.toLocaleString("pt-BR")}%
                  </span>
                  . Dá para ajustar se o seu contador orientar outro valor.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Este regime depende do seu enquadramento — confirme o percentual com o seu
                  contador.
                </p>
              )}
            </div>

            <Button onClick={gravar} disabled={salvando} className="gap-2">
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar perfil
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Perfil;
