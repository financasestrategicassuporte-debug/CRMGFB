import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeFunnel, computeProductEconomics } from "@/lib/funnels";

/** Funil consolidado + economics gerais (CAC/ROAS/investimento), somando
 * `ad_spend` sem produto (product_id null = investimento geral) — é o
 * que alimenta os cards do topo do Dashboard Geral. Aceita `?from=` e
 * `?to=` (YYYY-MM-DD) pra filtrar por data de criação do deal/período do
 * investimento — usado pelo filtro "Período" do dashboard. Aceita também
 * `?pipeline=quente|frio` pra ver a taxa de cada funil separado (o
 * investimento em mídia não é rastreado por pipeline, só por produto —
 * então economics continua "geral" mesmo com o filtro de pipeline). */
export async function GET(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const pipeline = searchParams.get("pipeline");

  let dealsQuery = supabase.from("deals").select("product_id,stage,qualification,revenue,value,created_at,pipeline,lost_reason");
  if (from) dealsQuery = dealsQuery.gte("created_at", from);
  if (to) dealsQuery = dealsQuery.lte("created_at", `${to}T23:59:59.999`);
  if (pipeline === "quente" || pipeline === "frio") dealsQuery = dealsQuery.eq("pipeline", pipeline);

  let spendQuery = supabase.from("ad_spend").select("amount,period").is("product_id", null);
  if (from) spendQuery = spendQuery.gte("period", from);
  if (to) spendQuery = spendQuery.lte("period", to);

  const [{ data: deals, error: dealsError }, { data: spend, error: spendError }] = await Promise.all([
    dealsQuery,
    spendQuery,
  ]);
  if (dealsError) return dbError(dealsError);
  if (spendError) return dbError(spendError);

  const funnel = computeFunnel(deals ?? []);
  const investimento = (spend ?? []).reduce((sum, s) => sum + s.amount, 0);

  return NextResponse.json({ funnel, economics: computeProductEconomics(funnel, investimento) });
}
