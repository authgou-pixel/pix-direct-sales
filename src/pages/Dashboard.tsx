import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Package, DollarSign, Settings, Copy, ExternalLink, Users } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSales: 0, totalRevenue: 0, productsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [series, setSeries] = useState<{ date: string; value: number }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      await loadDashboardData(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadDashboardData = async (userId: string) => {
    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Load sales stats
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("amount,created_at")
        .eq("seller_id", userId)
        .eq("payment_status", "approved");

      if (salesError) throw salesError;

      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
      const totalSales = salesData?.length || 0;

      setStats({
        totalSales,
        totalRevenue,
        productsCount: productsData?.length || 0,
      });

      setSeries(aggregateSeries(salesData || [], timeframe));
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const aggregateSeries = (
    raw: { amount: number; created_at: string }[],
    tf: "daily" | "weekly" | "monthly"
  ) => {
    const byKey: Record<string, number> = {};
    for (const item of raw) {
      const d = new Date(item.created_at);
      let key = "";
      if (tf === "daily") {
        key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      } else if (tf === "weekly") {
        const tmp = new Date(d);
        const day = tmp.getUTCDay();
        const diff = tmp.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as start
        const monday = new Date(tmp.setUTCDate(diff));
        key = monday.toISOString().slice(0, 10);
      } else {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      }
      byKey[key] = (byKey[key] || 0) + Number(item.amount);
    }
    return Object.keys(byKey)
      .sort()
      .map((k) => ({ date: k, value: byKey[k] }));
  };

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      try {
        const { data: salesData } = await supabase
          .from("sales")
          .select("amount,created_at")
          .eq("seller_id", user.id)
          .eq("payment_status", "approved");
        setSeries(aggregateSeries(salesData || [], timeframe));
      } catch (e) {}
    };
    refresh();
    const id = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user, timeframe]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyProductLink = (productId: string) => {
    const link = `${window.location.origin}/pay/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar side="left" variant="floating">
        <SidebarContent>
          <SidebarHeader>
            <a href="/" className="flex w-full items-center justify-start pl-3 md:pl-4">
              <img
                src="https://i.imgur.com/TYyds7y.png"
                alt="Logo"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                className="h-auto w-[88%] max-w-[13rem] object-contain"
              />
            </a>
          </SidebarHeader>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/dashboard/settings")} size="lg">
                  <Settings className="h-5 w-5" />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/members")} size="lg">
                  <Users className="h-5 w-5" />
                  <span>Área de Membros</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} size="lg">
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-background">
        <div className="w-full bg-card/80 border-b border-border/50">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">R$ {stats.totalRevenue.toFixed(2)} / R$ 10,00K</div>
              <div className="w-40 h-2 bg-muted rounded">
                <div
                  className="h-2 bg-primary rounded"
                  style={{ width: `${Math.min((stats.totalRevenue / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div />
          </div>
        </div>
        <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Pix Disponível</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground">Disponível para saque</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Crypto Disponível</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground">Nesse Mês</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PIX Gerados</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Nesse Mês</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground">Nesse Mês</p>
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
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 text-xs text-muted-foreground">
              <div>Order ID</div>
              <div>Método de Pagamento</div>
              <div>Valor</div>
              <div>Status</div>
            </div>
            <div className="h-24 flex items-center justify-center text-muted-foreground">Sem dados</div>
          </CardContent>
        </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Dashboard;
