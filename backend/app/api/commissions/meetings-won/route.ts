import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";

const STAGE_FECHADO = 6;

/** "Reuniões que agendou e deu venda" — cruza as tarefas de Reunião com
 * as negociações já fechadas (stage 6). Pro SDR, conta as reuniões dos
 * negócios que ele é dono (`assigned_to`); pro Closer, as reuniões da
 * tarefa em que ele é o responsável (`deal_tasks.assigned_to`, campo
 * adicionado no Criar Tarefa quando o tipo é Reunião) — são papéis
 * diferentes na mesma negociação, por isso a query muda por role.
 * Admin vê tudo, sem filtro de dono. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let taskQuery = supabase
    .from("deal_tasks")
    .select("deal_id, due_date, assignee:profiles(id,name)")
    .eq("task_type", "reuniao");
  if (profile.role === "closer") taskQuery = taskQuery.eq("assigned_to", profile.id);
  const { data: tasks, error: tasksError } = await taskQuery;
  if (tasksError) return dbError(tasksError);

  const dealIds = [...new Set((tasks ?? []).map((t) => t.deal_id))];
  if (dealIds.length === 0) return NextResponse.json({ meetings: [] });

  let dealsQuery = supabase
    .from("deals")
    .select("id, person_name, company_name, revenue, value, stage_changed_at, assignee:profiles(id,name)")
    .in("id", dealIds)
    .eq("stage", STAGE_FECHADO);
  if (profile.role === "sdr") dealsQuery = dealsQuery.eq("assigned_to", profile.id);
  const { data: deals, error: dealsError } = await dealsQuery;
  if (dealsError) return dbError(dealsError);

  const taskByDeal = new Map((tasks ?? []).map((t) => [t.deal_id, t]));
  const meetings = (deals ?? []).map((d) => ({
    dealId: d.id,
    personName: d.person_name,
    companyName: d.company_name,
    revenue: d.revenue ?? d.value ?? 0,
    wonAt: d.stage_changed_at,
    meetingDate: taskByDeal.get(d.id)?.due_date ?? null,
    sdr: d.assignee ?? null,
    closer: taskByDeal.get(d.id)?.assignee ?? null,
  }));

  return NextResponse.json({ meetings });
}
