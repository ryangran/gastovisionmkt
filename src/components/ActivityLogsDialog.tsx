import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Search, Monitor, User, Clock, MapPin, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityLog {
  id: string;
  created_at: string;
  user_email: string;
  action: string;
  details: string | null;
  page: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export const ActivityLogsDialog = () => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open]);

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      navegação: { variant: "secondary", label: "Navegação" },
      clique: { variant: "default", label: "Clique" },
      alteração: { variant: "outline", label: "Alteração" },
      login: { variant: "default", label: "Login" },
      logout: { variant: "destructive", label: "Logout" },
    };
    
    const config = actionMap[action.toLowerCase()] || { variant: "secondary" as const, label: action };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      log.user_email.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      (log.details?.toLowerCase().includes(search)) ||
      (log.page?.toLowerCase().includes(search)) ||
      (log.ip_address?.toLowerCase().includes(search))
    );
  });

  const getBrowserFromUserAgent = (ua: string | null) => {
    if (!ua) return "Desconhecido";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Outro";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs de Atividade
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, ação, página ou IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          {filteredLogs.length} registro(s) encontrado(s)
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(log.action)}
                        <span className="text-sm font-medium">{log.details || log.action}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.user_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </span>
                        {log.page && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {log.page}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {log.ip_address && (
                          <span className="flex items-center gap-1 font-mono bg-muted px-2 py-0.5 rounded">
                            <MapPin className="w-3 h-3" />
                            {log.ip_address}
                          </span>
                        )}
                        {log.user_agent && (
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            {getBrowserFromUserAgent(log.user_agent)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
