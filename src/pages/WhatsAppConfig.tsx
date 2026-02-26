import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Home, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const WhatsAppConfig = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+5511944804280");
  const [checkingStatus, setCheckingStatus] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }

        setUser(session.user);

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleData) {
          toast({
            title: "Acesso negado",
            description: "Apenas administradores podem configurar WhatsApp",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate, toast]);

  const generateQRCode = async () => {
    try {
      setCheckingStatus(true);
      const { data, error } = await supabase.functions.invoke("whatsapp-manager", {
        body: { action: "generate_qr" }
      });

      if (error) throw error;

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setIsConnected(false);
        toast({
          title: "QR Code gerado",
          description: "Escaneie o código com seu WhatsApp",
        });
      } else if (data.connected) {
        setIsConnected(true);
        setQrCode(null);
        toast({
          title: "Já conectado",
          description: "WhatsApp já está conectado",
        });
      }
    } catch (error: any) {
      console.error("Error generating QR:", error);
      toast({
        title: "Erro ao gerar QR Code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const checkStatus = async () => {
    try {
      setCheckingStatus(true);
      const { data, error } = await supabase.functions.invoke("whatsapp-manager", {
        body: { action: "check_status" }
      });

      if (error) throw error;

      setIsConnected(data.connected);
      
      if (data.connected) {
        setQrCode(null);
        toast({
          title: "WhatsApp conectado",
          description: "Conexão ativa e funcionando",
        });
      } else {
        toast({
          title: "WhatsApp desconectado",
          description: "Gere um novo QR Code para conectar",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error checking status:", error);
      toast({
        title: "Erro ao verificar status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  const savePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Número inválido",
        description: "Digite um número de telefone válido",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("whatsapp-manager", {
        body: { 
          action: "save_phone_number",
          phoneNumber: phoneNumber.trim()
        }
      });

      if (error) throw error;

      toast({
        title: "Número configurado",
        description: "Notificações serão enviadas para este número",
      });
    } catch (error: any) {
      console.error("Error saving phone number:", error);
      toast({
        title: "Erro ao salvar número",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Configuração WhatsApp
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Menu
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status da Conexão
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                {isConnected
                  ? "WhatsApp conectado e pronto para enviar notificações"
                  : "Conecte seu WhatsApp para receber notificações"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={generateQRCode} disabled={checkingStatus} className="flex-1">
                  Gerar QR Code
                </Button>
                <Button
                  onClick={checkStatus}
                  disabled={checkingStatus}
                  variant="outline"
                  size="icon"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {qrCode && (
                <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-white">
                  <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
                  <p className="text-sm text-muted-foreground text-center">
                    Abra o WhatsApp no seu celular e escaneie este código
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurar Número de Notificações</CardTitle>
              <CardDescription>
                Número do WhatsApp que receberá as notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Número de Telefone</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+5511944804280"
                />
                <p className="text-xs text-muted-foreground">
                  Use o formato internacional com código do país (ex: +5511944804280)
                </p>
              </div>
              <Button onClick={savePhoneNumber} disabled={!isConnected}>
                Salvar Número
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificações Automáticas</CardTitle>
              <CardDescription>
                O sistema enviará notificações automaticamente quando:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Um produto atingir o estoque mínimo</li>
                <li>Você solicitar um alerta pelo chat administrativo</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default WhatsAppConfig;
