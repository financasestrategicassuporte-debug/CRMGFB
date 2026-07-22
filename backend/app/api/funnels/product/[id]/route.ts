import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeFunnel, computeProductEconomics } from "@/lib/funnels";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [{ data: product, error: productError }, { data: deals, error: dealsError }, { data: spend, error: spendError }] =
    await Promise.all([
      supabase.from("plans").select("*").eq("id", params.id).single(),
      supabase.from("deals").select("product_id,stage,qualification,revenue,value").eq("product_id", params.id),
      supabase.from("ad_spend").select("amount").eq("product_id", params.id),
    ]);
  if (productError) return dbError(productError);
  if (dealsError) return dbError(dealsError);
  if (spendError) return dbError(spendError);

  const funnel = computeFunnel(deals ?? []);
  const investimento = (spend ?? []).reduce((sum, s) => sum + s.amount, 0);

  return NextResponse.json({
    product,
    funnel,
    economics: computeProductEconomics(funnel, investimento),
  });
}
