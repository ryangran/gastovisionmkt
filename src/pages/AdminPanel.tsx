import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MentoriaLeads } from "@/components/admin/MentoriaLeads";
import { Button } from "@/components/ui/button";
import { GestaoTaxas } from "@/components/GestaoTaxas";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Search,
  LogOut,
  ArrowLeft,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface UserWithPurchase {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  purchase_id: string | null;
  plan_type: string | null;
  status: string | null;
  purchased_at: string | null;
  expires_at: string | null;
  product_name: string | null;
  telefone: string | null;
}

import { ResumoAssinaturas } from "@/components/admin/ResumoAssinaturas";
import { TabelaUsuarios, type ContaAdmin } from "@/components/admin/TabelaUsuarios";
import { nivelDoPlanType, situacao } from "@/lib/acesso/planoAdmin";
import { ORDEM_PLANOS, planoPorId, type PlanoId } from "@/lib/acesso/planos";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateSecurePassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroPlano, setFiltroPlano] = useState<PlanoId | "todos" | "sem-plano">("todos");
  // As ações saíram para um menu suspenso, então a confirmação não pode mais
  // ficar presa a um gatilho por linha: vira um diálogo só, controlado aqui.
  const [confirmar, setConfirmar] = useState<
    { tipo: "senha" | "excluir"; conta: ContaAdmin } | null
  >(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserWithPurchase | null }>({
    open: false,
    user: null,
  });
  const [editPlanType, setEditPlanType] = useState("plus");
  const [addPlanDialog, setAddPlanDialog] = useState<{ open: boolean; user: UserWithPurchase | null }>({
    open: false,
    user: null,
  });
  const [addPlanType, setAddPlanType] = useState("plus");
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState(() => generateSecurePassword());
  const [newUserPlanType, setNewUserPlanType] = useState("plus");

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Acesso restrito");
        navigate("/");
        return;
      }
      // Verify admin role via database RPC (not just email)
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!isAdmin && session.user.email !== ADMIN_EMAIL) {
        toast.error("Acesso restrito");
        navigate("/");
        return;
      }
      await loadUsers();
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.rpc("get_all_users_with_purchases");
    if (error) {
      console.error("Error loading users:", error);
      toast.error("Erro ao carregar usuários");
      return;
    }
    setUsers((data as UserWithPurchase[]) || []);
  };

  const invokeAdmin = async (action: string, userId?: string, data?: Record<string, unknown>) => {
    const { data: result, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action, userId, data },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    return result;
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === ADMIN_EMAIL) {
      toast.error("Não é possível excluir a conta admin");
      return;
    }
    setActionLoading(userId);
    try {
      await invokeAdmin("delete_user", userId);
      toast.success("Usuário excluído com sucesso");
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir usuário");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    setActionLoading(userId);
    try {
      const resposta = await invokeAdmin("reset_password", userId);
      const nova = (resposta as { password?: string } | undefined)?.password;
      if (nova) {
        await navigator.clipboard.writeText(nova).catch(() => undefined);
        // A senha aparece uma vez só. Não fica gravada em lugar nenhum, então
        // se fechar sem copiar é só resetar de novo.
        toast.success(`Senha nova: ${nova}`, {
          description: "Copiada para a área de transferência. Ela não aparece de novo.",
          duration: 30000,
        });
      } else {
        toast.success("Senha resetada. Peça para a pessoa usar 'Esqueci minha senha'.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao resetar senha");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditPurchase = async () => {
    if (!editDialog.user?.purchase_id) return;
    setActionLoading(editDialog.user.user_id);
    try {
      const updateData: Record<string, unknown> = {
        purchaseId: editDialog.user.purchase_id,
        plan_type: editPlanType,
      };
      if (editPlanType === "deluxe" || editPlanType === "lifetime") {
        updateData.expires_at = null;
      } else if (editPlanType === "daily") {
        const exp = new Date();
        exp.setDate(exp.getDate() + 1);
        updateData.expires_at = exp.toISOString();
      } else {
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);
        updateData.expires_at = exp.toISOString();
      }
      await invokeAdmin("update_purchase", undefined, updateData);
      toast.success("Plano atualizado");
      setEditDialog({ open: false, user: null });
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar plano");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddPlan = async () => {
    if (!addPlanDialog.user) return;
    setActionLoading(addPlanDialog.user.user_id);
    try {
      await invokeAdmin("create_purchase", undefined, {
        userEmail: addPlanDialog.user.email,
        plan_type: addPlanType,
      });
      toast.success("Plano adicionado");
      setAddPlanDialog({ open: false, user: null });
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar plano");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast.error("Preencha email e senha");
      return;
    }
    if (!EMAIL_REGEX.test(newUserEmail)) {
      toast.error("Email inválido");
      return;
    }
    if (newUserPassword.length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres");
      return;
    }
    setActionLoading("creating");
    try {
      await invokeAdmin("create_user", undefined, {
        email: newUserEmail,
        password: newUserPassword,
        plan_type: newUserPlanType,
      });
      toast.success("Usuário criado com sucesso");
      setCreateUserDialog(false);
      setNewUserEmail("");
      setNewUserPassword(generateSecurePassword());
      setNewUserPlanType("plus");
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuário");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  /** Quando a compra entrou. Linha antiga pode não ter purchased_at. */
  const quando = (u: UserWithPurchase) =>
    new Date(u.purchased_at ?? u.created_at ?? 0).getTime();

  // Uma linha por usuário, ficando com a compra MAIS RECENTE — que é a que o
  // banco considera vigente. Antes preferia a vitalícia, então o painel podia
  // mostrar e editar uma compra diferente da que valia de verdade.
  const groupedUsers = users.reduce((acc, user) => {
    const existing = acc.find((u) => u.user_id === user.user_id);
    if (!existing) {
      acc.push(user);
      return acc;
    }
    if (user.purchase_id && (!existing.purchase_id || quando(user) > quando(existing))) {
      acc[acc.indexOf(existing)] = user;
    }
    return acc;
  }, [] as UserWithPurchase[]);

  const filtered = groupedUsers.filter((u) => {
    if (!u.email?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filtroPlano === "todos") return true;
    if (filtroPlano === "sem-plano") return situacao(u) === "sem-plano";
    return nivelDoPlanType(u.plan_type) === filtroPlano;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">Gerenciamento de Usuários</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="mentoria">Mentoria</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-6">
        <ResumoAssinaturas contas={groupedUsers} />

        {/* Busca, filtro e ações */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filtroPlano}
            onValueChange={(v) => setFiltroPlano(v as PlanoId | "todos" | "sem-plano")}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os planos</SelectItem>
              {ORDEM_PLANOS.map((id) => (
                <SelectItem key={id} value={id}>
                  {planoPorId(id).nome}
                </SelectItem>
              ))}
              <SelectItem value="sem-plano">Sem plano</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button onClick={() => setCreateUserDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova conta
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Atualizar lista"
              onClick={() => { setLoading(true); loadUsers().finally(() => setLoading(false)); }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabelaUsuarios
          contas={filtered}
          emailAdmin={ADMIN_EMAIL}
          ocupado={actionLoading}
          onEditarPlano={(conta) => {
            setEditPlanType(conta.plan_type || "plus");
            setEditDialog({ open: true, user: conta as UserWithPurchase });
          }}
          onAdicionarPlano={(conta) => {
            setAddPlanType("plus");
            setAddPlanDialog({ open: true, user: conta as UserWithPurchase });
          }}
          onResetarSenha={(conta) => setConfirmar({ tipo: "senha", conta })}
          onExcluir={(conta) => setConfirmar({ tipo: "excluir", conta })}
        />

        <GestaoTaxas />
          </TabsContent>

          <TabsContent value="mentoria">
            <MentoriaLeads />
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirmação de senha e exclusão. Um diálogo só, porque as ações agora
          saem de um menu e não de um gatilho por linha. */}
      <AlertDialog
        open={confirmar !== null}
        onOpenChange={(aberto) => !aberto && setConfirmar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmar?.tipo === "excluir" ? "Excluir conta?" : "Resetar a senha?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar?.tipo === "excluir" ? (
                <>
                  A conta <strong>{confirmar?.conta.email}</strong> e todos os dados dela serão
                  apagados. Não dá para desfazer.
                </>
              ) : (
                <>
                  A senha de <strong>{confirmar?.conta.email}</strong> vira uma temporária, que
                  aparece aqui para você repassar. A senha atual para de funcionar na hora.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmar?.tipo === "excluir"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => {
                if (!confirmar) return;
                const { tipo, conta } = confirmar;
                setConfirmar(null);
                if (tipo === "excluir") void handleDeleteUser(conta.user_id, conta.email);
                else void handleResetPassword(conta.user_id);
              }}
            >
              {confirmar?.tipo === "excluir" ? "Excluir" : "Resetar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => !o && setEditDialog({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{editDialog.user?.email}</p>
            <Select value={editPlanType} onValueChange={setEditPlanType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essencial">Vetrex Essencial (30 dias)</SelectItem>
                <SelectItem value="plus">Vetrex Plus (30 dias)</SelectItem>
                <SelectItem value="deluxe">Vetrex Deluxe (vitalício)</SelectItem>
                <SelectItem value="daily">Teste de 1 dia (acesso Plus)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button onClick={handleEditPurchase} disabled={actionLoading !== null}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Plan Dialog */}
      <Dialog open={addPlanDialog.open} onOpenChange={(o) => !o && setAddPlanDialog({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{addPlanDialog.user?.email}</p>
            <Select value={addPlanType} onValueChange={setAddPlanType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essencial">Vetrex Essencial (30 dias)</SelectItem>
                <SelectItem value="plus">Vetrex Plus (30 dias)</SelectItem>
                <SelectItem value="deluxe">Vetrex Deluxe (vitalício)</SelectItem>
                <SelectItem value="daily">Teste de 1 dia (acesso Plus)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPlanDialog({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button onClick={handleAddPlan} disabled={actionLoading !== null}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Senha</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewUserPassword(generateSecurePassword())}
                  title="Gerar senha segura"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Plano</label>
              <Select value={newUserPlanType} onValueChange={setNewUserPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="essencial">Vetrex Essencial (30 dias)</SelectItem>
                <SelectItem value="plus">Vetrex Plus (30 dias)</SelectItem>
                <SelectItem value="deluxe">Vetrex Deluxe (vitalício)</SelectItem>
                <SelectItem value="daily">Teste de 1 dia (acesso Plus)</SelectItem>
              </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={actionLoading !== null}>
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
