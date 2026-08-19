import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { commissionProductRatesUpdateSchema } from "@/lib/validation";

/** Taxas de comissão por evento (reunião/venda), uma linha por produto
 * + a linha "Geral" (product_id null, usada como padrão) — ver
 * lib/commissionRules.ts#getProductRate pra onde são lidas. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabase.from("commission_product_rates").select("*, product:plans(id,name)");
  if (error) return dbError(error);
  return NextResponse.json({ rates: data });
}

export async function PATCH(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, commissionProductRatesUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("commission_product_rates")
    .upsert(parsed.data.rates, { onConflict: "product_id" })
    .select("*, product:plans(id,name)");
  if (error) return dbError(error);
  return NextResponse.json({ rates: data });
}
