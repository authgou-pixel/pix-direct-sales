export type Timeframe = "daily" | "weekly" | "monthly";

export function filterByTimeframe(raw: { amount: number; created_at: string }[], tf: Timeframe) {
  const now = new Date();
  const start = new Date(now);
  if (tf === "daily") start.setDate(now.getDate() - 1);
  else if (tf === "weekly") start.setDate(now.getDate() - 7);
  else start.setDate(now.getDate() - 30);
  return raw.filter((r) => new Date(r.created_at) >= start);
}

export function aggregateSeries(raw: { amount: number; created_at: string }[], tf: Timeframe) {
  const byKey: Record<string, number> = {};
  for (const item of raw) {
    const d = new Date(item.created_at);
    let key = "";
    if (tf === "daily") {
      key = d.toISOString().slice(0, 10);
    } else if (tf === "weekly") {
      const tmp = new Date(d);
      const day = tmp.getUTCDay();
      const diff = tmp.getUTCDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(tmp.setUTCDate(diff));
      key = monday.toISOString().slice(0, 10);
    } else {
      key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    byKey[key] = (byKey[key] || 0) + Number(item.amount);
  }
  return Object.keys(byKey)
    .sort()
    .map((k) => ({ date: k, value: byKey[k] }));
}

