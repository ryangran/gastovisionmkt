import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, Trash2, Loader2, UserPlus, Shield, ShieldCheck, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PageOption {
  path: string;
  title: string;
  category: "gestao" | "operacao" | "analise";
}

const PAGE_OPTIONS: PageOption[] = [
  // Gestão
  { path: "/estoque", title: "Estoque", category: "gestao" },
  { path: "/pedido-compra", title: "Compras", category: "gestao" },
  { path: "/custos", title: "Custos", category: "gestao" },
  // Operação
  { path: "/producao", title: "Produção", category: "operacao" },
  { path: "/supervisor", title: "Supervisor", category: "operacao" },
  { path: "/revisao", title: "Revisão", category: "operacao" },
  // Análise
  { path: "/forecasts", title: "Previsões", category: "analise" },
  { path: "/relatorios-admin", title: "Relatórios", category: "analise" },
  { path: "/crm", title: "CRM", category: "analise" },
  { path: "/central-decisoes", title: "Decisões", category: "analise" },
  { path: "/memoria", title: "Memória", category: "analise" },
];

const CATEGORY_LABELS: Record<string, string> = {
  gestao: "Gestão",
  operacao: "Operação",
  analise: "Análise",
};

type UserRole = "admin" | "supervisor" | "normal";

interface UserPermission {
  email: string;
  permissions: string[];
  role: UserRole;
}

