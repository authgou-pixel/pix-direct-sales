import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

type Timeframe = "day" | "weekly" | "monthly" | "custom";

const Sales = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [timeframe, setTimeframe] = useState<Timeframe>("monthly");
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});

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
  }, [timeframe, selectedDay, range.from, range.to]);

  const period = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    if (timeframe === "day") {
      const base = selectedDay || now;
      start = new Date(base);
      start.setHours(0, 0, 0, 0);
      end = new Date(base);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === "weekly") {
      end.setHours(23, 59, 59, 999);
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (timeframe === "monthly") {
      end.setHours(23, 59, 59, 999);
      start = new Date(end);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else {
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
  }, [timeframe, selectedDay, range]);

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <CardTitle className="text-xl">Vendas</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant={timeframe === "day" ? "default" : "outline"} size="sm" onClick={() => setTimeframe("day")}>Dia</Button>
            <Button variant={timeframe === "weekly" ? "default" : "outline"} size="sm" onClick={() => setTimeframe("weekly")}>Semana</Button>
            <Button variant={timeframe === "monthly" ? "default" : "outline"} size="sm" onClick={() => setTimeframe("monthly")}>Mês</Button>
            <Button variant={timeframe === "custom" ? "default" : "outline"} size="sm" onClick={() => setTimeframe("custom")}>Período</Button>
            {timeframe === "day" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">Selecionar dia</Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="end">
                  <Calendar mode="single" selected={selectedDay} onSelect={setSelectedDay} />
                </PopoverContent>
              </Popover>
            )}
            {timeframe === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">Selecionar período</Button>
                </PopoverTrigger>
                <PopoverContent className="p-2" align="end">
                  <Calendar mode="range" selected={{ from: range.from, to: range.to }} onSelect={(r: { from?: Date; to?: Date } | undefined) => setRange(r || {})} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card className="border-primary/20">
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
                <div className="grid grid-cols-5 gap-2 px-2 pb-2 text-xs text-muted-foreground min-w-[720px]">
                  <div>Data</div>
                  <div>Valor</div>
                  <div>Item</div>
                  <div>Método</div>
                  <div>Cliente</div>
                </div>
                <div className="divide-y min-w-[720px]">
                  {sales.map(s => (
                    <div key={s.id} className="grid grid-cols-5 gap-2 px-2 py-2 text-sm">
                      <div>{new Date(s.created_at).toLocaleString()}</div>
                      <div>R$ {Number(s.amount).toFixed(2)}</div>
                      <div>{s.product_id ? (products[s.product_id]?.name || s.product_id) : "-"}</div>
                      <div>PIX</div>
                      <div>{s.buyer_name || s.buyer_email || "-"}</div>
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
