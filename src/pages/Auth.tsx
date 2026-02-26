import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  CheckCircle2,
} from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/calculadora");
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login")) {
          toast.error("Email ou senha incorretos. Verifique seus dados de acesso enviados por email.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const { data: purchases } = await supabase
        .from("purchases")
        .select("id, plan_type, expires_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (!purchases || purchases.length === 0) {
        await supabase.auth.signOut();
        toast.error("Você não possui acesso. Adquira o Gasto Vision primeiro.");
        navigate("/");
        return;
      }

      // Check if any purchase grants active access
      const now = new Date();
      const hasActiveAccess = purchases.some((p: any) => {
        if (p.plan_type === "lifetime") return true;
        if (p.expires_at && new Date(p.expires_at) > now) return true;
        return false;
      });

      if (!hasActiveAccess) {
        await supabase.auth.signOut();
        toast.error("Seu plano expirou. Renove para continuar usando o Gasto Vision.");
        navigate("/");
        return;
      }

      // Check if monthly plan is expiring within 7 days
      const expiringPurchase = purchases.find((p: any) => {
        if (p.plan_type !== "monthly" || !p.expires_at) return false;
        const expiresAt = new Date(p.expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 && daysLeft <= 7;
      });

      if (expiringPurchase) {
        const daysLeft = Math.ceil((new Date(expiringPurchase.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        toast.warning(`Seu plano mensal expira em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}. Renove para não perder o acesso!`, { duration: 8000 });
      }

      toast.success("Bem-vindo de volta!");
      navigate("/calculadora");
    } catch (error: any) {
      toast.error(error.message || "Erro na autenticação");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Gasto Vision
            </span>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-4">
            Precifique com inteligência nos marketplaces
          </h2>
          <p className="text-muted-foreground mb-8">
            Calcule margens de lucro com precisão em Shopee, Mercado Livre, Amazon e Magalu.
          </p>

          <div className="space-y-4">
            {[
              "Calculadoras multi-plataforma",
              "Comissões e taxas atualizadas",
              "Lucro real antes de anunciar",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-foreground font-medium">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side - Login only */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="p-2 rounded-xl bg-primary/10">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Gasto Vision
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Acesse sua conta
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Use o email e senha enviados após a compra
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 py-5"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 py-5"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full py-5 text-base" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem acesso?{" "}
              <button
                onClick={() => navigate("/")}
                className="text-primary font-medium hover:underline"
              >
                Adquira o Gasto Vision
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
