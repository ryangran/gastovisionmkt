import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStockRequests, StockRequest } from "@/hooks/useStockRequests";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, LogOut, Home, Check, X, Package, Volume2, VolumeX, BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Supervisor = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(0);

  const { pendingRequests, isLoading, approveRequest, rejectRequest } = useStockRequests();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush, isLoading: pushLoading } = usePushNotifications();

  // Play notification sound when new request arrives
  useEffect(() => {
    if (pendingRequests.length > prevCountRef.current && soundEnabled) {
      playNotificationSound();
      // Vibrate if supported
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    prevCountRef.current = pendingRequests.length;
  }, [pendingRequests.length, soundEnabled]);

  // Update document title with pending count
  useEffect(() => {
    const count = pendingRequests.length;
    document.title = count > 0 ? `(${count}) Supervisor - StockBMS` : "Supervisor - StockBMS";
  }, [pendingRequests.length]);

  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.frequency.value = 1000;
      }, 100);
      setTimeout(() => {
        oscillator.stop();
      }, 200);
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleApprove = async (request: StockRequest) => {
    const quantity = parseFloat(quantities[request.id] || "0");
    
    if (quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Digite uma quantidade maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (quantity > request.current_stock) {
      toast({
        title: "Quantidade inválida",
        description: `Estoque disponível: ${request.current_stock} ${request.unit}`,
        variant: "destructive",
      });
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(request.id));
    
    const success = await approveRequest(request.id, quantity);
    
    if (success) {
      toast({
        title: "✅ Aprovado",
        description: `${quantity} ${request.unit} de ${request.product_name}`,
      });
      setQuantities((prev) => {
        const updated = { ...prev };
        delete updated[request.id];
        return updated;
      });
    }
    
    setProcessingIds((prev) => {
      const updated = new Set(prev);
      updated.delete(request.id);
      return updated;
    });
  };

  const handleReject = async (request: StockRequest) => {
    setProcessingIds((prev) => new Set(prev).add(request.id));
    
    const success = await rejectRequest(request.id);
    
    if (success) {
      toast({
        title: "❌ Rejeitado",
        description: request.product_name,
        variant: "destructive",
      });
    }
    
    setProcessingIds((prev) => {
      const updated = new Set(prev);
      updated.delete(request.id);
      return updated;
    });
  };


  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Supervisor
                </h1>
                <p className="text-xs text-muted-foreground">
                  Aprovação de Baixas
                </p>
              </div>
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {pendingRequests.length} pendente{pendingRequests.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {pushSupported && (
                <Button
                  variant={pushSubscribed ? "default" : "outline"}
                  size="sm"
                  onClick={pushSubscribed ? unsubscribePush : subscribePush}
                  disabled={pushLoading}
                  className="gap-2"
                  title={pushSubscribed ? "Desativar notificações push" : "Ativar notificações push"}
                >
                  {pushSubscribed ? (
                    <BellRing className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {pushSubscribed ? "Push ON" : "Push OFF"}
                  </span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="h-9 w-9"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {pendingRequests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                Nenhuma solicitação pendente
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                As solicitações de baixa de estoque aparecerão aqui automaticamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map((request) => {
              const isProcessing = processingIds.has(request.id);
              
              return (
                <Card
                  key={request.id}
                  className="transition-all border-primary/30"
                >
                  <CardHeader className="pb-2">
                    <div>
                      <CardTitle className="text-lg">
                        {request.product_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Solicitado por: {request.requested_by}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {request.current_stock}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.unit} em estoque
                        </p>
                      </div>
                      <div className="flex-1 mx-4">
                        <Input
                          type="number"
                          placeholder="Qtd"
                          value={quantities[request.id] || ""}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [request.id]: e.target.value,
                            }))
                          }
                          className="text-center text-lg h-12"
                          disabled={isProcessing}
                          min="0"
                          max={request.current_stock}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(request)}
                        disabled={isProcessing}
                        className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => handleReject(request)}
                        disabled={isProcessing}
                        variant="destructive"
                        className="flex-1 h-12"
                      >
                        <X className="w-5 h-5 mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Supervisor;
