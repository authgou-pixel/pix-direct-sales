import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, HelpCircle, LogOut, CreditCard, Settings as SettingsIcon, Users, Bell, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { filterByTimeframe, Timeframe, aggregateSeries } from "@/utils/dashboard";
import { getCurrentSubscription, isSubscriptionActive, markExpiredIfNeeded } from "@/utils/subscription";

interface Product {
  id: string;
  name: string;
  price: number;
  content_type: string;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  totalSales: number;
  totalRevenue: number;
  productsCount: number;
}

interface Sale {
  id: string;
  amount: number;
  payment_status: string;
  product_id?: string;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSales: 0, totalRevenue: 0, productsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [periodStats, setPeriodStats] = useState<{ sales: number; revenue: number }>({ sales: 0, revenue: 0 });
  const [chartLoading, setChartLoading] = useState(false);
  const [series, setSeries] = useState<Array<{ date: string; value: number }>>([]);
  const navigate = useNavigate();
  const salesSectionRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: "sale" | "alert"; message: string; ts: string; read: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      if (!SUPABASE_CONFIGURED) {
        toast.error("Configuração do Supabase ausente");
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadDashboardData(session.user.id);
      loadPersistedNotifications(session.user.id);
      await loadAndGenerateAlerts(session.user.id);
      subscribeRealtime(session.user.id);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadPersistedNotifications = (userId: string) => {
    try {
      const raw = localStorage.getItem(`notifications_${userId}`);
      const list: Array<{ id: string; type: "sale" | "alert"; message: string; ts: string; read: boolean }> = raw ? JSON.parse(raw) : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch { setNotifications([]); setUnreadCount(0); }
  };

  const persistNotifications = (userId: string, list: typeof notifications) => {
    try {
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(list));
    } catch { /* ignore */ }
  };

  const pushNotification = (n: { id: string; type: "sale" | "alert"; message: string; ts: string; read: boolean }) => {
    setNotifications((prev) => {
      const exists = prev.some((x) => x.id === n.id);
      const next = exists ? prev : [n, ...prev].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      if (user?.id) persistNotifications(user.id, next);
      setUnreadCount(next.filter((x) => !x.read).length);
      return next;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      if (user?.id) persistNotifications(user.id, next);
      setUnreadCount(0);
      return next;
    });
  };

  const loadAndGenerateAlerts = async (userId: string) => {
    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!sub?.expires_at) return;
      const exp = new Date(sub.expires_at);
      const now = new Date();
      const thresholds = [7, 3, 1];
      thresholds.forEach((days) => {
        const id = `alert:exp:${days}:${exp.toISOString()}`;
        const exists = notifications.some((n) => n.id === id);
        const msLeft = exp.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
        if (!exists && daysLeft <= days && daysLeft >= 0) {
          const msg = daysLeft === 0 ? "Seu plano expira hoje." : `Seu plano expira em ${daysLeft} dia(s).`;
          pushNotification({ id, type: "alert", message: msg, ts: new Date().toISOString(), read: false });
        }
      });
    } catch { /* ignore */ }
  };

  const subscribeRealtime = (userId: string) => {
    try {
      const ch = supabase.channel(`sales-notify-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales', filter: `seller_id=eq.${userId}` }, (payload: any) => {
          const s = payload?.new as Sale | undefined;
          if (!s) return;
          const status = (s.payment_status || '').toLowerCase();
          if (status === 'approved') {
            const id = `sale:${s.id}:approved`;
            const msg = `Venda aprovada: R$ ${Number(s.amount).toFixed(2)}`;
            pushNotification({ id, type: 'sale', message: msg, ts: s.created_at, read: false });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sales', filter: `seller_id=eq.${userId}` }, (payload: any) => {
          const s = payload?.new as Sale | undefined;
          if (!s) return;
          const status = (s.payment_status || '').toLowerCase();
          if (status === 'approved') {
            const id = `sale:${s.id}:approved`;
            const msg = `Venda aprovada: R$ ${Number(s.amount).toFixed(2)}`;
            pushNotification({ id, type: 'sale', message: msg, ts: s.created_at, read: false });
          }
        })
        .subscribe();
      return ch;
    } catch { /* ignore */ }
  };

  const timeAgo = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} dia(s) atrás`;
    if (hours > 0) return `${hours} hora(s) atrás`;
    return `${minutes} min atrás`;
  };

  const loadDashboardData = async (userId: string) => {
    let hadError = false;
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (productsError) {
        hadError = true;
        console.error(productsError);
      }
      setProducts(productsData || []);
    } catch (e) {
      hadError = true;
      console.error(e);
    }

    try {
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id,amount,created_at,payment_status,product_id")
        .eq("seller_id", userId)
        .eq("payment_status", "approved")
        .order("created_at", { ascending: false });
      if (salesError) {
        hadError = true;
        console.error(salesError);
      }

      const salesArr: Sale[] = salesData || [];
      const totalRevenue = salesArr.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      const totalSales = salesArr.length || 0;
      setStats((prev) => ({ totalSales, totalRevenue, productsCount: prev.productsCount || 0 }));

      const filtered = filterByTimeframe(salesArr, timeframe);
      setPeriodStats({
        sales: filtered.length,
        revenue: filtered.reduce((sum, s) => sum + Number(s.amount), 0),
      });
      setSeries(aggregateSeries(filtered, timeframe));
      setRecentSales(
        salesArr
          .slice(0, 10)
      );
    } catch (e) {
      hadError = true;
      console.error(e);
    }

    if (hadError) {
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  };


  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      try {
        setChartLoading(true);
        const { data: salesData } = await supabase
          .from("sales")
          .select("id,amount,created_at,payment_status,product_id")
          .eq("seller_id", user.id)
          .eq("payment_status", "approved");
        const salesArr: Sale[] = salesData || [];
        const filtered = filterByTimeframe(salesArr, timeframe);
        setSeries(aggregateSeries(filtered, timeframe));
        const totalRevenue = salesArr.reduce((sum, s) => sum + Number(s.amount), 0);
        const totalSales = salesArr.length;
        try {
          const { data: productsData } = await supabase
            .from("products")
            .select("id")
            .eq("user_id", user.id);
          setStats({ totalSales, totalRevenue, productsCount: productsData?.length || 0 });
    } catch (e) {
      console.error(e);
    }
        setPeriodStats({
          sales: filtered.length,
          revenue: filtered.reduce((sum, s) => sum + Number(s.amount), 0),
        });
        setRecentSales(
          salesArr
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10)
        );
        setChartLoading(false);
      } catch (e) {
        console.error(e);
      }
    };
    refresh();
  }, [user, timeframe]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyProductLink = (productId: string) => {
    const origin = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    const link = `${origin}/pay/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleGoToSales = () => {
    navigate("/dashboard/sales");
  };
  const pieColor = "#8A2BE2";
  const [mobileSidebarExpanded, setMobileSidebarExpanded] = useState<boolean>(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="w-full bg-card/80 border-b border-border/50 z-20">
        <div className={`mx-auto max-w-6xl py-4 flex items-center justify-between px-4 md:px-6 ${mobileSidebarExpanded ? "pl-[232px]" : "pl-[76px]"} ${desktopSidebarCollapsed ? "md:pl-[80px]" : "md:pl-[250px]"}`}>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">R$ {periodStats.revenue.toFixed(2)} / R$ 10,00K</div>
            <div className="w-24 md:w-40 h-2 bg-muted rounded">
              <div
                className="h-2 rounded"
                style={{ width: `${Math.min((periodStats.revenue / 10000) * 100, 100)}%`, backgroundColor: "#800080" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/settings")} className="gap-2 hidden md:flex">
              <CreditCard className="h-4 w-4" />
              Pagamentos
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[22px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[360px] sm:w-[420px] bg-card border border-border rounded-lg shadow-md" align="end" sideOffset={8}>
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="font-semibold">Notificações</div>
                  <button className="text-xs text-primary" onClick={markAllAsRead}>Marcar todas como lidas</button>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Sem notificações</div>
                  ) : (
                    notifications.sort((a,b)=> new Date(b.ts).getTime() - new Date(a.ts).getTime()).map((n) => (
                      <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${n.read ? '' : 'bg-muted/30'}`}>
                        <div className="mt-0.5">
                          {n.type === 'sale' ? (
                            <CheckCircle2 className="h-4 w-4 text-[#00B14F]" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-[#FFA500]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{n.message}</div>
                          <div className="text-xs text-muted-foreground">{timeAgo(n.ts)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t text-right">
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => navigate('/dashboard')}>Ver todas as notificações</Button>
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center justify-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <div className="px-3 py-2 text-xs text-muted-foreground">{user?.email}</div>
                <DropdownMenuItem onClick={() => navigate("/members")}>
                  <Users className="mr-2 h-4 w-4" />
                  Área de Membros
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <main className={`mx-auto max-w-6xl px-4 md:px-6 py-6 ${desktopSidebarCollapsed ? "md:pl-[80px]" : "md:pl-[250px]"} ${mobileSidebarExpanded ? "pl-[232px]" : "pl-[76px]"}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Vendas Realizadas</CardTitle>
                <HelpCircle className="h-4 w-4 text-[#800080]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{periodStats.sales}</div>
              <p className="text-xs text-muted-foreground">Período: {timeframe}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Produtos Criados</CardTitle>
                <Package className="h-4 w-4 text-[#800080]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productsCount}</div>
              <p className="text-xs text-muted-foreground">Unidade: itens</p>
            </CardContent>
          </Card>

          <Card className="bg-card border rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Saldo Acumulado</CardTitle>
                <DollarSign className="h-4 w-4 text-[#800080]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {periodStats.revenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Período: {timeframe}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-sm">Estatísticas de Vendas</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTimeframe("daily")}>Diária</Button>
              <Button variant="outline" size="sm" onClick={() => setTimeframe("weekly")}>Semanal</Button>
              <Button variant="outline" size="sm" onClick={() => setTimeframe("monthly")}>Mensal</Button>
            </div>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {chartLoading ? (
              <div className="h-full w-full animate-pulse rounded bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value, name) => [Number(value), name]} />
                  <Pie
                    data={series.map((s) => ({ name: s.date, value: s.value }))}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={115}
                    labelLine={false}
                  >
                    {series.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColor} stroke="#ffffff20" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        

        <div ref={salesSectionRef}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transações Recentes</CardTitle>
            <CardDescription>Últimas vendas aprovadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 text-xs text-muted-foreground">
              <div>Order ID</div>
              <div>Produto</div>
              <div>Valor</div>
              <div>Status</div>
            </div>
            {recentSales.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">Sem dados</div>
            ) : (
              <div className="mt-2 divide-y">
                {recentSales.map((s) => (
                  <div key={s.id} className="grid grid-cols-4 py-2 text-sm">
                    <div className="truncate">{s.id}</div>
                    <div className="truncate">{s.product_id || "-"}</div>
                    <div>R$ {Number(s.amount).toFixed(2)}</div>
                    <div className={s.payment_status === "approved" ? "text-success" : "text-muted-foreground"}>{s.payment_status}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen bg-transparent p-4 flex-col gap-3 transition-[width] duration-300 ease-out ${desktopSidebarCollapsed ? "w-[64px]" : "w-[250px]"}`}>
        <button
          aria-label="Alternar menu"
          className="hidden md:flex h-10 w-10 items-center justify-center rounded-md bg-card border border-border/60 mb-2"
          onClick={() => setDesktopSidebarCollapsed((v) => !v)}
        >
          <span className="text-xl">☰</span>
        </button>
        <Button 
          variant="ghost"
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={() => navigate("/dashboard")}
        >
          <Package className="h-4 w-4" /> {desktopSidebarCollapsed ? null : <span className="text-foreground">Produtos</span>}
        </Button>
        {!desktopSidebarCollapsed && (
          <div className="pl-6 flex flex-col gap-2">
            <Button 
              variant="ghost" 
              className="justify-start bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-9 px-2"
              onClick={() => navigate("/dashboard/new-product")}
            >
              <span className="text-foreground">Criar Produto</span>
            </Button>
            <Button 
              variant="ghost" 
              className="justify-start bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-9 px-2"
              onClick={() => navigate("/dashboard/products")}
            >
              <span className="text-foreground">Produtos Criados</span>
            </Button>
          </div>
        )}
        <Button 
          variant="ghost" 
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={handleGoToSales}
        >
          <DollarSign className="h-4 w-4" /> {desktopSidebarCollapsed ? null : <span className="text-foreground">Vendas</span>}
        </Button>
        <Button 
          variant="ghost" 
          className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2"
          onClick={() => navigate("/dashboard/settings")}
        >
          <CreditCard className="h-4 w-4" /> {desktopSidebarCollapsed ? null : <span className="text-foreground">Pagamentos</span>}
        </Button>
        {!desktopSidebarCollapsed && (
          <Button
            variant="ghost"
            className="justify-start gap-2 bg-transparent hover:bg-transparent border-none rounded-none shadow-none h-10 px-2 text-foreground"
            onClick={() => navigate("/dashboard/subscription")}
          >
            Upgrade
          </Button>
        )}
      </aside>
      <button
        aria-label="Abrir menu"
        className="md:hidden fixed left-4 top-4 z-40 h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center"
        onClick={() => setMobileSidebarExpanded((v) => !v)}
      >
        <span className="text-xl">☰</span>
      </button>
      <aside
        className={`md:hidden fixed left-0 top-0 h-screen bg-card border-r border-border/50 pt-16 transition-[width] duration-300 ease-out overflow-hidden z-30 ${mobileSidebarExpanded ? "w-[220px]" : "w-[64px]"}`}
      >
        <nav className="flex flex-col gap-2 px-3">
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard"); setMobileSidebarExpanded(false); }}>
            <Package className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Produtos</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/products"); setMobileSidebarExpanded(false); }}>
            <Package className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Produtos Criados</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/new-product"); setMobileSidebarExpanded(false); }}>
            <Package className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Criar Produto</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { handleGoToSales(); setMobileSidebarExpanded(false); }}>
            <DollarSign className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Vendas</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/settings"); setMobileSidebarExpanded(false); }}>
            <CreditCard className="h-5 w-5" />
            {mobileSidebarExpanded && <span>Pagamentos</span>}
          </Button>
          <Button variant="ghost" className={`justify-start h-12 px-2 gap-3`} onClick={() => { navigate("/dashboard/subscription"); setMobileSidebarExpanded(false); }}>
            {mobileSidebarExpanded && <span>Upgrade</span>}
          </Button>
        </nav>
      </aside>
    </div>
  );
};

export default Dashboard;
const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
