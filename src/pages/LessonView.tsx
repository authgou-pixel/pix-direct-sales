import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Product = { id: string; name: string; description: string | null };
type Module = { id: string; product_id: string; title: string };
type Lesson = { id: string; module_id: string | null; title: string; description: string | null; content_type: string | null; content_url: string | null };

const LessonView = () => {
  const navigate = useNavigate();
  const { productId, lessonId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: p } = await supabase.from("products").select("id,name,description").eq("id", productId).maybeSingle();
      setProduct(p || null);

      const { data: l } = await supabase.from("lessons").select("*").eq("product_id", productId).order("order_index", { ascending: true });
      setLessons(l || []);

      const { data: m } = await supabase.from("modules").select("*").eq("product_id", productId).order("order_index", { ascending: true });
      setModules(m || []);

      const current = (l || []).find(x => x.id === lessonId) || null;
      setLesson(current);
      setLoading(false);
    };
    init();
  }, [navigate, productId, lessonId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md"><CardContent className="pt-6"><p className="text-center text-muted-foreground">Aula não encontrada</p></CardContent></Card>
      </div>
    );
  }

  const moduleLessons = lessons.filter(x => x.module_id === lesson.module_id);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>{lesson.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.content_type === "video" && lesson.content_url ? (
                <div className="aspect-video w-full bg-black">
                  <iframe title={lesson.title} src={lesson.content_url} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
              ) : lesson.content_type === "pdf" && lesson.content_url ? (
                <div className="w-full h-[70vh]">
                  <iframe title={lesson.title} src={lesson.content_url} className="w-full h-full"></iframe>
                </div>
              ) : lesson.content_url ? (
                <Button asChild><a href={lesson.content_url} target="_blank" rel="noreferrer">Abrir Conteúdo</a></Button>
              ) : (
                <p className="text-muted-foreground">Sem conteúdo associado.</p>
              )}
              {lesson.description && <div className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{lesson.description}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Módulos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {modules.map(m => (
                  <div key={m.id} className="border rounded p-3">
                    <div className="font-medium mb-2">{m.title}</div>
                    <div className="space-y-1">
                      {lessons.filter(x => x.module_id === m.id).map(x => (
                        <Button key={x.id} variant={x.id === lesson.id ? "default" : "outline"} className="w-full justify-start" onClick={() => navigate(`/members/product/${productId}/lesson/${x.id}`)}>
                          {x.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
