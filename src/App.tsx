import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import LandingPage from "./pages/LandingPage";
import { AppShell } from "./components/layout/AppShell";
import { ExigePlano, TRAVAS } from "./components/acesso/ExigePlano";

const Auth = lazy(() => import("./pages/Auth"));
const Mentoria = lazy(() => import("./pages/Mentoria"));
const Planos = lazy(() => import("./pages/Planos"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Comparador = lazy(() => import("./pages/Comparador"));
const CalculadoraAds = lazy(() => import("./pages/CalculadoraAds"));
const RpaAfiliados = lazy(() => import("./pages/RpaAfiliados"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Calculadora = lazy(() => import("./pages/Calculadora"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const ProdutosSalvos = lazy(() => import("./pages/ProdutosSalvos"));
const PaginaLegal = lazy(() => import("./pages/PaginaLegal"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" attribute="class">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/mentoria" element={<Mentoria />} />
                <Route path="/termos" element={<PaginaLegal documento="termos" />} />
                <Route path="/privacidade" element={<PaginaLegal documento="privacidade" />} />
                <Route path="/cookies" element={<PaginaLegal documento="cookies" />} />
                <Route element={<AppShell />}>
                  <Route
                    path="/dashboard"
                    element={<ExigePlano recurso="dashboard" {...TRAVAS.dashboard}><Dashboard /></ExigePlano>}
                  />
                  <Route path="/calculadora" element={<Calculadora />} />
                  <Route
                    path="/comparador"
                    element={<ExigePlano recurso="comparador" {...TRAVAS.comparador}><Comparador /></ExigePlano>}
                  />
                  <Route
                    path="/ads"
                    element={<ExigePlano recurso="ads" {...TRAVAS.ads}><CalculadoraAds /></ExigePlano>}
                  />
                  <Route
                    path="/rpa-afiliados"
                    element={<ExigePlano recurso="rpa" {...TRAVAS.rpa}><RpaAfiliados /></ExigePlano>}
                  />
                  <Route
                    path="/fornecedores"
                    element={
                      <ExigePlano recurso="fornecedores" {...TRAVAS.fornecedores}>
                        <Fornecedores />
                      </ExigePlano>
                    }
                  />
                  <Route path="/perfil" element={<Perfil />} />
                  <Route path="/planos" element={<Planos />} />
                  <Route path="/admin-panel" element={<AdminPanel />} />
                  <Route
                    path="/produtos-salvos"
                    element={<ExigePlano recurso="produtosSalvos" {...TRAVAS.produtosSalvos}><ProdutosSalvos /></ExigePlano>}
                  />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
