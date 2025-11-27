import { supabase } from "@/integrations/supabase/client";

export type SubscriptionInfo = {
  status: string;
  expires_at: string | null;
};

export async function getCurrentSubscription(): Promise<SubscriptionInfo | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const userId = session.user.id;
  const { data } = await supabase
    .from("subscriptions")
    .select("status,expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { status: data.status, expires_at: data.expires_at };
}

export function isSubscriptionActive(info: SubscriptionInfo | null): boolean {
  if (!info) return false;
  if (info.status !== "active") return false;
  if (!info.expires_at) return false;
  return new Date(info.expires_at) > new Date();
}

export async function markExpiredIfNeeded(info: SubscriptionInfo | null): Promise<void> {
  if (!info) return;
  const expired = info.expires_at ? new Date(info.expires_at) <= new Date() : true;
  if (expired && info.status !== "expired") {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", session.user.id);
  }
}
