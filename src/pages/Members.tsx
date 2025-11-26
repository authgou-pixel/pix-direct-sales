import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Membership = {
  id: string;
  product_id: string;
  status: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  content_type: string;
  content_url: string;
};

type Lesson = {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  order_index: number;
};

const Members = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const email = session.user.email as string;
      const userId = session.user.id;

      const { data: msData, error: msError } = await supabase
        .from("memberships")
        .select("id, product_id, status")
        .or(`buyer_user_id.eq.${userId},buyer_email.eq.${email}`);
      if (msError) {
        toast.error("Erro ao carregar membros");
        return;
      }
      setMemberships(msData || []);

      const productIds = Array.from(new Set((msData || []).map(m => m.product_id)));
      if (productIds.length > 0) {
        const { data: pData, error: pError } = await supabase
          .from("products")
          .select("id,name,description,content_type,content_url")
          .in("id", productIds);
        if (pError) {
          toast.error("Erro ao carregar produtos");
          return;
        }
        const mapP: Record<string, Product> = {};
        (pData || []).forEach(p => { mapP[p.id] = p; });
        setProducts(mapP);

        const { data: lData, error: lError } = await supabase
          .from("lessons")
          .select("id,product_id,title,description,order_index")
          .in("product_id", productIds)
          .order("order_index", { ascending: true });
        if (!lError) {
          const mapL: Record<string, Lesson[]> = {};
          (lData || []).forEach(l => {
            if (!mapL[l.product_id]) mapL[l.product_id] = [];
            mapL[l.product_id].push(l);
          });
          setLessons(mapL);
        }
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

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
        <h1 className="text-3xl font-bold mb-6">Meus Produtos</h1>
        {memberships.length === 0 ? (
          <Card className="border-primary/20">
            <CardContent className="py-8">
              <p className="text-muted-foreground">Nenhum produto disponível.</p>
              <Button className="mt-4" onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {memberships.map((m) => {
              const p = products[m.product_id];
              const ls = lessons[m.product_id] || [];
              return (
                <Card key={m.id} className="border-primary/20">
                  <CardHeader>
                    <CardTitle>{p?.name || m.product_id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 text-sm">
                      Status: <span className={`px-2 py-1 rounded text-xs ${m.status === 'approved' ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground'}`}>{m.status}</span>
                    </div>
                    {p?.description && <p className="text-muted-foreground mb-4">{p.description}</p>}
                    <div className="space-y-2">
                      {ls.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem aulas cadastradas.</p>
                      ) : (
                        ls.map(l => (
                          <div key={l.id} className="border rounded p-3">
                            <div className="font-medium">{l.title}</div>
                            {l.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{l.description}</div>}
                          </div>
                        ))
                      )}
                    </div>
                    {p?.content_type && p?.content_url && (
                      m.status === 'approved' ? (
                        <Button className="mt-4" asChild>
                          <a href={p.content_url} target="_blank" rel="noreferrer">Abrir Conteúdo ({p.content_type.toUpperCase()})</a>
                        </Button>
                      ) : (
                        <Button className="mt-4" variant="outline" disabled>
                          Aguardando aprovação do pagamento
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Members;
