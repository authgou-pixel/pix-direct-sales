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
  const [emailValid, setEmailValid] = useState<boolean>(false);
  const [nameValid, setNameValid] = useState<boolean>(false);
  const [touched, setTouched] = useState<{ email: boolean; name: boolean }>({ email: false, name: false });
  const [showPayment, setShowPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");
  const [sellerBlocked, setSellerBlocked] = useState<boolean>(false);

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
    if (!buyerEmail || !buyerName || !emailValid || !nameValid) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product!.id,
          buyerEmail,
          buyerName,
        }),
      });

      const isJson = resp.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await resp.json() : { error: await resp.text() };
      if (!resp.ok) {
        if (resp.status === 403) {
          setSellerBlocked(true);
          toast.error("O vendedor precisa renovar a assinatura para ativar os pagamentos.");
          setShowPayment(false);
          return;
        }
        const details = typeof data?.details === "string" ? data.details : JSON.stringify(data?.details ?? {});
        throw new Error(`${data?.error || "Erro ao gerar pagamento"}${details ? `: ${details}` : ""}`);
      }

      setQrCode(data.qr_code || "");
      setQrCodeBase64(data.qr_code_base64 || "");
      setPaymentId(data.payment_id || "");
      setStatus(data.status || "pending");
      setShowPayment(true);
      toast.success("Pagamento gerado! Escaneie o QR Code ou copie o código PIX");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao gerar pagamento";
      toast.error(message);
    }
  };

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    setEmailValid(emailRegex.test(buyerEmail.trim()));
  }, [buyerEmail]);

  useEffect(() => {
    const onlyLetters = buyerName.trim().length > 1;
    setNameValid(onlyLetters);
  }, [buyerName]);

  useEffect(() => {
    if (!paymentId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/check-payment-status?paymentId=${paymentId}`);
        const data = await resp.json();
        if (resp.ok && data?.status) {
          setStatus(data.status);
          if (data.status === "approved") {
            toast.success("Compra aprovada!");
            clearInterval(interval);
          }
        }
      } catch { void 0; }
    }, 5000);
    return () => clearInterval(interval);
  }, [paymentId]);

  const copyPixCode = () => {
    navigator.clipboard.writeText(qrCode);
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
              {sellerBlocked && (
                <div className="border border-destructive/20 bg-destructive/10 text-destructive rounded p-3">
                  Este vendedor precisa renovar a assinatura para ativar os pagamentos.
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="buyer_name" className="text-primary">Seu Nome</Label>
                <Input
                  id="buyer_name"
                  placeholder="Nome completo"
                  value={buyerName}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");
                    setBuyerName(v);
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  aria-invalid={touched.name && !nameValid}
                  className="border-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary rounded-lg"
                />
                {touched.name && (
                  <p className={`text-xs ${nameValid ? "text-success" : "text-destructive"}`}>
                    {nameValid ? "Nome válido" : "Use apenas letras e espaços"}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buyer_email" className="text-primary">Seu Email</Label>
                <Input
                  id="buyer_email"
                  type="email"
                  placeholder="seu@email.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  aria-invalid={touched.email && !emailValid}
                  className="border-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary rounded-lg"
                />
                {touched.email && (
                  <p className={`text-xs ${emailValid ? "text-success" : "text-destructive"}`}>
                    {emailValid ? "E‑mail válido" : "Informe um e‑mail válido"}
                  </p>
                )}
              </div>

              <Button 
                className="w-full bg-gradient-hero hover:opacity-90 shadow-purple"
                onClick={handleGeneratePayment}
                disabled={sellerBlocked || !emailValid || !nameValid}
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
                {qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-64 h-64 rounded-lg"
                  />
                ) : (
                  <div className="w-64 h-64 bg-muted flex items-center justify-center rounded-lg">
                    <QrCode className="h-32 w-32 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground absolute mt-48">QR Code PIX</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Código PIX</Label>
                <div className="flex gap-2">
                  <Input value={qrCode} readOnly className="font-mono text-xs border-primary/20" />
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

              {status === "approved" && (
                <div className="border rounded-lg p-4 bg-success/10 border-success/20">
                  <p className="font-medium text-success">Compra aprovada</p>
                  <Button className="mt-3 w-full" asChild>
                    <a href={`/auth?signup=1&prefillEmail=${encodeURIComponent(buyerEmail)}`}>Criar conta e acessar</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentPage;
