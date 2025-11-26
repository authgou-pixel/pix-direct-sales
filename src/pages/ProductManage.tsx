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

type Module = {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  order_index: number;
};

type Lesson = {
  id: string;
  product_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  order_index: number;
  content_type: string | null;
  content_url: string | null;
};

const ProductManage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [productName, setProductName] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");
  const [newLessonContentType, setNewLessonContentType] = useState("video");
  const [newLessonContentUrl, setNewLessonContentUrl] = useState("");
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadProduct();
      await loadModules();
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

  const loadModules = async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("product_id", productId)
      .order("order_index", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar módulos");
      return;
    }
    setModules(data || []);
    setCurrentModuleId(data?.[0]?.id ?? null);
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

  const addModule = async () => {
    if (!newModuleTitle.trim()) {
      toast.error("Informe o título do módulo");
      return;
    }
    const nextOrder = (modules[modules.length - 1]?.order_index ?? 0) + 1;
    const { error } = await supabase
      .from("modules")
      .insert({
        product_id: productId as string,
        title: newModuleTitle,
        description: newModuleDescription || null,
        order_index: nextOrder,
      });
    if (error) {
      toast.error("Erro ao adicionar módulo");
      return;
    }
    setNewModuleTitle("");
    setNewModuleDescription("");
    await loadModules();
    toast.success("Módulo adicionada");
  };

  const addLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast.error("Informe o título da aula");
      return;
    }
    const nextOrder = (lessons.filter(l => l.module_id === currentModuleId).slice(-1)[0]?.order_index ?? 0) + 1;
    const { error } = await supabase
      .from("lessons")
      .insert({
        product_id: productId as string,
        module_id: currentModuleId,
        title: newLessonTitle,
        description: newLessonDescription || null,
        order_index: nextOrder,
        content_type: newLessonContentType,
        content_url: newLessonContentUrl || null,
      });
    if (error) {
      toast.error(error.message || "Erro ao adicionar aula");
      return;
    }
    setNewLessonTitle("");
    setNewLessonDescription("");
    setNewLessonContentUrl("");
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

  const removeModule = async (id: string) => {
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover módulo");
      return;
    }
    await loadModules();
    await loadLessons();
    toast.success("Módulo removido");
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
            <CardTitle>Adicionar Módulo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newModuleDescription} onChange={(e) => setNewModuleDescription(e.target.value)} />
            </div>
            <Button onClick={addModule} className="bg-primary">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Módulo
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20 mb-8">
          <CardHeader>
            <CardTitle>Adicionar Aula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Módulo</Label>
              <select className="w-full border rounded p-2" value={currentModuleId ?? ""} onChange={(e) => setCurrentModuleId(e.target.value || null)}>
                <option value="">Sem módulo</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newLessonDescription} onChange={(e) => setNewLessonDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Conteúdo</Label>
                <select className="w-full border rounded p-2" value={newLessonContentType} onChange={(e) => setNewLessonContentType(e.target.value)}>
                  <option value="video">Vídeo</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                </select>
              </div>
              <div>
                <Label>URL do Conteúdo</Label>
                <Input value={newLessonContentUrl} onChange={(e) => setNewLessonContentUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <Button onClick={addLesson} className="bg-primary">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Aula
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Módulos e Aulas</CardTitle>
          </CardHeader>
          <CardContent>
            {modules.length === 0 && lessons.length === 0 ? (
              <p className="text-muted-foreground">Nenhum módulo/aula cadastrado.</p>
            ) : (
              <div className="space-y-6">
                {modules.map((m) => (
                  <div key={m.id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold">{m.title}</div>
                        {m.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{m.description}</div>}
                      </div>
                      <Button variant="outline" onClick={() => removeModule(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {lessons.filter(l => l.module_id === m.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem aulas neste módulo.</p>
                      ) : (
                        lessons.filter(l => l.module_id === m.id).map((lesson) => (
                          <div key={lesson.id} className="border rounded p-3 flex justify-between items-start">
                            <div>
                              <div className="font-medium">{lesson.title}</div>
                              {lesson.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.description}</div>}
                              {lesson.content_url && <div className="text-xs text-muted-foreground">{lesson.content_type?.toUpperCase()} • {lesson.content_url}</div>}
                            </div>
                            <Button variant="outline" onClick={() => removeLesson(lesson.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}

                {lessons.filter(l => !l.module_id).length > 0 && (
                  <div className="border rounded p-4">
                    <div className="font-semibold mb-2">Aulas sem módulo</div>
                    <div className="space-y-2">
                      {lessons.filter(l => !l.module_id).map((lesson) => (
                        <div key={lesson.id} className="border rounded p-3 flex justify-between items-start">
                          <div>
                            <div className="font-medium">{lesson.title}</div>
                            {lesson.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.description}</div>}
                            {lesson.content_url && <div className="text-xs text-muted-foreground">{lesson.content_type?.toUpperCase()} • {lesson.content_url}</div>}
                          </div>
                          <Button variant="outline" onClick={() => removeLesson(lesson.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProductManage;
