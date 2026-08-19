import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { generateDailyCoachingMessage } from "@/lib/integrations/dailySummary";

const STALLED_DAYS_THRESHOLD = 3;

type ActiveDeal = {
  id: string;
  person_name: string;
  company_name: string | null;
  score: number | null;
  stage: number;
  stage_changed_at: string | null;
};

function daysSince(iso: string | null) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function fallbackMessage(topLead: ActiveDeal | null, stalledCount: number) {
  const parts: string[] = [];
  if (topLead) {
    parts.push(`Foco em ${topLead.company_name ?? topLead.person_name} hoje — é quem tem a maior chance de fechar (${topLead.score}%).`);
  } else {
    parts.push("Nenhuma negociação com qualificação registrada ainda — qualifique os leads em aberto pra saber onde focar.");
  }
  if (stalledCount > 0) {
    parts.push(`${stalledCount} negociação(ões) parada(s) há ${STALLED_DAYS_THRESHOLD}+ dias precisam de um contato agora.`);
  }
  parts.push("Ligue primeiro pra quem já demonstrou mais interesse — resposta rápida aumenta a chance de fechar.");
  return parts.join(" ");
}

/** Resumo do dia do SDR/Closer: negociações com maior chance de fechar
 * (usa o score da qualificação SDR IA, já calculado), negociações
 * paradas precisando de contato, visão geral simples do dia — e uma
 * mensagem de coach gerada por IA em cima desses mesmos dados (ou uma
 * versão baseada em regra, se ANTHROPIC_API_KEY não estiver configurada). */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let dealIds: string[] | null = null;
  if (profile.role === "closer") {
    const { data: tasks, error: tasksError } = await supabase
      .from("deal_tasks")
      .select("deal_id")
      .eq("task_type", "reuniao")
      .eq("assigned_to", profile.id);
    if (tasksError) return dbError(tasksError);
    dealIds = [...new Set((tasks ?? []).map((t) => t.deal_id))];
    if (dealIds.length === 0) {
      return NextResponse.json({ leadsParaAtacar: [], pendentes: [], tarefasHoje: 0, reunioesHoje: 0, totalAtivas: 0, coachMessage: fallbackMessage(null, 0) });
    }
  }

  let dealsQuery = supabase
    .from("deals")
    .select("id,person_name,company_name,score,stage,stage_changed_at")
    .eq("lost", false)
    .lt("stage", 6);
  if (profile.role === "sdr") dealsQuery = dealsQuery.eq("assigned_to", profile.id);
  else if (profile.role === "closer") dealsQuery = dealsQuery.in("id", dealIds!);
  const { data: deals, error: dealsError } = await dealsQuery;
  if (dealsError) return dbError(dealsError);

  const hojeIso = new Date().toISOString().slice(0, 10);
  const { data: tasksHoje, error: tasksHojeError } = await supabase
    .from("deal_tasks")
    .select("task_type")
    .eq("assigned_to", profile.id)
    .eq("done", false)
    .gte("due_date", `${hojeIso}T00:00:00`)
    .lte("due_date", `${hojeIso}T23:59:59`);
  if (tasksHojeError) return dbError(tasksHojeError);

  const activeDeals = deals ?? [];
  const leadsParaAtacar = activeDeals
    .filter((d) => d.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 5);
  const pendentes = activeDeals
    .map((d) => ({ ...d, diasParado: daysSince(d.stage_changed_at) }))
    .filter((d) => d.diasParado >= STALLED_DAYS_THRESHOLD)
    .sort((a, b) => b.diasParado - a.diasParado)
    .slice(0, 5);

  const tarefasHoje = (tasksHoje ?? []).length;
  const reunioesHoje = (tasksHoje ?? []).filter((t) => t.task_type === "reuniao").length;

  const context = `Negociações ativas: ${activeDeals.length}.
Tarefas de hoje: ${tarefasHoje} (${reunioesHoje} reunião(ões)).
Top negociações por chance de fechar: ${leadsParaAtacar.map((d) => `${d.company_name ?? d.person_name} (${d.score}%)`).join(", ") || "nenhuma qualificada ainda"}.
Negociações paradas (sem avançar etapa): ${pendentes.map((d) => `${d.company_name ?? d.person_name} (${d.diasParado} dias parado)`).join(", ") || "nenhuma"}.`;

  let coachMessage = "";
  try {
    coachMessage = await generateDailyCoachingMessage(context);
  } catch {
    // segue pro fallback
  }
  if (!coachMessage) coachMessage = fallbackMessage(leadsParaAtacar[0] ?? null, pendentes.length);

  return NextResponse.json({
    leadsParaAtacar,
    pendentes,
    tarefasHoje,
    reunioesHoje,
    totalAtivas: activeDeals.length,
    coachMessage,
  });
}
