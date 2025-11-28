import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = (req.query?.userId as string) || "";
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const SUPABASE_URL = process.env.SUPABASE_URL as string;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Supabase server env not configured" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status,last_payment_id")
      .eq("user_id", userId)
      .maybeSingle();

    const currentStatus = sub?.status || "inactive";
    const paymentId = sub?.last_payment_id || null;

    if (!paymentId) {
      return res.status(200).json({ status: currentStatus });
    }

    const { data: mpConfig } = await supabase
      .from("mercado_pago_config")
      .select("access_token")
      .eq("user_id", userId)
      .single();

    if (!mpConfig) {
      return res.status(400).json({ error: "Mercado Pago not configured for seller" });
    }

    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpConfig.access_token}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Mercado Pago API error", details: data });
    }

    const status = data?.status || currentStatus || "pending";

    // Determine plan by amount to compute expiry: 2.00 => 5 min, otherwise 30 days
    const amount = Number(data?.transaction_amount ?? 0);
    const now = Date.now();
    const expiresAt = new Date(amount === 2 ? now + 5 * 60 * 1000 : now + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (status === "approved") {
      await supabase
        .from("subscriptions")
        .update({ status: "active", activated_at: new Date().toISOString(), expires_at: expiresAt })
        .eq("user_id", userId);
    } else {
      await supabase
        .from("subscriptions")
        .update({ status })
        .eq("user_id", userId);
    }

    return res.status(200).json({ status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return res.status(500).json({ error: message });
  }
}

