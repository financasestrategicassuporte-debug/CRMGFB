import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/** Puxa o investimento real em mídia do dashboard de marketing
 * (novodashoperamktetrf.vercel.app) e grava em `public.ad_spend`
 * (product_id null = investimento geral) — é o que alimenta CAC, custo
 * por reunião, custo por venda e ROAS no Dashboard Geral e no Dashboard
 * de Produtos. Sem isso, `ad_spend` fica vazia e todo mundo mostra R$0,
 * não porque a fórmula esteja errada, mas porque não tinha de onde
 * puxar o valor investido. */

const MARKETING_API_URL = "https://novodashoperamktetrf.vercel.app/api/data";

type DailySpendEntry = { date: string; spend: number };

export type SpendSyncResult = { synced: number; error?: string };

export async function fetchDailySpend(): Promise<DailySpendEntry[]> {
  const res = await fetch(MARKETING_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Dashboard de marketing respondeu ${res.status}`);
  const data = await res.json();
  const dailySpend = Array.isArray(data.dailySpend) ? data.dailySpend : [];
  return dailySpend
    .filter((d: any) => d && typeof d.date === "string" && typeof d.spend === "number")
    .map((d: any) => ({ date: d.date, spend: d.spend }));
}

export async function syncMarketingSpend(admin: SupabaseClient<Database>): Promise<SpendSyncResult> {
  let entries: DailySpendEntry[];
  try {
    entries = await fetchDailySpend();
  } catch (err) {
    return { synced: 0, error: err instanceof Error ? err.message : "Erro desconhecido" };
  }
  if (entries.length === 0) return { synced: 0 };

  const rows = entries.map((e) => ({ product_id: null, period: e.date, amount: e.spend }));
  const { error } = await admin.from("ad_spend").upsert(rows, { onConflict: "product_id,period" });
  if (error) return { synced: 0, error: error.message };
  return { synced: rows.length };
}
