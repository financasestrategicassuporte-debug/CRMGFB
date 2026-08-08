import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import {
  computeOverdueTasks,
  computeResponseTime,
  computeStalledDeals,
  countOverdueTasksByOwner,
  countStalledDealsByOwner,
  responseTimeBySdr,
} from "@/lib/execution";

/** Relatório de Execução (admin only): tempo de resposta ao lead,
 * tarefas vencidas e negociações paradas, consolidado e por SDR/Closer —
 * a versão "de sistema" de saber quem está enrolando, sem monitorar
 * pausa nenhuma do colaborador. Aceita `?from=&to=` (YYYY-MM-DD) pra
 * filtrar pelas negociações criadas no período — mesmo padrão de
 * "Período" usado no CRM e no Dashboard. */
export async function GET(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let dealsQuery = supabase
    .from("deals")
    .select("id,person_name,company_name,assigned_to,created_at,first_contacted_at,stage,stage_changed_at,lost");
  if (from) dealsQuery = dealsQuery.gte("created_at", from);
  if (to) dealsQuery = dealsQuery.lte("created_at", `${to}T23:59:59.999`);

  const [{ data: deals, error: dealsError }, { data: tasks, error: tasksError }, { data: team, error: teamError }] =
    await Promise.all([
      dealsQuery,
      supabase.from("deal_tasks").select("id,deal_id,title,assigned_to,due_date,done"),
      supabase.from("profiles").select("id,name,initials,color,role").in("role", ["sdr", "closer"]).eq("active", true),
    ]);
  if (dealsError) return dbError(dealsError);
  if (tasksError) return dbError(tasksError);
  if (teamError) return dbError(teamError);

  const dealsList = deals ?? [];
  const dealsById = new Map(dealsList.map((d) => [d.id, d]));
  // Só tarefas de negociações que caíram no período filtrado.
  const tasksInPeriod = (tasks ?? []).filter((t) => dealsById.has(t.deal_id));

  const geral = computeResponseTime(dealsList);
  const overdueTasks = computeOverdueTasks(tasksInPeriod, dealsById);
  const stalledDeals = computeStalledDeals(dealsList);

  const ranking = (team ?? []).map((member) => {
    const responseTime = member.role === "sdr" ? responseTimeBySdr(member.id, dealsList) : null;
    return {
      id: member.id,
      name: member.name,
      initials: member.initials,
      color: member.color,
      role: member.role,
      tempoRespostaMedioMin: responseTime?.avgMinutos ?? null,
      semContato: responseTime?.semContato ?? null,
      tarefasVencidas: countOverdueTasksByOwner(overdueTasks, member.id),
      negociacoesParadas: countStalledDealsByOwner(stalledDeals, member.id),
    };
  });
  ranking.sort((a, b) => b.tarefasVencidas + b.negociacoesParadas - (a.tarefasVencidas + a.negociacoesParadas));

  return NextResponse.json({
    geral,
    overdueTasks: overdueTasks.map((t) => ({
      ...t,
      ownerName: (team ?? []).find((m) => m.id === t.ownerId)?.name ?? "Sem dono",
    })),
    stalledDeals: stalledDeals.map((x) => ({
      dealId: x.deal.id,
      dealName: x.deal.company_name ? `${x.deal.company_name} – ${x.deal.person_name}` : x.deal.person_name,
      ownerName: (team ?? []).find((m) => m.id === x.deal.assigned_to)?.name ?? "Sem dono",
      stage: x.deal.stage,
      diasParada: x.diasParada,
    })),
    ranking,
  });
}
