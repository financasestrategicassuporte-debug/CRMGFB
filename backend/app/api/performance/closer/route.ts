import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeCloserStat } from "@/lib/performance";

/** Funil reunião→fechamento por closer + ranking (receita, ticket,
 * conversão). Mesma regra de visibilidade de `performance/sdr`. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();

  const [{ data: deals, error: dealsError }, { data: closers, error: closersError }] = await Promise.all([
    supabase.from("deals").select("assigned_to,qualification,stage,revenue,value"),
    supabase.from("profiles").select("id,name,initials,color").eq("role", "closer").eq("active", true),
  ]);
  if (dealsError) return dbError(dealsError);
  if (closersError) return dbError(closersError);

  const stats = (closers ?? [])
    .filter((c) => profile?.role === "admin" || c.id === profile?.id)
    .map((closer) => ({
      id: closer.id,
      name: closer.name,
      initials: closer.initials,
      color: closer.color,
      ...computeCloserStat(closer.id, deals ?? []),
    }))
    .sort((a, b) => b.receita - a.receita);

  return NextResponse.json({ closers: stats });
}
