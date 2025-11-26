import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  user_id: string;
}

const PaymentPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Simulação de código PIX (em produção viria do Mercado Pago)
  const pixCode = "00020126580014br.gov.bcb.pix0136a629532e-7693-4846-852d-1bbff6b2f8b520400005303986540510.005802BR5913Loja Virtual6009Sao Paulo62410503***50300017br.gov.bcb.brcode01051.0.063043D5C";

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      toast.error("Produto não encontrado");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayment = async () => {
    if (!buyerEmail || !buyerName) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Aqui em produção seria chamada a API do Mercado Pago
    // Por enquanto apenas simulamos
    try {
      const { error } = await supabase.from("sales").insert({
        product_id: product!.id,
        seller_id: product!.user_id,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        amount: product!.price,
        payment_status: "pending",
      });

      if (error) throw error;
      
      setShowPayment(true);
      toast.success("Pagamento gerado! Escaneie o QR Code ou copie o código PIX");
    } catch (error: any) {
      toast.error("Erro ao gerar pagamento");
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Produto não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-purple border-primary/20">
        {!showPayment ? (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
              <div className="pt-4">
                <p className="text-3xl font-bold text-primary">
                  R$ {product.price.toFixed(2)}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buyer_name">Seu Nome</Label>
                <Input
                  id="buyer_name"
                  placeholder="Nome completo"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="border-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buyer_email">Seu Email</Label>
                <Input
                  id="buyer_email"
                  type="email"
                  placeholder="seu@email.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="border-primary/20"
                />
              </div>

              <Button 
                className="w-full bg-gradient-hero hover:opacity-90 shadow-purple"
                onClick={handleGeneratePayment}
              >
                Gerar Pagamento PIX
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="flex items-center gap-2">
                <QrCode className="h-6 w-6 text-primary" />
                <CardTitle>Pagamento via PIX</CardTitle>
              </div>
              <CardDescription>
                Escaneie o QR Code ou copie o código PIX para pagar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-6 rounded-lg flex items-center justify-center">
                <div className="w-64 h-64 bg-muted flex items-center justify-center rounded-lg">
                  <QrCode className="h-32 w-32 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground absolute mt-48">
                    QR Code PIX
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Código PIX</Label>
                <div className="flex gap-2">
                  <Input
                    value={pixCode}
                    readOnly
                    className="font-mono text-xs border-primary/20"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPixCode}
                    className="border-primary/20 hover:bg-primary/10"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium mb-1">Valor a pagar</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {product.price.toFixed(2)}
                </p>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Abra o app do seu banco</p>
                <p>• Escolha pagar via PIX</p>
                <p>• Escaneie o QR Code ou cole o código</p>
                <p>• Confirme o pagamento</p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentPage;
