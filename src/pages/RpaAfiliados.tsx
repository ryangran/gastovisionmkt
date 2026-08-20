import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { Building2, FileSpreadsheet, Save, Upload, FileDown, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useRpaEmpresas, EMPRESA_VAZIA, type SlotEmpresa } from "@/hooks/useRpaEmpresas";
import { INSS_TETO, TABELA_VIGENCIA } from "@/lib/rpa/impostos";
import {
  CAMPOS_RPA,
  detectarColunas,
  montarAfiliados,
  type Afiliado,
  type MapaColunas,
} from "@/lib/rpa/planilha";
import { gerarPdfIndividual, nomeArquivo, type EmpresaRpa } from "@/lib/rpa/pdf";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const SEM_COLUNA = "__nenhuma__";

const RpaAfiliados = () => {
  const { empresas, carregando, salvar } = useRpaEmpresas();
  const [slot, setSlot] = usePersistedState<SlotEmpresa>("rpa_slot", 1);
  const [rascunho, setRascunho] = usePersistedState<Record<string, EmpresaRpa>>(
    "rpa_rascunho",
    {},
  );
  const [salvando, setSalvando] = useState(false);

  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Array<Record<string, unknown>>>([]);
  const [mapa, setMapa] = useState<MapaColunas>({});
  const [nomeArquivoPlanilha, setNomeArquivoPlanilha] = useState("");
  const [referencia, setReferencia] = usePersistedState("rpa_referencia", "");
  const [gerando, setGerando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const salva = empresas[slot];
  const empresa = rascunho[String(slot)] ?? salva ?? EMPRESA_VAZIA;
  const temRascunho = Boolean(rascunho[String(slot)]);

  const editar = (mudanca: Partial<EmpresaRpa>) => {
    setRascunho((prev) => ({
      ...prev,
      [String(slot)]: { ...empresa, ...mudanca },
    }));
  };

  const gravar = async () => {
    setSalvando(true);
    const ok = await salvar(slot, empresa);
    setSalvando(false);
    if (ok) {
      setRascunho((prev) => {
        const copia = { ...prev };
        delete copia[String(slot)];
        return copia;
      });
    }
  };

  const lerPlanilha = async (arquivo: File) => {
    try {
      const buffer = await arquivo.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const aba = wb.Sheets[wb.SheetNames[0]];
      const dados = XLSX.utils.sheet_to_json<Record<string, unknown>>(aba, { defval: "" });

      if (dados.length === 0) {
        toast.error("A planilha está vazia.");
        return;
      }
      const cols = Object.keys(dados[0]);
      setCabecalhos(cols);
      setLinhas(dados);
      setMapa(detectarColunas(cols));
      setNomeArquivoPlanilha(arquivo.name);
    } catch (e) {
      console.error("Erro ao ler a planilha:", e);
      toast.error("Não foi possível ler o arquivo. Envie o .csv do Relatório Mensal.");
    }
  };

  const resultado = useMemo(() => montarAfiliados(linhas, mapa), [linhas, mapa]);
  const afiliados: Afiliado[] = resultado.afiliados;

  const faltando = CAMPOS_RPA.filter((c) => c.obrigatorio && !mapa[c.chave]);
  const empresaPronta = Boolean(empresa.razaoSocial.trim() && empresa.cnpj.trim());
  const podeGerar =
    afiliados.length > 0 && faltando.length === 0 && empresaPronta && !gerando;

  const gerar = async () => {
    if (!referencia.trim()) {
      toast.error("Informe o mês de referência.");
      return;
    }
    setGerando(true);
    try {
      const zip = new JSZip();
      const usados = new Map<string, number>();

      for (const afiliado of afiliados) {
        const blob = gerarPdfIndividual(afiliado, empresa, referencia.trim());
        let nome = nomeArquivo(afiliado);
        // Homônimos não podem sobrescrever o arquivo um do outro dentro do ZIP.
        const vezes = usados.get(nome) ?? 0;
        usados.set(nome, vezes + 1);
        if (vezes > 0) nome = nome.replace(/\.pdf$/, ` (${vezes + 1}).pdf`);
        zip.file(nome, blob);
      }

      const conteudo = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(conteudo);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RPAs ${referencia.trim()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${afiliados.length} RPA(s) gerados.`);
    } catch (e) {
      console.error("Erro ao gerar os RPAs:", e);
      toast.error("Erro ao gerar os arquivos.");
    }
    setGerando(false);
  };

  const totalBruto = afiliados.reduce((s, a) => s + a.valorBruto, 0);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">RPA de afiliados</h1>
        <p className="text-sm text-muted-foreground">
          Recibo de pagamento a autônomo para o Programa de Afiliados do Vendedor
        </p>
      </header>

      <div className="space-y-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" />
                1. Dados da empresa (tomador dos serviços)
              </CardTitle>
              <div className="flex rounded-lg border border-border p-0.5">
                {([1, 2] as SlotEmpresa[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      slot === s
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Empresa {s}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ficam salvos no seu perfil e são reutilizados nas próximas gerações.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {carregando ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rpa-razao">Razão social *</Label>
                    <Input id="rpa-razao" value={empresa.razaoSocial}
                      onChange={(e) => editar({ razaoSocial: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rpa-cnpj">CNPJ *</Label>
                    <Input id="rpa-cnpj" value={empresa.cnpj}
                      onChange={(e) => editar({ cnpj: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rpa-endereco">Endereço completo</Label>
                  <Input id="rpa-endereco" value={empresa.endereco}
                    onChange={(e) => editar({ endereco: e.target.value })} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rpa-municipio">Município</Label>
                    <Input id="rpa-municipio" value={empresa.municipio}
                      onChange={(e) => editar({ municipio: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rpa-uf">UF</Label>
                    <Input id="rpa-uf" maxLength={2} value={empresa.uf}
                      onChange={(e) => editar({ uf: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rpa-cep">CEP</Label>
                    <Input id="rpa-cep" value={empresa.cep}
                      onChange={(e) => editar({ cep: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rpa-ie">Inscrição estadual</Label>
                    <Input id="rpa-ie" value={empresa.inscricaoEstadual}
                      onChange={(e) => editar({ inscricaoEstadual: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rpa-descricao">Descrição do serviço prestado</Label>
                  <Textarea id="rpa-descricao" value={empresa.descricaoServico}
                    onChange={(e) => editar({ descricaoServico: e.target.value })}
                    className="min-h-16" />
                </div>

                <div className="space-y-2">
                  <Label>Retenções aplicadas no RPA</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">INSS 11%</span>
                        <Switch checked={empresa.reterInss}
                          onCheckedChange={(v) => editar({ reterInss: v })} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Teto {formatCurrency(INSS_TETO)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">IRRF</span>
                        <Switch checked={empresa.reterIrrf}
                          onCheckedChange={(v) => editar({ reterIrrf: v })} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Tabela progressiva</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">ISS</span>
                        <Switch checked={empresa.reterIss}
                          onCheckedChange={(v) => editar({ reterIss: v })} />
                      </div>
                      <Input
                        className="mt-2 h-8"
                        inputMode="decimal"
                        value={String(empresa.issPercent)}
                        onChange={(e) =>
                          editar({ issPercent: parseFloat(e.target.value.replace(",", ".")) || 0 })
                        }
                        disabled={!empresa.reterIss}
                        aria-label="Alíquota de ISS em porcentagem"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Com todas as opções desligadas, o RPA sai apenas com o valor bruto para a
                    contabilidade calcular as retenções. As tabelas usadas são as de{" "}
                    {TABELA_VIGENCIA} — confirme as alíquotas e o enquadramento com o seu
                    contador.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={gravar} disabled={salvando} className="gap-2">
                    {salvando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar dados da empresa
                  </Button>
                  {temRascunho && (
                    <span className="text-xs text-warning">
                      Alterações não salvas — o rascunho fica guardado neste navegador até você
                      clicar em Salvar
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              2. Relatório mensal da Shopee
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Baixe em Afiliados do Vendedor › Relatórios › Relatório Mensal e envie o arquivo
              aqui.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => inputArquivo.current?.click()}
                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-4 py-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
              >
                <Upload className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {nomeArquivoPlanilha || "Selecionar planilha"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Arquivo .csv ou .xlsx do Relatório Mensal
                </span>
              </button>
              <input
                ref={inputArquivo}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) void lerPlanilha(arquivo);
                  e.target.value = "";
                }}
              />
              <div className="space-y-1.5">
                <Label htmlFor="rpa-ref">Mês de referência</Label>
                <Input id="rpa-ref" value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex.: Agosto de 2026" />
              </div>
            </div>

            {cabecalhos.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">Colunas da planilha</p>
                <p className="text-xs text-muted-foreground">
                  Confira o que foi reconhecido. Coluna errada gera recibo com valor errado.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CAMPOS_RPA.map((campo) => (
                    <div key={campo.chave} className="space-y-1.5">
                      <Label className="text-xs">
                        {campo.rotulo}
                        {campo.obrigatorio && " *"}
                      </Label>
                      <Select
                        value={mapa[campo.chave] ?? SEM_COLUNA}
                        onValueChange={(v) =>
                          setMapa((prev) => ({
                            ...prev,
                            [campo.chave]: v === SEM_COLUNA ? undefined : v,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Não usar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_COLUNA}>Não usar</SelectItem>
                          {cabecalhos.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 text-sm">
                  <p className="text-foreground">
                    {afiliados.length} afiliado(s) · {formatCurrency(totalBruto)} em comissões
                  </p>
                  {resultado.descartadas > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resultado.descartadas} linha(s) ignorada(s) por não ter nome ou por ter
                      valor zero.
                    </p>
                  )}
                  {faltando.length > 0 && (
                    <p className="mt-1 text-xs text-destructive">
                      Aponte a coluna de {faltando.map((c) => c.rotulo).join(" e ")} para
                      continuar.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={gerar} disabled={!podeGerar} className="gap-2">
                {gerando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                Gerar RPAs em massa ({afiliados.length})
              </Button>
              {!empresaPronta && (
                <span className="text-xs text-muted-foreground">
                  Preencha e salve os dados da empresa primeiro.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RpaAfiliados;
