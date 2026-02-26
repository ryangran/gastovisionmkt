import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Crown, Calendar, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const UserProfileDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [planType, setPlanType] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setEmail(session.user.email || "");

      const { data: purchases } = await supabase
        .from("purchases")
        .select("plan_type, expires_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (purchases && purchases.length > 0) {
        // Prioritize lifetime, then most recent monthly
        const lifetime = purchases.find((p: any) => p.plan_type === "lifetime");
        if (lifetime) {
          setPlanType("lifetime");
          setExpiresAt(null);
        } else {
          const active = purchases.find((p: any) => p.expires_at && new Date(p.expires_at) > new Date());
          setPlanType("monthly");
          setExpiresAt(active?.expires_at || purchases[0].expires_at);
        }
      }
    };

    loadProfile();
  }, [open]);

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsResetting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error("Erro ao redefinir senha: " + error.message);
      } else {
        toast.success("Senha redefinida com sucesso!");
        setNewPassword("");
      }
    } catch {
      toast.error("Erro inesperado ao redefinir senha");
    } finally {
      setIsResetting(false);
    }
  };

  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="w-4 h-4" />
          Perfil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Meu Perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Email */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium text-foreground">{email}</p>
          </div>

          <Separator />

          {/* Plan */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Plano</Label>
            <div className="flex items-center gap-2">
              {planType === "lifetime" ? (
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 gap-1">
                  <Crown className="w-3 h-3" />
                  Vitalício
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="w-3 h-3" />
                  Mensal
                </Badge>
              )}
            </div>
          </div>

          {/* Expiration for monthly */}
          {planType === "monthly" && expiresAt && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Expira em</Label>
                <p className="text-sm font-medium text-foreground">
                  {new Date(expiresAt).toLocaleDateString("pt-BR")}
                  {daysLeft !== null && daysLeft > 0 && (
                    <span className={`ml-2 text-xs ${daysLeft <= 7 ? "text-destructive" : "text-muted-foreground"}`}>
                      ({daysLeft} dia{daysLeft !== 1 ? "s" : ""} restante{daysLeft !== 1 ? "s" : ""})
                    </span>
                  )}
                  {daysLeft !== null && daysLeft <= 0 && (
                    <span className="ml-2 text-xs text-destructive">(Expirado)</span>
                  )}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Reset Password */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Redefinir Senha
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nova senha (mín. 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting || newPassword.length < 6}
              size="sm"
              className="w-full"
            >
              {isResetting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redefinindo...</>
              ) : (
                "Redefinir Senha"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
