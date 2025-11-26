import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const NewProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    content_type: "pdf",
    content_url: "",
    image_url: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        navigate("/auth");
        return;
      }

      let { error } = await supabase.from("products").insert({
        user_id: session.user.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        content_type: formData.content_type,
        content_url: formData.content_url,
        is_active: true,
        // opcional: imagem do produto, requer coluna image_url no schema
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore enquanto coluna não existir em types
        image_url: formData.image_url || undefined,
      });

      if (error && String(error.message).toLowerCase().includes("image_url")) {
        error = undefined;
        const retry = await supabase.from("products").insert({
          user_id: session.user.id,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          content_type: formData.content_type,
          content_url: formData.content_url,
          is_active: true,
        });
        if (retry.error) throw retry.error;
        toast.info("Imagem não salva — adicione a coluna image_url no Supabase");
      }

      if (error) throw error;

      toast.success("Produto criado com sucesso!");
      navigate("/dashboard");
    } catch (err) {
      const message = (err as { message?: string }).message;
      toast.error(message || "Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-2 hover:bg-primary/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">Novo Produto</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-primary/20 shadow-purple">
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>
              Preencha os dados do seu produto digital
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  placeholder="Ex: E-book de Marketing Digital"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva seu produto..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="border-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_type">Tipo de Conteúdo *</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                >
                  <SelectTrigger className="border-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF / E-book</SelectItem>
                    <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content_url">
                  {formData.content_type === "video" ? "Link do YouTube *" : "Link do Arquivo *"}
                </Label>
                <Input
                  id="content_url"
                  type="url"
                  placeholder={
                    formData.content_type === "video"
                      ? "https://youtube.com/watch?v=..."
                      : "https://..."
                  }
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  required
                  className="border-primary/20"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.content_type === "video"
                    ? "Cole o link completo do vídeo do YouTube"
                    : "Cole o link onde o arquivo está hospedado"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Imagem do Produto (246×246)</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://.../imagem-246x246.png"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="border-primary/20"
                />
                <p className="text-sm text-muted-foreground">Medida recomendada: 246×246. Use uma URL pública.</p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-hero hover:opacity-90 shadow-purple"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Produto"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewProduct;
