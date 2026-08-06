import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { generateDecisions } from "@/lib/bottlenecks";
import { computeSdrStat, computeCloserStat } from "@/lib/performance";
import { computeFunnel, computeProductEconomics } from "@/lib/funnels";

const CAPACIDADE_REUNIOES_POR_CLOSER_SEMANA = 20;

export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [
    { data: deals, error: dealsError },
    { data: team, error: teamError },
    { data: conversations, error: convError },
    { data: products, error: productsError },
    { data: spend, error: spendError },
  ] = await Promise.all([
    supabase.from("deals").select("assigned_to,product_id,qualification,stage,revenue,value,lost_reason"),
    supabase.from("profiles").select("id,name,role").eq("active", true),
    supabase.from("conversations").select("sdr_id,created_at,messages(direction,created_at)"),
    supabase.from("plans").select("id,name").eq("active", true),
    supabase.from("ad_spend").select("product_id,amount"),
  ]);
  if (dealsError) return dbError(dealsError);
  if (teamError) return dbError(teamError);
  if (convError) return dbError(convError);
  if (productsError) return dbError(productsError);
  if (spendError) return dbError(spendError);

  const productStats = (products ?? []).map((product) => {
    const dealsDoProduto = (deals ?? []).filter((d) => d.product_id === product.id);
    const funnel = computeFunnel(dealsDoProduto);
    const investimento = (spend ?? []).filter((s) => s.product_id === product.id).reduce((sum, s) => sum + s.amount, 0);
    const economics = computeProductEconomics(funnel, investimento);
    return {
      name: product.name,
      roi: economics.roi,
      comparecimentoRate: funnel.agendamentos > 0 ? funnel.comparecimentos / funnel.agendamentos : 0,
    };
  });

  const sdrs = (team ?? [])
    .filter((t) => t.role === "sdr")
    .map((sdr) => {
      const stat = computeSdrStat(sdr.id, deals ?? [], conversations ?? []);
      return { id: sdr.id, name: sdr.name, tmrMinutos: stat.tmrMinutos, taxaAgendamento: stat.taxaAgendamento };
    });

  const closers = (team ?? []).filter((t) => t.role === "closer");
  const closerStats = closers.map((closer) => computeCloserStat(closer.id, deals ?? []));
  const reunioesRealizadas = closerStats.reduce((sum, c) => sum + c.reunioes, 0);
  const capacidadeTotal = closers.length * CAPACIDADE_REUNIOES_POR_CLOSER_SEMANA;
  const capacidadeOciosaReunioes = Math.max(0, capacidadeTotal - reunioesRealizadas);

  const decisions = generateDecisions({
    products: productStats,
    sdrs,
    closers: closerStats.map((c, i) => ({ id: closers[i].id, name: closers[i].name, comparecimentoRate: c.comparecimentoRate, conversao: c.conversao, receita: c.receita })),
    capacidadeOciosaReunioes,
  });

  return NextResponse.json({ decisions });
}
