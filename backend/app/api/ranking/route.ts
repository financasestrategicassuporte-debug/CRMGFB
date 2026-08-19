import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { rankSdrs, rankClosers } from "@/lib/ranking";

/** Ranking do mês corrente — SDRs competindo entre si e Closers
 * competindo entre si (reuniões comparecidas + vendas fechadas), pra
 * cada colaborador ver onde está na frente. Todo mundo logado pode ler
 * (mesma visibilidade dos outros dados de equipe). */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [{ data: deals, error: dealsError }, { data: team, error: teamError }, { data: reuniaoTasks, error: tasksError }] =
    await Promise.all([
      supabase.from("deals").select("id,assigned_to,stage,revenue,value,first_attended_at,stage_changed_at").eq("lost", false),
      supabase.from("profiles").select("id,name,initials,color,role").eq("active", true).in("role", ["sdr", "closer"]),
      supabase.from("deal_tasks").select("deal_id,assigned_to").eq("task_type", "reuniao"),
    ]);
  if (dealsError) return dbError(dealsError);
  if (teamError) return dbError(teamError);
  if (tasksError) return dbError(tasksError);

  const sdrs = (team ?? []).filter((t) => t.role === "sdr");
  const closers = (team ?? []).filter((t) => t.role === "closer");

  const sdrRanking = rankSdrs(deals ?? [], sdrs, monthStart, monthEnd);
  const closerRanking = rankClosers(deals ?? [], reuniaoTasks ?? [], closers, monthStart, monthEnd);

  return NextResponse.json({ sdrRanking, closerRanking, meId: profile.id });
}
