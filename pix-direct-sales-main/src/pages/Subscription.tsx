import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Subscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("inactive");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [qrCode, setQrCode] = useState<string>("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string>("");
  const [paymentId, setPaymentId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const userId = session.user.id;
      const { data } = await supabase
        .from("subscriptions")
        .select("status,expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setExpiresAt(data.expires_at);
      }
      const maybeEmail = session.user.email;
      setBuyerEmail(typeof maybeEmail === "string" ? maybeEmail : "");
      const meta = session.user.user_metadata as Record<string, unknown> | null | undefined;
      const maybeName = meta && typeof meta["name"] === "string" ? (meta["name"] as string) : "";
      setBuyerName(maybeName);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleCreate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const userId = session.user.id;
      const resp = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, buyerEmail, buyerName }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data?.error || "Erro ao gerar assinatura");
        return;
      }
      setPaymentId(data.payment_id || "");
      setStatus(data.status || "pending");
      setQrCode(data.qr_code || "");
      setQrCodeBase64(data.qr_code_base64 || "");
    } catch {
      toast.error("Erro ao iniciar assinatura");
    }
  };

  const handleRefresh = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      const resp = await fetch(`/api/check-subscription-status?userId=${encodeURIComponent(userId)}`);
      const data = await resp.json();
      if (resp.ok && data?.status) {
        setStatus(data.status);
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("expires_at")
          .eq("user_id", userId)
          .maybeSingle();
        setExpiresAt(sub?.expires_at || null);
        if (data.status === "approved" || data.status === "active") toast.success("Assinatura ativa"); else toast.info(`Status: ${data.status}`);
      } else {
        toast.error((data && typeof data.error === "string" ? data.error : undefined) || "Erro ao atualizar status");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao atualizar status";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const expired = expiresAt ? new Date(expiresAt) <= new Date() : true;
  const active = status === "active" && !expired;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Assinatura</h1>
        {active ? (
          <Card>
            <CardHeader>
              <CardTitle>Plano Mensal</CardTitle>
              <CardDescription>R$ 37,90 por 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">Sua assinatura está ativa.</div>
              <div className="text-sm">Expira em: {expiresAt ? new Date(expiresAt).toLocaleString() : "-"}</div>
              <div className="mt-4">
                <Button onClick={handleCreate}>Renovar Assinatura</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Plano Mensal</CardTitle>
              <CardDescription>R$ 37,90 por 30 dias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!qrCode && (
                <>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleCreate}>Assinar Agora</Button>
                </>
              )}
              {qrCode && (
                <>
                  <div className="bg-white p-6 rounded-lg flex items-center justify-center">
                    {qrCodeBase64 ? (
                      <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code" />
                    ) : (
                      <div className="text-sm">{qrCode}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRefresh}>Atualizar status</Button>
                    <Button onClick={() => setQrCode("")}>Nova tentativa</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Subscription;
