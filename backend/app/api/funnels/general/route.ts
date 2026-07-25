import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeFunnel, computeProductEconomics } from "@/lib/funnels";

/** Funil consolidado + economics gerais (CAC/ROAS/investimento), somando
 * `ad_spend` sem produto (product_id null = investimento geral) — é o
 * que alimenta os cards do topo do Dashboard Geral. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [{ data: deals, error: dealsError }, { data: spend, error: spendError }] = await Promise.all([
    supabase.from("deals").select("product_id,stage,qualification,revenue,value"),
    supabase.from("ad_spend").select("amount").is("product_id", null),
  ]);
  if (dealsError) return dbError(dealsError);
  if (spendError) return dbError(spendError);

  const funnel = computeFunnel(deals ?? []);
  const investimento = (spend ?? []).reduce((sum, s) => sum + s.amount, 0);

  return NextResponse.json({ funnel, economics: computeProductEconomics(funnel, investimento) });
}