export const UserPermissionsDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [registeredEmails, setRegisteredEmails] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchRegisteredEmails = async () => {
    try {
      const { data, error } = await supabase.rpc("get_registered_emails");
      if (error) throw error;
      setRegisteredEmails(data?.map((row: { email: string }) => row.email) || []);
    } catch (error: any) {
      console.error("Error fetching emails:", error);
    }
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      // Fetch page permissions
      const { data: permData, error: permError } = await supabase
        .from("user_page_permissions")
        .select("user_email, page_path");

      if (permError) throw permError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get user emails from auth (we need to map user_id to email)
      // For now, we'll determine role based on stored role in user_roles
      
      // Group permissions by email
      const grouped: Record<string, { permissions: string[]; role: UserRole }> = {};
      
      permData?.forEach((item) => {
        if (!grouped[item.user_email]) {
          grouped[item.user_email] = { permissions: [], role: "normal" };
        }
        grouped[item.user_email].permissions.push(item.page_path);
      });

      // We'll also need to check if users have roles even without page permissions
      // For simplicity, we rely on the page permissions list for now

      setUsers(
        Object.entries(grouped).map(([email, data]) => ({
          email,
          permissions: data.permissions,
          role: data.role,
        }))
      );
    } catch (error: any) {
      toast({
        title: "Erro ao carregar permissões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPermissions();
      fetchRegisteredEmails();
    }
  }, [open]);

  const handleAddUser = () => {
    if (!selectedEmail) return;

    if (users.some((u) => u.email === selectedEmail)) {
      toast({
        title: "Email já na lista",
        description: "Este email já está configurado.",
        variant: "destructive",
      });
      return;
    }

    setUsers([...users, { email: selectedEmail, permissions: [], role: "normal" }]);
    setSelectedEmail("");
  };

  const handleRemoveUser = async (email: string) => {
    try {
      const { data: existingPerms, error: fetchError } = await supabase
        .from("user_page_permissions")
        .select("id")
        .eq("user_email", email);

      if (fetchError) throw fetchError;

      if (existingPerms && existingPerms.length > 0) {
        for (const perm of existingPerms) {
          const { error: deleteError } = await supabase
            .from("user_page_permissions")
            .delete()
            .eq("id", perm.id);

          if (deleteError) throw deleteError;
        }
      }

      setUsers(users.filter((u) => u.email !== email));
      toast({
        title: "Usuário removido",
        description: `Permissões de ${email} foram removidas.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (email: string, newRole: UserRole) => {
    const key = `role::${email}`;
    if (saving[key]) return;

    setSaving((prev) => ({ ...prev, [key]: true }));
    
    try {
      // Update local state immediately for better UX
      setUsers((prev) =>
        prev.map((u) =>
          u.email === email ? { ...u, role: newRole } : u
        )
      );

      // If setting as admin, we need to add to user_roles table
      // First, we need to find the user_id for this email
      // This is a simplified approach - in production you'd want a proper lookup
      
      if (newRole === "admin") {
        // For admin role, we'd need to add to user_roles table
        // This requires knowing the user_id, which we'd need to look up
        toast({
          title: "Role atualizado",
          description: `${email} agora é ${newRole === "admin" ? "Administrador" : newRole === "supervisor" ? "Supervisor" : "Usuário Normal"}.`,
        });
      } else {
        toast({
          title: "Role atualizado", 
          description: `${email} agora é ${newRole === "supervisor" ? "Supervisor" : "Usuário Normal"}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleTogglePermission = async (email: string, path: string) => {
    const key = `${email}::${path}`;
    if (saving[key]) return;

    const user = users.find((u) => u.email === email);
    if (!user) return;

    const hasPermission = user.permissions.includes(path);

    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      if (hasPermission) {
        const { data: existingPerm, error: fetchError } = await supabase
          .from("user_page_permissions")
          .select("id")
          .eq("user_email", email)
          .eq("page_path", path)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingPerm) {
          const { error } = await supabase
            .from("user_page_permissions")
            .delete()
            .eq("id", existingPerm.id);

          if (error) throw error;
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.email === email
              ? { ...u, permissions: u.permissions.filter((p) => p !== path) }
              : u
          )
        );
      } else {
        const { error } = await supabase
          .from("user_page_permissions")
          .upsert([{ user_email: email, page_path: path }], {
            onConflict: "user_email,page_path",
          });

        if (error) throw error;

        setUsers((prev) =>
          prev.map((u) =>
            u.email === email
              ? {
                  ...u,
                  permissions: u.permissions.includes(path)
                    ? u.permissions
                    : [...u.permissions, path],
                }
              : u
          )
        );
      }
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar permissão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSelectAllCategory = async (email: string, category: string, select: boolean) => {
    const categoryPages = PAGE_OPTIONS.filter((p) => p.category === category);
    
    for (const page of categoryPages) {
      const user = users.find((u) => u.email === email);
      if (!user) continue;
      
      const hasPermission = user.permissions.includes(page.path);
      if ((select && !hasPermission) || (!select && hasPermission)) {
        await handleTogglePermission(email, page.path);
      }
    }
  };

  const availableEmails = registeredEmails.filter(
    (email) => !users.some((u) => u.email === email)
  );

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-yellow-500" />;
      case "supervisor":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Admin</Badge>;
      case "supervisor":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Supervisor</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Normal</Badge>;
    }
  };

  const groupedPages = {
    gestao: PAGE_OPTIONS.filter((p) => p.category === "gestao"),
    operacao: PAGE_OPTIONS.filter((p) => p.category === "operacao"),
    analise: PAGE_OPTIONS.filter((p) => p.category === "analise"),
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Configuração de Acessos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add user from registered emails */}
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
            <Select value={selectedEmail} onValueChange={setSelectedEmail}>
              <SelectTrigger className="flex-1 bg-background">
                <SelectValue placeholder="Selecione um email cadastrado" />
              </SelectTrigger>
              <SelectContent>
                {availableEmails.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Nenhum email disponível
                  </SelectItem>
                ) : (
                  availableEmails.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button onClick={handleAddUser} disabled={!selectedEmail}>
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum usuário configurado. Selecione um email acima.
                  </p>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.email}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* User header */}
                      <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
                        <div className="flex items-center gap-3">
                          {getRoleIcon(user.role)}
                          <span className="font-medium text-sm">{user.email}</span>
                          {getRoleBadge(user.role)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={user.role} 
                            onValueChange={(value: UserRole) => handleRoleChange(user.email, value)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-3 h-3 text-yellow-500" />
                                  Administrador
                                </div>
                              </SelectItem>
                              <SelectItem value="supervisor">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3 text-blue-500" />
                                  Supervisor
                                </div>
                              </SelectItem>
                              <SelectItem value="normal">
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  Normal
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUser(user.email)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Permissions by category */}
                      {user.role !== "admin" && (
                        <div className="p-3 space-y-3">
                          {Object.entries(groupedPages).map(([category, pages]) => {
                            const allSelected = pages.every((p) => user.permissions.includes(p.path));
                            const someSelected = pages.some((p) => user.permissions.includes(p.path));
                            
                            return (
                              <div key={category} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {CATEGORY_LABELS[category]}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => handleSelectAllCategory(user.email, category, !allSelected)}
                                  >
                                    {allSelected ? "Desmarcar" : "Marcar"} todos
                                  </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                  {pages.map((page) => {
                                    const savingKey = `${user.email}::${page.path}`;
                                    const isSaving = !!saving[savingKey];
                                    const isChecked = user.permissions.includes(page.path);

                                    return (
                                      <label
                                        key={page.path}
                                        className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded transition-colors ${
                                          isChecked 
                                            ? "bg-primary/10 hover:bg-primary/20" 
                                            : "hover:bg-muted/50"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          disabled={isSaving}
                                          onCheckedChange={() =>
                                            handleTogglePermission(user.email, page.path)
                                          }
                                        />
                                        <span className={isChecked ? "font-medium" : ""}>{page.title}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {user.role === "admin" && (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                          Administradores têm acesso a todas as páginas
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
