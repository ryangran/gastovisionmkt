import {
  Edit,
  Infinity as Vitalicio,
  KeyRound,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  diasRestantes,
  ehLegado,
  rotuloCurto,
  situacao,
  type Situacao,
} from "@/lib/acesso/planoAdmin";
import { linkWhatsApp, pareceFixo } from "@/lib/telefone";

/**
 * Lista de contas em tabela, e não em cartões empilhados.
 *
 * Cartão por usuário lê bem com dez contas e vira rolagem infinita com
 * duzentas. Tabela deixa comparar plano e validade de várias linhas de uma
 * olhada, que é o que se faz de fato neste painel.
 *
 * As quatro ações saíram para um menu: quatro botões repetidos em cada linha
 * pesavam mais na tela que os dados que deveriam ser o assunto.
 */

export interface ContaAdmin {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  purchase_id: string | null;
  plan_type: string | null;
  expires_at: string | null;
  telefone: string | null;
}

interface TabelaUsuariosProps {
  contas: ContaAdmin[];
  emailAdmin: string;
  ocupado: string | null;
  onEditarPlano: (conta: ContaAdmin) => void;
  onAdicionarPlano: (conta: ContaAdmin) => void;
  onResetarSenha: (conta: ContaAdmin) => void;
  onExcluir: (conta: ContaAdmin) => void;
}

const ESTILO_SITUACAO: Record<Situacao, string> = {
  vitalicio: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  ativo: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  expirando: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  expirado: "border-destructive/40 bg-destructive/10 text-destructive",
  "sem-plano": "border-border bg-muted/40 text-muted-foreground",
};

const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

/** Coluna de validade: o que o admin precisa saber em uma olhada. */
const Validade = ({ conta }: { conta: ContaAdmin }) => {
  const s = situacao(conta);
  if (s === "sem-plano") return <span className="text-muted-foreground">—</span>;
  if (s === "vitalicio") {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Vitalicio className="h-3.5 w-3.5" />
        Sem validade
      </span>
    );
  }

  const dias = diasRestantes(conta.expires_at);
  if (dias === null) return <span className="text-muted-foreground">—</span>;

  return (
    <span className="tabular-nums">
      <span className={cn(s === "expirado" && "text-destructive", s === "expirando" && "text-orange-400")}>
        {dias <= 0 ? `venceu há ${Math.abs(dias)}d` : `${dias}d`}
      </span>
      <span className="ml-2 text-muted-foreground">{data(conta.expires_at)}</span>
    </span>
  );
};

/**
 * Telefone com atalho para a conversa. O botão é o motivo de a coluna existir:
 * dá para chamar a pessoa sem sair da lista e sem copiar número na mão.
 */
const Contato = ({ telefone, email }: { telefone: string | null; email: string }) => {
  if (!telefone) return <span className="text-muted-foreground">—</span>;

  const link = linkWhatsApp(
    telefone,
    `Olá! Aqui é da Vetrex, sobre a sua conta ${email}.`,
  );
  if (!link) {
    // Número guardado mas inválido: mostra para dar o que corrigir, sem
    // oferecer um botão que abriria conversa com o número errado.
    return <span className="text-muted-foreground line-through">{telefone}</span>;
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-foreground transition-colors hover:text-emerald-400"
      title={pareceFixo(telefone) ? "Número fixo — pode não ter WhatsApp" : "Abrir conversa"}
    >
      <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
      <span className="tabular-nums">{telefone}</span>
      {pareceFixo(telefone) && <span className="text-[10px] text-muted-foreground">fixo</span>}
    </a>
  );
};

export const TabelaUsuarios = ({
  contas,
  emailAdmin,
  ocupado,
  onEditarPlano,
  onAdicionarPlano,
  onResetarSenha,
  onExcluir,
}: TabelaUsuariosProps) => {
  if (contas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma conta com esses filtros.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[28%]">Conta</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead className="w-12 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {contas.map((conta) => {
            const s = situacao(conta);
            const ehAdmin = conta.email === emailAdmin;
            const legado = ehLegado(conta.plan_type);

            return (
              <TableRow key={conta.user_id} className="text-sm">
                <TableCell className="max-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-foreground">{conta.email}</span>
                    {ehAdmin && (
                      <Badge className="shrink-0 border-primary/30 bg-primary/15 text-[10px] text-primary">
                        Admin
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-xs">
                  <Contato telefone={conta.telefone} email={conta.email} />
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn("font-normal", ESTILO_SITUACAO[s])}>
                      {rotuloCurto(conta.plan_type)}
                    </Badge>
                    {legado && (
                      <span
                        className="text-[10px] uppercase tracking-wide text-muted-foreground"
                        title={`plan_type legado: ${conta.plan_type}`}
                      >
                        legado
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-xs">
                  <Validade conta={conta} />
                </TableCell>

                <TableCell className="text-xs tabular-nums text-muted-foreground">
                  {data(conta.created_at)}
                </TableCell>

                <TableCell className="text-xs tabular-nums text-muted-foreground">
                  {data(conta.last_sign_in_at)}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={ocupado === conta.user_id}
                        aria-label={`Ações de ${conta.email}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-52">
                      {conta.purchase_id && !ehAdmin && (
                        <DropdownMenuItem onClick={() => onEditarPlano(conta)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar plano
                        </DropdownMenuItem>
                      )}
                      {!conta.purchase_id && !ehAdmin && (
                        <DropdownMenuItem onClick={() => onAdicionarPlano(conta)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Dar um plano
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onResetarSenha(conta)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Resetar senha
                      </DropdownMenuItem>

                      {!ehAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onExcluir(conta)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir conta
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
