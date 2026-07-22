import { NextResponse } from "next/server";
import { getCurrentProfile, requireSelfOrAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeSdrStat } from "@/lib/performance";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireSelfOrAdmin(profile, params.id);
  if (forbidden) return forbidden;

  const [{ data: sdr, error: sdrError }, { data: deals, error: dealsError }, { data: conversations, error: convError }] =
    await Promise.all([
      supabase.from("profiles").select("id,name,initials,color").eq("id", params.id).single(),
      supabase.from("deals").select("assigned_to,qualification,stage,revenue,value"),
      supabase.from("conversations").select("sdr_id,created_at,messages(direction,created_at)"),
    ]);
  if (sdrError) return dbError(sdrError);
  if (dealsError) return dbError(dealsError);
  if (convError) return dbError(convError);

  return NextResponse.json({
    sdr: { ...sdr, ...computeSdrStat(params.id, deals ?? [], conversations ?? []) },
  });
}
