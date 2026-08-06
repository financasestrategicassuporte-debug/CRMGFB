import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeFunnel, computeProductEconomics } from "@/lib/funnels";

/** Um card por produto ativo (funil + CAC/ROI) — a mesma resposta
 * alimenta tanto os cards quanto a tabela "Marketing × Vendas" da tela
 * Dashboard por Produto. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [{ data: products, error: productsError }, { data: deals, error: dealsError }, { data: spend, error: spendError }] =
    await Promise.all([
      supabase.from("plans").select("*").eq("active", true),
      supabase.from("deals").select("product_id,stage,qualification,revenue,value,lost_reason"),
      supabase.from("ad_spend").select("product_id,amount"),
    ]);
  if (productsError) return dbError(productsError);
  if (dealsError) return dbError(dealsError);
  if (spendError) return dbError(spendError);

  const dashboard = (products ?? []).map((product) => {
    const dealsDoProduto = (deals ?? []).filter((d) => d.product_id === product.id);
    const funnel = computeFunnel(dealsDoProduto);
    const investimento = (spend ?? [])
      .filter((s) => s.product_id === product.id)
      .reduce((sum, s) => sum + s.amount, 0);

    return { product, funnel, economics: computeProductEconomics(funnel, investimento) };
  });

  return NextResponse.json({ products: dashboard });
}
