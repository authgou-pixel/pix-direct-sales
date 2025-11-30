import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// removed Input import as it is not used
import { toast } from "sonner";
import { Check, Clock, Menu, ChevronLeft, CalendarRange, CheckCircle2, FileJson, FileText } from "lucide-react";

export async function setSaleStatus(client: any, saleId: string, toStatus: string, userId: string) {
  const allowed = ["approved", "pending"] as const;
  const status = (toStatus || "").toLowerCase();
  if (!allowed.includes(status as any)) throw new Error("Status inválido");
  const q1 = client.from("sales").update({ payment_status: status }).eq("id", saleId).eq("seller_id", userId);
  const { error } = await q1;
  if (error) throw error;
  return status;
}

type Sale = {
  id: string;
  amount: number;
  payment_status: string;
  product_id?: string | null;
  created_at: string;
  buyer_email?: string | null;
  buyer_name?: string | null;
};

type Product = { id: string; name: string };

type Timeframe = "custom";

const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [timeframe, setTimeframe] = useState<Timeframe>("custom");
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const [onlyConfirmed, setOnlyConfirmed] = useState(false);
  const [limitTo4, setLimitTo4] = useState(false);
  const [historySaleId, setHistorySaleId] = useState<string | null>(null);
  const [mobileMenuExpanded, setMobileMenuExpanded] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadSales(session.user.id);
    };
    init();
  }, []);

  useEffect(() => {
    const refresh = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      await loadSales(uid);
    };
    refresh();
  }, [range.from, range.to]);

  const period = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    {
      if (range.from && range.to) {
        start = new Date(range.from);
        start.setHours(0, 0, 0, 0);
        end = new Date(range.to);
        end.setHours(23, 59, 59, 999);
      } else {
        end.setHours(23, 59, 59, 999);
        start = new Date(end);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
      }
    }
    return { start, end };
  }, [range]);

  const loadSales = async (userId: string) => {
    try {
      setLoading(true);
      const startISO = period.start.toISOString();
      const endISO = period.end.toISOString();
      const { data, error } = await supabase
        .from("sales")
        .select("id,amount,created_at,payment_status,product_id,buyer_email,buyer_name")
        .eq("seller_id", userId)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar vendas");
        setSales([]);
      } else {
        setSales(data || []);
        const ids = Array.from(new Set((data || []).map(s => s.product_id).filter(Boolean))) as string[];
        if (ids.length > 0) {
          const { data: prods } = await supabase
            .from("products")
            .select("id,name")
            .in("id", ids);
          const map: Record<string, Product> = {};
          (prods || []).forEach(p => { map[p.id] = p; });
          setProducts(map);
        } else {
          setProducts({});
        }
      }
    } catch {
      toast.error("Erro ao carregar vendas");
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (list: Sale[]) => {
    let filtered = list;
    if (onlyConfirmed) {
      filtered = filtered.filter((s) => (s.payment_status || "").toLowerCase() === "approved");
    }
    if (limitTo4) {
      filtered = filtered.slice(0, 4);
    }
    return filtered;
  };

  const getStatusInfo = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return { label: "APROVADO", color: "bg-[#00B14F] text-white" };
    if (s === "pending") return { label: "PENDENTE", color: "bg-[#FFA500] text-black" };
    return { label: (status || "-").toUpperCase(), color: "bg-muted text-foreground" };
  };

  const getHistory = (id: string) => {
    const raw = localStorage.getItem(`sale_status_history_${id}`);
    return raw ? JSON.parse(raw) as Array<{ at: string; from: string; to: string }> : [];
  };

  const pushHistory = (id: string, from: string, to: string) => {
    const hist = getHistory(id);
    hist.unshift({ at: new Date().toISOString(), from, to });
    localStorage.setItem(`sale_status_history_${id}`, JSON.stringify(hist));
  };

  const updateStatus = async (sale: Sale, toStatus: string) => {
    const fromStatus = sale.payment_status || "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error("Usuário não autenticado");
      const status = await setSaleStatus(supabase, sale.id, toStatus, uid);
      setSales((prev) => prev.map((s) => s.id === sale.id ? { ...s, payment_status: status } : s));
      pushHistory(sale.id, fromStatus, toStatus);
      const label = status === "approved" ? "APROVADO" : status === "pending" ? "PENDENTE" : status.toUpperCase();
      toast.success("Status atualizado para " + label);
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      const parts = [err.message, err.code, err.details, err.hint].filter(Boolean);
      toast.error(parts.join(" — ") || "Falha ao atualizar status");
    }
  };

  const exportJSON = () => {
    const data = applyFilters(sales);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendas.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const data = applyFilters(sales);
    const headers = ["id","created_at","amount","product","method","client","status"];
    const rows = data.map(s => [
      s.id,
      new Date(s.created_at).toISOString(),
      String(s.amount),
      s.product_id ? (products[s.product_id]?.name || s.product_id) : "",
      "PIX",
      s.buyer_name || s.buyer_email || "",
      (s.payment_status || "").toUpperCase(),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendas.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="relative z-40 border-b bg-card/50 backdrop-blur-sm border-primary/20">
        <div className={`container mx-auto px-4 py-4 flex items-center justify-between md:px-6`}>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" className="h-10 px-3" onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-10 px-3">Selecionar período</Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 bg-card border border-border rounded-lg shadow-md w-[95vw] max-w-[680px] sm:w-auto sm:min-w-[640px]" align="center" sideOffset={8}>
                <Calendar mode="range" selected={{ from: range.from, to: range.to }} onSelect={(r: { from?: Date; to?: Date } | undefined) => setRange(r || {})} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
            <Button variant={onlyConfirmed ? "default" : "ghost"} className="h-10 px-3" onClick={() => setOnlyConfirmed(v => !v)} aria-pressed={onlyConfirmed}>Apenas confirmadas</Button>
            <Button variant="ghost" className="h-10 px-3" onClick={exportJSON}>Exportar JSON</Button>
            <Button variant="ghost" className="h-10 px-3" onClick={exportCSV}>Exportar CSV</Button>
          </div>
          <button
            aria-label="Abrir menu"
            aria-expanded={mobileMenuExpanded}
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full bg-card border border-border/60 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition"
            onClick={() => setMobileMenuExpanded(v => !v)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-xs text-muted-foreground hidden md:block">
            <span className="mr-3">Identificadas: {sales.length}</span>
            <span>Confirmadas: {sales.filter(s => (s.payment_status || '').toLowerCase() === 'approved').length}</span>
          </div>
        </div>
      </header>

      <main className={`mx-auto px-4 py-6 md:px-6`}>
        <div
          className={`md:hidden fixed left-0 top-0 h-screen w-64 bg-card border-r border-border/50 pt-16 z-30 transform transition-transform duration-300 ease-out will-change-transform ${mobileMenuExpanded ? "translate-x-0" : "-translate-x-full"}`}
        >
          <nav className="flex flex-col gap-1 px-2">
            <Button variant="ghost" className="justify-start h-12 px-2 gap-3 hover:bg-muted" onClick={() => { navigate('/dashboard'); setMobileMenuExpanded(false); }}>
              <ChevronLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="justify-start h-12 px-2 gap-3 hover:bg-muted">
                  <CalendarRange className="h-4 w-4" />
                  <span>Selecionar período</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2 bg-card border border-border rounded-lg shadow-md w-[95vw] max-w-[680px] sm:w-auto sm:min-w-[640px]" align="center" sideOffset={8}>
                <Calendar mode="range" selected={{ from: range.from, to: range.to }} onSelect={(r: { from?: Date; to?: Date } | undefined) => setRange(r || {})} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
            <Button variant={onlyConfirmed ? "default" : "ghost"} className="justify-start h-12 px-2 gap-3 hover:bg-muted" onClick={() => setOnlyConfirmed(v => !v)} aria-pressed={onlyConfirmed}>
              <CheckCircle2 className="h-4 w-4" />
              <span>Apenas confirmadas</span>
            </Button>
            <Button variant="ghost" className="justify-start h-12 px-2 gap-3 hover:bg-muted" onClick={() => { exportJSON(); setMobileMenuExpanded(false); }}>
              <FileJson className="h-4 w-4" />
              <span>Exportar JSON</span>
            </Button>
            <Button variant="ghost" className="justify-start h-12 px-2 gap-3 hover:bg-muted" onClick={() => { exportCSV(); setMobileMenuExpanded(false); }}>
              <FileText className="h-4 w-4" />
              <span>Exportar CSV</span>
            </Button>
          </nav>
        </div>
        <Card className="border-primary/20 relative z-10">
          <CardHeader>
            <CardTitle className="text-sm">Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : sales.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">Sem vendas no período selecionado</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-2 px-2 pb-2 text-xs text-muted-foreground min-w-[900px]">
                  <div>Data</div>
                  <div>Valor</div>
                  <div>Item</div>
                  <div>Método</div>
                  <div>Cliente</div>
                  <div>Status</div>
                  <div>Ações</div>
                </div>
                <div className="divide-y min-w-[900px]">
                  {applyFilters(sales).map(s => (
                    <div key={s.id} className="grid grid-cols-7 gap-2 px-2 py-2 text-sm">
                      <div>{new Date(s.created_at).toLocaleString()}</div>
                      <div>R$ {Number(s.amount).toFixed(2)}</div>
                      <div>{s.product_id ? (products[s.product_id]?.name || s.product_id) : "-"}</div>
                      <div>PIX</div>
                      <div>{s.buyer_name || s.buyer_email || "-"}</div>
                      <div>
                        {(() => {
                          const info = getStatusInfo(s.payment_status);
                          return <Badge className={`${info.color} border-transparent`}>{info.label}</Badge>;
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={(s.payment_status || '').toLowerCase()} onValueChange={(val) => updateStatus(s, val)}>
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue placeholder="Alterar status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approved"><div className="flex items-center gap-2"><Check className="h-3 w-3" /> Aprovado</div></SelectItem>
                            <SelectItem value="pending"><div className="flex items-center gap-2"><Clock className="h-3 w-3" /> Pendente</div></SelectItem>
                          </SelectContent>
                        </Select>
                        <Dialog open={historySaleId === s.id} onOpenChange={(open) => setHistorySaleId(open ? s.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">Histórico</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Histórico de Status</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 text-sm">
                              {getHistory(s.id).length === 0 ? (
                                <div className="text-muted-foreground">Sem alterações registradas.</div>
                              ) : (
                                getHistory(s.id).map((h, idx) => (
                                  <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                                    <div>{new Date(h.at).toLocaleString()}</div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-muted text-foreground border-transparent">{(h.from || '-').toUpperCase()}</Badge>
                                      <span className="text-muted-foreground">→</span>
                                      <Badge className="bg-muted text-foreground border-transparent">{(h.to || '-').toUpperCase()}</Badge>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Sales;
