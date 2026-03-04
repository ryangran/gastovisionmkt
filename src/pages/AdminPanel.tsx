import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Trash2,
  KeyRound,
  Search,
  LogOut,
  ArrowLeft,
  Clock,
  Crown,
  AlertTriangle,
  Plus,
  Edit,
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
}

const ADMIN_EMAIL = "ryanzinho.gran@gmail.com";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: UserWithPurchase | null }>({
    open: false,
    user: null,
  });
  const [editPlanType, setEditPlanType] = useState("monthly");
  const [addPlanDialog, setAddPlanDialog] = useState<{ open: boolean; user: UserWithPurchase | null }>({
    open: false,
    user: null,
  });
  const [addPlanType, setAddPlanType] = useState("monthly");

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== ADMIN_EMAIL) {
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
      await invokeAdmin("reset_password", userId);
      toast.success("Senha resetada para 'Gasto123'");
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
      if (editPlanType === "lifetime") {
        updateData.expires_at = null;
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const now = new Date();
    const exp = new Date(expiresAt);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getPlanBadge = (user: UserWithPurchase) => {
    if (!user.plan_type) {
      return <Badge variant="outline" className="text-muted-foreground">Sem plano</Badge>;
    }
    if (user.plan_type === "lifetime") {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">👑 Vitalício</Badge>;
    }
    const days = getDaysRemaining(user.expires_at);
    if (days !== null && days <= 0) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (days !== null && days <= 7) {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
          ⏰ {days}d restantes
        </Badge>
      );
    }
    return (
      <Badge className="bg-primary/20 text-primary border-primary/30">
        Mensal • {days}d restantes
      </Badge>
    );
  };

  // Group users - deduplicate by user_id, keep the most relevant purchase
  const groupedUsers = users.reduce((acc, user) => {
    const existing = acc.find((u) => u.user_id === user.user_id);
    if (!existing) {
      acc.push(user);
    } else if (user.purchase_id && (!existing.purchase_id || user.plan_type === "lifetime")) {
      const idx = acc.indexOf(existing);
      acc[idx] = user;
    }
    return acc;
  }, [] as UserWithPurchase[]);

  const filtered = groupedUsers.filter((u) =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: groupedUsers.length,
    withPlan: groupedUsers.filter((u) => u.plan_type).length,
    lifetime: groupedUsers.filter((u) => u.plan_type === "lifetime").length,
    monthly: groupedUsers.filter((u) => u.plan_type === "monthly").length,
    expired: groupedUsers.filter((u) => {
      if (u.plan_type !== "monthly") return false;
      const d = getDaysRemaining(u.expires_at);
      return d !== null && d <= 0;
    }).length,
  };

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

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
            { label: "Com Plano", value: stats.withPlan, icon: Crown, color: "text-primary" },
            { label: "Vitalício", value: stats.lifetime, icon: Crown, color: "text-amber-400" },
            { label: "Mensal", value: stats.monthly, icon: Clock, color: "text-blue-400" },
            { label: "Expirado", value: stats.expired, icon: AlertTriangle, color: "text-destructive" },
          ].map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setLoading(true); loadUsers().finally(() => setLoading(false)); }}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Users list */}
        <div className="space-y-3">
          {filtered.map((user) => (
            <Card key={user.user_id} className="border-border">
              <CardContent className="py-4 px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate">{user.email}</span>
                      {user.email === ADMIN_EMAIL && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Admin</Badge>
                      )}
                      {getPlanBadge(user)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Cadastro: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      {user.last_sign_in_at && (
                        <span>
                          Último login: {new Date(user.last_sign_in_at).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {user.expires_at && user.plan_type === "monthly" && (
                        <span>
                          Expira: {new Date(user.expires_at).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Add plan */}
                    {!user.purchase_id && user.email !== ADMIN_EMAIL && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => {
                          setAddPlanType("monthly");
                          setAddPlanDialog({ open: true, user });
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Plano
                      </Button>
                    )}

                    {/* Edit plan */}
                    {user.purchase_id && user.email !== ADMIN_EMAIL && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => {
                          setEditPlanType(user.plan_type || "monthly");
                          setEditDialog({ open: true, user });
                        }}
                      >
                        <Edit className="w-3 h-3" />
                        Editar
                      </Button>
                    )}

                    {/* Reset password */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          disabled={actionLoading === user.user_id}
                        >
                          <KeyRound className="w-3 h-3" />
                          Senha
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resetar senha?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A senha de <strong>{user.email}</strong> será resetada para <strong>Gasto123</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleResetPassword(user.user_id)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete user */}
                    {user.email !== ADMIN_EMAIL && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs text-destructive hover:text-destructive"
                            disabled={actionLoading === user.user_id}
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário <strong>{user.email}</strong> e todos os seus dados serão excluídos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteUser(user.user_id, user.email)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card className="border-dashed border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum usuário encontrado
              </CardContent>
            </Card>
          )}
        </div>
      </main>

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
                <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
                <SelectItem value="lifetime">Vitalício</SelectItem>
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
                <SelectItem value="monthly">Mensal (30 dias)</SelectItem>
                <SelectItem value="lifetime">Vitalício</SelectItem>
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
    </div>
  );
};

export default AdminPanel;
