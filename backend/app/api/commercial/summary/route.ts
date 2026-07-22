import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Aggregates deals + team into the per-product / per-SDR / per-closer
 * stats used by the commercial dashboards. Computed in-process since the
 * team is small enough that a full table scan + JS reduce is simpler and
 * cheaper than maintaining materialized views. */
export async function GET() {
  const { supabase } = await getCurrentProfile();

  const [{ data: deals, error: dealsError }, { data: team, error: teamError }] =
    await Promise.all([
      supabase.from("deals").select("*"),
      supabase.from("profiles").select("id,name,initials,role,color").eq("active", true),
    ]);
  if (dealsError) return dbError(dealsError);
  if (teamError) return dbError(teamError);

  const byProduct = new Map<string, {
    key: string; leads: number; qualif: number; vendas: number; receita: number;
  }>();
  for (const d of deals) {
    const key = d.product ?? "sem_produto";
    const bucket = byProduct.get(key) ?? { key, leads: 0, qualif: 0, vendas: 0, receita: 0 };
    bucket.leads += 1;
    if (d.qualification && d.qualification >= 3) bucket.qualif += 1;
    if (d.stage === 6) {
      bucket.vendas += 1;
      bucket.receita += d.revenue ?? d.value ?? 0;
    }
    byProduct.set(key, bucket);
  }

  const perAssignee = new Map<string, {
    id: string; name: string; role: string; leads: number; qualif: number; vendas: number; receita: number;
  }>();
  for (const member of team) {
    perAssignee.set(member.id, {
      id: member.id,
      name: member.name,
      role: member.role,
      leads: 0,
      qualif: 0,
      vendas: 0,
      receita: 0,
    });
  }
  for (const d of deals) {
    if (!d.assigned_to) continue;
    const bucket = perAssignee.get(d.assigned_to);
    if (!bucket) continue;
    bucket.leads += 1;
    if (d.qualification && d.qualification >= 3) bucket.qualif += 1;
    if (d.stage === 6) {
      bucket.vendas += 1;
      bucket.receita += d.revenue ?? d.value ?? 0;
    }
  }

  return NextResponse.json({
    products: Array.from(byProduct.values()),
    sdrs: Array.from(perAssignee.values()).filter((p) => p.role === "sdr"),
    closers: Array.from(perAssignee.values()).filter((p) => p.role === "closer"),
    totals: {
      leads: deals.length,
      vendas: deals.filter((d) => d.stage === 6).length,
      receita: deals.reduce((sum, d) => sum + (d.stage === 6 ? d.revenue ?? d.value ?? 0 : 0), 0),
    },
  });
}
