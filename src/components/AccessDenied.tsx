import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface AccessDeniedProps {
  userEmail?: string | null;
}

export const AccessDenied = ({ userEmail }: AccessDeniedProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="mx-auto p-4 rounded-full bg-destructive/10"
            >
              <ShieldX className="w-12 h-12 text-destructive" />
            </motion.div>
            <CardTitle className="text-2xl">Acesso Negado</CardTitle>
            <CardDescription className="text-base">
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userEmail && (
              <p className="text-sm text-muted-foreground">
                Logado como: <span className="font-medium">{userEmail}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Entre em contato com um administrador para solicitar acesso.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
