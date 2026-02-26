import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Warehouse, LogIn, LogOut, BarChart3, ClipboardCheck, ShoppingCart, TrendingUp, Users, DollarSign, Brain, Calculator, Factory, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { UserPermissionsDialog } from "@/components/UserPermissionsDialog";
import { ActivityLogsDialog } from "@/components/ActivityLogsDialog";
import { logNavigation, logClick, logAction } from "@/hooks/useActivityLogger";

const Particle = ({ delay, color, startAngle }: { delay: number; color: string; startAngle: number }) => {
  const randomDistance = useMemo(() => 160 + Math.random() * 140, []);
  const randomRotation = useMemo(() => Math.random() * 720 - 360, []);
  const size = useMemo(() => 6 + Math.random() * 10, []);
  const isCircle = useMemo(() => Math.random() > 0.5, []);
  
  return (
    <motion.div
      initial={{ 
        scale: 0, 
        x: 0, 
        y: 0, 
        rotate: 0,
        opacity: 1 
      }}
      animate={{ 
        scale: [0, 1.2, 1, 0.5, 0],
        x: Math.cos(startAngle) * randomDistance,
        y: Math.sin(startAngle) * randomDistance,
        rotate: randomRotation,
        opacity: [1, 1, 0.8, 0.4, 0]
      }}
      transition={{ 
        duration: 1.4, 
        delay,
        ease: "easeOut"
      }}
      className={`absolute ${isCircle ? 'rounded-full' : 'rounded-sm'}`}
      style={{ 
        width: size, 
        height: size, 
        background: color,
        boxShadow: `0 0 8px ${color}`
      }}
    />
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const hasSeenIntro = sessionStorage.getItem('hubBmsIntroSeen') === 'true';
  const [showIntro, setShowIntro] = useState(!hasSeenIntro);
  const [showIcons, setShowIcons] = useState(hasSeenIntro);
  const [showConfetti, setShowConfetti] = useState(false);

  // Generate particles with memoization
  const particles = useMemo(() => {
    const colors = [
      'hsl(262, 83%, 58%)', // primary purple
      'hsl(142, 76%, 36%)', // accent green
      '#fbbf24', // amber
      '#34d399', // emerald
      '#f472b6', // pink
      '#60a5fa', // blue
      '#a78bfa', // violet
      '#fb7185', // rose
      '#facc15', // yellow
      '#2dd4bf', // teal
    ];
    
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      startAngle: (i / 50) * Math.PI * 2 + (Math.random() * 0.5 - 0.25),
    }));
  }, []);

  useEffect(() => {
    const checkAdminRole = async (userId: string) => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      setIsAdmin(!!data);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasSeenIntro) return;

    const timer1 = setTimeout(() => {
      setShowConfetti(true);
      setShowIcons(true);
    }, 1800);

    const timer2 = setTimeout(() => {
      setShowIntro(false);
      sessionStorage.setItem('hubBmsIntroSeen', 'true');
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [hasSeenIntro]);

  const handleLogout = async () => {
    await logAction('logout', 'Usuário deslogou do sistema');
    await supabase.auth.signOut();
  };

  // Log navigation when page loads
  useEffect(() => {
    if (user && !showIntro) {
      logNavigation('Hub Principal');
    }
  }, [user, showIntro]);

  const handleMenuClick = (path: string, title: string) => {
    logClick(title, '/');
    logNavigation(title);
    navigate(path);
  };

  // Organized clockwise: Estoque, Produção, Supervisor, Previsões, Relatórios, Compras, CRM, Custos, Decisões, Memória, Revisão
  const menuItems = [
    {
      title: "Estoque",
      icon: Warehouse,
      path: "/estoque",
      gradient: "from-primary to-primary/60",
    },
    {
      title: "Produção",
      icon: Factory,
      path: "/producao",
      gradient: "from-teal-500 to-teal-500/60",
    },
    {
      title: "Supervisor",
      icon: Bell,
      path: "/supervisor",
      gradient: "from-orange-500 to-orange-500/60",
    },
    {
      title: "Previsões",
      icon: TrendingUp,
      path: "/forecasts",
      gradient: "from-violet-500 to-violet-500/60",
    },
    {
      title: "Relatórios",
      icon: BarChart3,
      path: "/relatorios-admin",
      gradient: "from-accent to-accent/60",
    },
    {
      title: "Compras",
      icon: ShoppingCart,
      path: "/pedido-compra",
      gradient: "from-amber-500 to-amber-500/60",
    },
    {
      title: "CRM",
      icon: Users,
      path: "/crm",
      gradient: "from-cyan-500 to-cyan-500/60",
    },
    {
      title: "Custos",
      icon: DollarSign,
      path: "/custos",
      gradient: "from-rose-500 to-rose-500/60",
    },
    {
      title: "Decisões",
      icon: Brain,
      path: "/central-decisoes",
      gradient: "from-fuchsia-500 to-fuchsia-500/60",
    },
    {
      title: "Calculadora",
      icon: Calculator,
      path: "/calculadora",
      gradient: "from-indigo-500 to-indigo-500/60",
    },
    {
      title: "Revisão",
      icon: ClipboardCheck,
      path: "/revisao",
      gradient: "from-emerald-500 to-emerald-500/60",
    },
  ];

  // Calculate positions for circular layout
  const getPosition = (index: number, total: number) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180);
    const radius = 300;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Intro Animation Overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-primary/10 to-accent/10"
          >
            <div className="flex flex-col items-center gap-8">
              {/* Welcome Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-lg text-muted-foreground mb-2"
                >
                  Seja bem-vindo ao
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                  className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
                >
                  Hub BMS
                </motion.h1>
              </motion.div>

              {/* Animated Center Box with Confetti */}
              <div className="relative flex items-center justify-center">
                {/* Confetti Particles */}
                {showConfetti && particles.map((particle) => (
                  <Particle
                    key={particle.id}
                    delay={particle.delay}
                    color={particle.color}
                    startAngle={particle.startAngle}
                  />
                ))}
                
                {/* Center Box */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ 
                    scale: showIcons ? [1, 1.3, 0] : 1, 
                    rotate: showIcons ? [0, 0, 180] : 0 
                  }}
                  transition={{ 
                    duration: showIcons ? 0.6 : 0.8, 
                    delay: showIcons ? 0 : 0.8,
                    ease: "easeInOut"
                  }}
                  className="relative z-10"
                >
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        "0 0 20px rgba(139, 92, 246, 0.3)",
                        "0 0 60px rgba(139, 92, 246, 0.6)",
                        "0 0 20px rgba(139, 92, 246, 0.3)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
                  >
                    <Package className="w-16 h-16 text-white" />
                  </motion.div>
                </motion.div>

                {/* Glow ring on explosion */}
                {showConfetti && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0.8 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute w-32 h-32 rounded-full border-4 border-primary/50"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: showIntro ? 0 : 1, y: showIntro ? -20 : 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="border-b bg-card/95 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Hub BMS
                </h1>
                <p className="text-xs text-muted-foreground">
                  Hub de Controle
                </p>
              </div>
            </div>
            
            <div>
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {user.email}
                  </span>
                  {isAdmin && (
                    <>
                      <UserPermissionsDialog />
                      <ActivityLogsDialog />
                    </>
                  )}
                  <Button onClick={handleLogout} variant="outline" size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </div>
              ) : (
                <Button onClick={() => navigate("/auth")} size="sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content - Circular Hub */}
      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="relative w-[740px] h-[740px]">
          {/* Center Logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: showIntro ? 0 : 1, 
              opacity: showIntro ? 0 : 1 
            }}
            transition={{ 
              duration: 0.6, 
              delay: 0.3,
              type: "spring",
              stiffness: 200
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 25px 50px -12px rgba(139, 92, 246, 0.25)",
                  "0 25px 50px -12px rgba(139, 92, 246, 0.4)",
                  "0 25px 50px -12px rgba(139, 92, 246, 0.25)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl"
            >
              <Package className="w-10 h-10 text-white" />
            </motion.div>
          </motion.div>

          {/* Circular Menu Items */}
          {menuItems.map((item, index) => {
            const pos = getPosition(index, menuItems.length);
            return (
              <motion.button
                key={item.path}
                initial={{ 
                  scale: 0, 
                  opacity: 0,
                  x: 0,
                  y: 0
                }}
                animate={{ 
                  scale: showIntro ? 0 : 1, 
                  opacity: showIntro ? 0 : 1,
                  x: showIntro ? 0 : pos.x,
                  y: showIntro ? 0 : pos.y
                }}
                transition={{ 
                  duration: 0.5, 
                  delay: showIntro ? 0 : 0.4 + (index * 0.1),
                  type: "spring",
                  stiffness: 150
                }}
                onClick={() => handleMenuClick(item.path, item.title)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group focus:outline-none"
              >
                <div className="flex flex-col items-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-24 h-24 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 cursor-pointer`}
                  >
                    <item.icon className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showIntro ? 0 : 1 }}
                    transition={{ delay: showIntro ? 0 : 0.8 + (index * 0.05) }}
                    className="text-sm font-medium text-foreground whitespace-nowrap"
                  >
                    {item.title}
                  </motion.span>
                </div>
              </motion.button>
            );
          })}

          {/* Connecting Lines */}
          <motion.svg 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: showIntro ? 0 : 0.3, 
              scale: showIntro ? 0.8 : 1 
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="absolute inset-0 w-full h-full pointer-events-none" 
            style={{ zIndex: 0 }}
          >
            <circle
              cx="370"
              cy="370"
              r="300"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
              strokeDasharray="8 8"
            />
          </motion.svg>
        </div>
      </main>
    </div>
  );
};

export default Index;
