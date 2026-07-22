import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeSdrStat } from "@/lib/performance";

/** Funil recebidos→qualificados→agendados por SDR + ranking. Admin vê o
 * time todo; um sdr só recebe a própria linha (a UI usa o mesmo shape
 * para o cockpit individual e para o ranking do admin). */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();

  const [{ data: deals, error: dealsError }, { data: sdrs, error: sdrsError }, { data: conversations, error: convError }] =
    await Promise.all([
      supabase.from("deals").select("assigned_to,qualification,stage,revenue,value"),
      supabase.from("profiles").select("id,name,initials,color").eq("role", "sdr").eq("active", true),
      supabase.from("conversations").select("sdr_id,created_at,messages(direction,created_at)"),
    ]);
  if (dealsError) return dbError(dealsError);
  if (sdrsError) return dbError(sdrsError);
  if (convError) return dbError(convError);

  const stats = (sdrs ?? [])
    .filter((s) => profile?.role === "admin" || s.id === profile?.id)
    .map((sdr) => ({
      id: sdr.id,
      name: sdr.name,
      initials: sdr.initials,
      color: sdr.color,
      ...computeSdrStat(sdr.id, deals ?? [], conversations ?? []),
    }))
    .sort((a, b) => b.agendados - a.agendados);

  return NextResponse.json({ sdrs: stats });
}
