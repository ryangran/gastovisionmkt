import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import logoLight from "@/assets/logo-light.png";
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
  EyeOff,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";

// Rate limiting: max 5 attempts per 15 minutes per session
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface Purchase {
  id: string;
  plan_type: string | null;
  expires_at: string | null;
}

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modo, setModo] = useState<"entrar" | "criar" | "recuperar" | "nova_senha">("entrar");
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const navigate = useNavigate();

  const attemptsRef = useRef<number>(0);
  const lockoutEndRef = useRef<number>(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // O link de recuperação chega com sessão válida. Sem esta trava o efeito
  // abaixo mandaria a pessoa para a calculadora antes de ela trocar a senha.
  const recuperando = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") {
        recuperando.current = true;
        setModo("nova_senha");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !recuperando.current) {
        navigate("/calculadora");
      }
    });
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, []);

  const startLockoutCountdown = (endsAt: number) => {
    setIsLocked(true);
    if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);

    lockoutTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((endsAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setIsLocked(false);
        setLockoutRemaining(0);
        attemptsRef.current = 0;
        if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
      } else {
        setLockoutRemaining(remaining);
      }
    }, 1000);
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      // Resposta igual dando certo ou não, de propósito: mensagem diferente
      // entrega quais emails têm conta aqui.
      toast.success("Se existir conta com esse email, o link de troca de senha já saiu.");
      setModo("entrar");
    } catch {
      toast.success("Se existir conta com esse email, o link de troca de senha já saiu.");
      setModo("entrar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        console.error("Erro ao definir a senha:", error);
        toast.error("Não consegui trocar a senha. Peça um link novo e tente de novo.");
        return;
      }
      recuperando.current = false;
      toast.success("Senha trocada. Bem-vindo de volta!");
      navigate("/calculadora");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa de pelo menos 6 caracteres.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/calculadora` },
      });

      if (error) {
        // Mensagem genérica de propósito: dizer "já existe" entrega para
        // qualquer um quais emails têm conta aqui.
        console.error("Erro no cadastro:", error);
        toast.error("Não consegui criar a conta. Confira o email e tente de novo.");
        return;
      }

      // Sem sessão quer dizer que o projeto exige confirmação por email.
      if (!data.session) {
        toast.success("Conta criada. Confirme pelo link que enviamos no seu email.");
        setModo("entrar");
        return;
      }

      toast.success("Conta criada. Sua calculadora já está liberada.");
      navigate("/calculadora");
    } catch {
      toast.error("Erro ao criar a conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check lockout
    if (Date.now() < lockoutEndRef.current) {
      const remaining = Math.ceil((lockoutEndRef.current - Date.now()) / 1000);
      toast.error(`Muitas tentativas. Aguarde ${remaining}s para tentar novamente.`);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        attemptsRef.current += 1;

        if (attemptsRef.current >= MAX_ATTEMPTS) {
          lockoutEndRef.current = Date.now() + LOCKOUT_MS;
          startLockoutCountdown(lockoutEndRef.current);
          toast.error("Conta temporariamente bloqueada por segurança. Tente novamente em 15 minutos.");
        } else {
          // Generic message — never reveals if the email exists
          toast.error("Email ou senha incorretos. Verifique seus dados de acesso.");
        }
        return;
      }

      // Reset attempts on success
      attemptsRef.current = 0;

      toast.success("Bem-vindo de volta!");
      navigate("/calculadora");
    } catch {
      toast.error("Erro na autenticação. Tente novamente.");
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
          <div className="mb-8">
            <img src={logo} alt="Vetrex" className="h-16 hidden dark:block" />
            <img src={logoLight} alt="Vetrex" className="h-16 block dark:hidden" />
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
          <div className="mb-8 lg:hidden">
            <img src={logo} alt="Vetrex" className="h-12 hidden dark:block" />
            <img src={logoLight} alt="Vetrex" className="h-12 block dark:hidden" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {modo === "criar"
                ? "Crie sua conta grátis"
                : modo === "recuperar"
                  ? "Recuperar acesso"
                  : modo === "nova_senha"
                    ? "Defina uma senha nova"
                    : "Acesse sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {modo === "criar"
                ? "Email e senha, só isso. A calculadora já fica liberada."
                : modo === "recuperar"
                  ? "Informe seu email e mandamos um link para trocar a senha"
                  : modo === "nova_senha"
                    ? "Escolha a senha que você vai usar daqui pra frente"
                    : "Entre com seu email e senha"}
            </p>
          </div>

          {/* Alternador entre entrar e criar conta. */}
          {(modo === "entrar" || modo === "criar") && (
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {(["entrar", "criar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                  (modo === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
          )}

          <form
            onSubmit={
              modo === "criar"
                ? handleCadastro
                : modo === "recuperar"
                  ? handleRecuperar
                  : modo === "nova_senha"
                    ? handleNovaSenha
                    : handleLogin
            }
            className="space-y-5"
          >
            {modo !== "nova_senha" && (
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
                  disabled={isLoading || isLocked}
                  maxLength={254}
                />
              </div>
            </div>
            )}

            {modo !== "recuperar" && (
            <div className="space-y-2">
              <Label className="text-foreground">
                {modo === "nova_senha" ? "Nova senha" : "Senha"}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 py-5"
                  required
                  disabled={isLoading || isLocked}
                  minLength={modo === "entrar" ? 6 : 8}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {modo === "entrar" && (
                <button
                  type="button"
                  onClick={() => setModo("recuperar")}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>
            )}

            {isLocked && (
              <p className="text-sm text-destructive text-center">
                Conta bloqueada por segurança. Tente novamente em {lockoutRemaining}s.
              </p>
            )}

            <Button
              type="submit"
              className="w-full py-5 text-base"
              disabled={isLoading || (isLocked && modo === "entrar")}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {modo === "criar" ? "Criando..." : "Entrando..."}
                </>
              ) : modo === "criar" ? (
                "Criar conta grátis"
              ) : modo === "recuperar" ? (
                "Enviar link de recuperação"
              ) : modo === "nova_senha" ? (
                "Salvar nova senha"
              ) : (
                "Entrar"
              )}
            </Button>

            {modo === "recuperar" && (
              <button
                type="button"
                onClick={() => setModo("entrar")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Voltar para o login
              </button>
            )}

            {modo === "criar" && (
              <p className="text-center text-xs text-muted-foreground">
                Sem cartão. Você começa com a calculadora liberada e decide depois se quer o resto.
              </p>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem acesso?{" "}
              <button
                onClick={() => navigate("/")}
                className="text-primary font-medium hover:underline"
              >
                Adquira o Vetrex
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Precisa de ajuda para acessar?
            </p>
            <a
              href="https://wa.me/5511944804280?text=Ol%C3%A1%2C%20sou%20aluno%20do%20Gasto%20Vision%20e%20preciso%20de%20suporte%20para%20acessar%20minha%20conta."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-md bg-[#25D366] hover:bg-[#1faa52] text-white font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com suporte no WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
