import { NextResponse } from "next/server";
import { getCurrentProfile, requireSelfOrAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeCloserStat } from "@/lib/performance";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireSelfOrAdmin(profile, params.id);
  if (forbidden) return forbidden;

  const [{ data: closer, error: closerError }, { data: deals, error: dealsError }] = await Promise.all([
    supabase.from("profiles").select("id,name,initials,color").eq("id", params.id).single(),
    supabase.from("deals").select("assigned_to,qualification,stage,revenue,value"),
  ]);
  if (closerError) return dbError(closerError);
  if (dealsError) return dbError(dealsError);

  return NextResponse.json({
    closer: { ...closer, ...computeCloserStat(params.id, deals ?? []) },
  });
}
