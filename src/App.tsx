import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";

// Lazy load pages for better performance
const Admin = lazy(() => import("./pages/Admin"));
const Production = lazy(() => import("./pages/Production"));
const Supervisor = lazy(() => import("./pages/Supervisor"));
const Reports = lazy(() => import("./pages/Reports"));
const Forecasts = lazy(() => import("./pages/Forecasts"));
const Auth = lazy(() => import("./pages/Auth"));
const Revisao = lazy(() => import("./pages/Revisao"));
const PedidoCompra = lazy(() => import("./pages/PedidoCompra"));
const CRM = lazy(() => import("./pages/CRM"));
const Custos = lazy(() => import("./pages/Custos"));
const CentralDecisoes = lazy(() => import("./pages/CentralDecisoes"));
const Calculadora = lazy(() => import("./pages/Calculadora"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  // Prevent page reload when switching tabs
  useEffect(() => {
    // Disable bfcache-related reloads
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was restored from bfcache, no reload needed
        e.preventDefault();
      }
    };

    // Prevent visibility change from triggering any refresh logic
    const handleVisibilityChange = () => {
      // Intentionally empty - prevents default browser behavior
      // that some frameworks hook into for refresh
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" attribute="class">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/estoque"
                element={
                  <ProtectedRoute pagePath="/estoque">
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/producao"
                element={
                  <ProtectedRoute pagePath="/producao">
                    <Production />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/supervisor"
                element={
                  <ProtectedRoute pagePath="/supervisor">
                    <Supervisor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios-admin"
                element={
                  <ProtectedRoute pagePath="/relatorios-admin">
                    <Reports panelType="admin" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forecasts"
                element={
                  <ProtectedRoute pagePath="/forecasts">
                    <Forecasts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/revisao"
                element={
                  <ProtectedRoute pagePath="/revisao">
                    <Revisao />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pedido-compra"
                element={
                  <ProtectedRoute pagePath="/pedido-compra">
                    <PedidoCompra />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/crm"
                element={
                  <ProtectedRoute pagePath="/crm">
                    <CRM />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/custos"
                element={
                  <ProtectedRoute pagePath="/custos">
                    <Custos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/central-decisoes"
                element={
                  <ProtectedRoute pagePath="/central-decisoes">
                    <CentralDecisoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calculadora"
                element={
                  <ProtectedRoute pagePath="/calculadora">
                    <Calculadora />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
