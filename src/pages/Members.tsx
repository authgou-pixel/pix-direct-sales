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
  image_url?: string | null;
};

type Lesson = {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  order_index: number;
  module_id: string | null;
  content_type: string | null;
  content_url: string | null;
};

const Members = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [buyerEmail, setBuyerEmail] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const email = session.user.email as string;
      setBuyerEmail(email);
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
          .select("*")
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
          .select("*")
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {memberships.map((m) => {
              const p = products[m.product_id];
              const ls = (lessons[m.product_id] || []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
              const firstLessonId = ls[0]?.id;
              const handleOpen = () => {
                if (m.status !== 'approved') return;
                if (firstLessonId) {
                  navigate(`/members/product/${m.product_id}/lesson/${firstLessonId}`);
                } else {
                  toast.info('Nenhuma aula cadastrada');
                }
              };
              return (
                <Card key={m.id} className={`border-primary/20 hover:border-primary/40 transition cursor-pointer relative ${m.status !== 'approved' ? 'opacity-60' : ''}`} onClick={handleOpen}>
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="w-[246px] h-[246px] bg-muted rounded overflow-hidden mx-auto">
                        {/* imagem do produto, se houver */}
                        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                        {/* @ts-ignore opcional enquanto schema não tem image_url */}
                        {p?.image_url ? (
                          <img src={p.image_url} alt={p?.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">246×246</div>
                        )}
                      </div>
                      <div className="mt-3 font-semibold text-center">{p?.name || m.product_id}</div>
                      {p?.description && <div className="text-xs text-muted-foreground text-center line-clamp-2">{p.description}</div>}
                      <div className="mt-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${m.status === 'approved' ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground'}`}>{m.status === 'approved' ? 'Acesso liberado' : 'Aguardando aprovação'}</span>
                      </div>
                    </div>
                    {m.status !== 'approved' && (
                      <div className="absolute inset-0 flex items-end justify-center p-3 pointer-events-none">
                        <Button variant="outline" className="pointer-events-auto" onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const resp = await fetch('/api/refresh-membership', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ productId: m.product_id, buyerEmail }),
                            });
                            const data = await resp.json();
                            if (resp.ok && data?.status) {
                              setMemberships(prev => prev.map(x => x.product_id === m.product_id ? { ...x, status: data.status } : x));
                              if (data.status === 'approved') toast.success('Pagamento aprovado'); else toast.info(`Status: ${data.status}`);
                            } else {
                              toast.error(data?.error || 'Erro ao atualizar status');
                            }
                          } catch {
                            toast.error('Erro ao atualizar status');
                          }
                        }}>Atualizar status</Button>
                      </div>
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
