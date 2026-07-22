import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { evaluateBottlenecks } from "@/lib/bottlenecks";
import { computeSdrStat, computeCloserStat } from "@/lib/performance";

export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [
    { data: deals, error: dealsError },
    { data: team, error: teamError },
    { data: conversations, error: convError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase.from("deals").select("assigned_to,qualification,stage,revenue,value,created_at"),
    supabase.from("profiles").select("id,name,role").eq("active", true),
    supabase.from("conversations").select("sdr_id,created_at,messages(direction,created_at)"),
    supabase.from("clients").select("atividade_status,financeiro_status"),
  ]);
  if (dealsError) return dbError(dealsError);
  if (teamError) return dbError(teamError);
  if (convError) return dbError(convError);
  if (clientsError) return dbError(clientsError);

  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const catorzeDiasAtras = new Date();
  catorzeDiasAtras.setDate(catorzeDiasAtras.getDate() - 14);
  const leadsSemanaAtual = (deals ?? []).filter((d) => new Date(d.created_at) >= seteDiasAtras).length;
  const leadsSemanaAnterior = (deals ?? []).filter(
    (d) => new Date(d.created_at) >= catorzeDiasAtras && new Date(d.created_at) < seteDiasAtras
  ).length;
  const leadsVariacaoPct = leadsSemanaAnterior > 0 ? (leadsSemanaAtual - leadsSemanaAnterior) / leadsSemanaAnterior : 0;

  const sdrs = (team ?? [])
    .filter((t) => t.role === "sdr")
    .map((sdr) => {
      const stat = computeSdrStat(sdr.id, deals ?? [], conversations ?? []);
      return { id: sdr.id, name: sdr.name, tmrMinutos: stat.tmrMinutos, taxaAgendamento: stat.taxaAgendamento };
    });

  const closers = (team ?? [])
    .filter((t) => t.role === "closer")
    .map((closer) => {
      const stat = computeCloserStat(closer.id, deals ?? []);
      return { id: closer.id, name: closer.name, comparecimentoRate: stat.comparecimentoRate, conversao: stat.conversao, receita: stat.receita };
    });

  const clientesNoPrazoPct =
    (clients ?? []).length > 0
      ? (clients ?? []).filter((c) => c.atividade_status === "no_prazo").length / (clients ?? []).length
      : 1;
  const clientesInadimplentesSemContato = (clients ?? []).filter((c) => c.financeiro_status === "inadimplente").length;

  const areas = evaluateBottlenecks({
    leadsVariacaoPct,
    sdrs,
    closers,
    clientesNoPrazoPct,
    clientesInadimplentesSemContato,
  });

  return NextResponse.json({ areas });
}
