import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { getCurrentSubscription, isSubscriptionActive, markExpiredIfNeeded } from "@/utils/subscription";

type Product = {
  id: string;
  name: string;
  description: string | null;
  content_type: string;
  content_url: string;
  image_url?: string | null;
  user_id: string;
};

const Products = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const userId = session.user.id;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar produtos");
      }
      setProducts(data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const copyProductLink = (productId: string) => {
    const base = import.meta.env.BASE_URL || "/";
    const link = `${window.location.origin}${base}pay/${productId}`;
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
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Produtos Criados</h1>
          <Button onClick={() => navigate("/dashboard/new-product")}>Criar Produto</Button>
        </div>
        {products.length === 0 ? (
          <Card className="border-primary/20">
            <CardContent className="py-8">
              <p className="text-muted-foreground">Nenhum produto criado.</p>
              <Button className="mt-4" onClick={() => navigate("/dashboard/new-product")}>Criar novo produto</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <Card key={p.id} className="border-primary/20 hover:border-primary/40 transition">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm truncate">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="w-full h-[180px] bg-muted rounded overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">180×180</div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/product/${p.id}`)} className="gap-1">
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => copyProductLink(p.id)}>Copiar link</Button>
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

export default Products;
