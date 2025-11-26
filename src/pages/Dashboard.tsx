import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, Package, DollarSign, Settings, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
        .select("amount")
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
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

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
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">Minha Plataforma</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/settings")}
              className="border-primary/20 hover:bg-primary/10"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-border hover:bg-muted">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-primary/20 bg-gradient-card shadow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground">vendas aprovadas</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-card shadow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {stats.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">receita total</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-card shadow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.productsCount}</div>
              <p className="text-xs text-muted-foreground">produtos cadastrados</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Meus Produtos</h2>
          <Button onClick={() => navigate("/dashboard/new-product")} className="bg-primary hover:bg-primary/90 shadow-purple">
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>

        {products.length === 0 ? (
          <Card className="border-primary/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-primary mb-4" />
              <p className="text-xl font-medium mb-2">Nenhum produto cadastrado</p>
              <p className="text-muted-foreground mb-4">Crie seu primeiro produto para começar a vender</p>
              <Button onClick={() => navigate("/dashboard/new-product")} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Criar Produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-purple">
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>
                    {product.content_type.toUpperCase()} • R$ {product.price}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.is_active 
                        ? "bg-success/10 text-success border border-success/20" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {product.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-primary/20 hover:bg-primary/10"
                      onClick={() => copyProductLink(product.id)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/20 hover:bg-primary/10"
                      onClick={() => window.open(`/pay/${product.id}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
