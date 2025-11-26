import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Lesson = {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  order_index: number;
};

const ProductManage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [productName, setProductName] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadProduct();
      await loadLessons();
      setLoading(false);
    };
    checkAuth();
  }, [navigate, productId]);

  const loadProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("name")
      .eq("id", productId)
      .single();
    if (error) {
      toast.error("Produto não encontrado");
      navigate("/dashboard");
      return;
    }
    setProductName(data.name);
  };

  const loadLessons = async () => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("product_id", productId)
      .order("order_index", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar aulas");
      return;
    }
    setLessons(data || []);
  };

  const addLesson = async () => {
    if (!newTitle.trim()) {
      toast.error("Informe o título da aula");
      return;
    }
    const nextOrder = (lessons[lessons.length - 1]?.order_index ?? 0) + 1;
    const { error } = await supabase
      .from("lessons")
      .insert({
        product_id: productId as string,
        title: newTitle,
        description: newDescription || null,
        order_index: nextOrder,
      });
    if (error) {
      toast.error("Erro ao adicionar aula");
      return;
    }
    setNewTitle("");
    setNewDescription("");
    await loadLessons();
    toast.success("Aula adicionada");
  };

  const removeLesson = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover aula");
      return;
    }
    await loadLessons();
    toast.success("Aula removida");
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
          <button className="text-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 inline mr-2" /> Voltar
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Gerenciar Produto</h1>
        <p className="text-muted-foreground mb-8">{productName}</p>

        <Card className="border-primary/20 mb-8">
          <CardHeader>
            <CardTitle>Adicionar Aula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
            <Button onClick={addLesson} className="bg-primary">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Aula
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma aula cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson) => (
                  <div key={lesson.id} className="border rounded p-4 flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{lesson.title}</div>
                      {lesson.description && (
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.description}</div>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => removeLesson(lesson.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProductManage;

