import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Package, DollarSign, Settings, Copy, ExternalLink, HelpCircle, CreditCard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
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
  const [periodStats, setPeriodStats] = useState<{ sales: number; revenue: number }>({ sales: 0, revenue: 0 });
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
      const filtered = filterByTimeframe(salesData || [], timeframe);
      setPeriodStats({
        sales: filtered.length,
        revenue: filtered.reduce((sum, s) => sum + Number(s.amount), 0),
      });
      setSeries(aggregateSeries(filtered || [], timeframe));
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
        const filtered = filterByTimeframe(salesData || [], timeframe);
        setSeries(aggregateSeries(filtered || [], timeframe));
        const totalRevenue = (salesData || []).reduce((sum, s) => sum + Number(s.amount), 0);
        const totalSales = (salesData || []).length;
        try {
          const { data: productsData } = await supabase
            .from("products")
            .select("id")
            .eq("user_id", user.id);
          setStats({ totalSales, totalRevenue, productsCount: productsData?.length || 0 });
        } catch {}
        setPeriodStats({
          sales: filtered.length,
          revenue: filtered.reduce((sum, s) => sum + Number(s.amount), 0),
        });
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
    <div className="min-h-screen bg-background">
      <div className="w-full bg-card/80 border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">R$ {periodStats.revenue.toFixed(2)} / R$ 10,00K</div>
            <div className="w-40 h-2 bg-muted rounded">
              <div
                className="h-2 rounded"
                style={{ width: `${Math.min((periodStats.revenue / 10000) * 100, 100)}%`, backgroundColor: "#800080" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/settings")} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Pagamentos
            </Button>
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
                <DropdownMenuItem onClick={() => navigate("/profile")}>Perfil</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-6 py-6">
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
    </div>
  );
};

export default Dashboard;
  const filterByTimeframe = (
    raw: { amount: number; created_at: string }[],
    tf: "daily" | "weekly" | "monthly"
  ) => {
    const now = new Date();
    const start = new Date(now);
    if (tf === "daily") start.setDate(now.getDate() - 1);
    else if (tf === "weekly") start.setDate(now.getDate() - 7);
    else start.setDate(now.getDate() - 30);
    return raw.filter((r) => new Date(r.created_at) >= start);
  };
