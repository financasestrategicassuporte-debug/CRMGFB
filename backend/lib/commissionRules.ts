import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/** Comissionamento automático do SDR: R$10 por reunião qualificada
 * comparecida + R$10 de bônus quando a negociação que ele é dono fecha
 * em venda. Só o SDR (não o Closer) recebe essas duas — o admin ainda
 * lança fixo/extra manualmente pra qualquer papel. A constraint
 * (deal_id, tipo) no banco garante que cada negociação só gera uma
 * comissão de cada tipo, então essas funções podem ser chamadas mais
 * de uma vez sem duplicar (o insert repetido só falha silenciosamente). */

export const SDR_MEETING_COMMISSION = 10;
export const SDR_SALE_COMMISSION = 10;

async function isSdr(admin: SupabaseClient<Database>, profileId: string | null) {
  if (!profileId) return false;
  const { data } = await admin.from("profiles").select("role").eq("id", profileId).maybeSingle();
  return data?.role === "sdr";
}

function currentPeriod() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

export async function awardMeetingCommission(admin: SupabaseClient<Database>, dealId: string, assignedTo: string | null) {
  if (!(await isSdr(admin, assignedTo))) return;
  await admin.from("commissions").insert({
    closer_id: assignedTo!,
    deal_id: dealId,
    amount: SDR_MEETING_COMMISSION,
    tipo: "reuniao",
    period: currentPeriod(),
  });
}

export async function awardSaleCommission(admin: SupabaseClient<Database>, dealId: string, assignedTo: string | null) {
  if (!(await isSdr(admin, assignedTo))) return;
  await admin.from("commissions").insert({
    closer_id: assignedTo!,
    deal_id: dealId,
    amount: SDR_SALE_COMMISSION,
    tipo: "venda",
    period: currentPeriod(),
  });
}

/** Motivo de perda que indica que a qualificação foi mal feita/mentida
 * pelo SDR — quando o Closer marca a negociação como perdida com esse
 * motivo exato, a comissão automática (reunião comparecida e/ou venda,
 * se já tivesse fechado antes de reabrir) que o SDR ganhou por essa
 * negociação é revogada. */
export const LOST_REASON_REVOKES_SDR_COMMISSION = "Lead desqualificado — erro do SDR ou mentiu na qualificação";

export async function revokeSdrCommission(admin: SupabaseClient<Database>, dealId: string) {
  await admin.from("commissions").delete().eq("deal_id", dealId).in("tipo", ["reuniao", "venda"]);
}

/** Regra base de comissionamento (singleton) — ver migração
 * 0016_commission_rules.sql. Configurável em /comissoes (admin): 1 valor
 * mensal fixo pra todo SDR ativo, 1 pra todo Closer ativo, com um valor
 * de campanha opcional que substitui o base enquanto estiver ligado. */
export async function getCommissionRules(admin: SupabaseClient<Database>) {
  const { data } = await admin.from("commission_rules").select("*").limit(1).maybeSingle();
  return data;
}

function baseAmountFor(rules: NonNullable<Awaited<ReturnType<typeof getCommissionRules>>>, role: "sdr" | "closer") {
  if (rules.campaign_active) {
    const boosted = role === "sdr" ? rules.campaign_sdr_amount : rules.campaign_closer_amount;
    if (boosted != null) return boosted;
  }
  return role === "sdr" ? rules.sdr_base_amount : rules.closer_base_amount;
}

/** Gera a comissão "fixo" do período corrente pra cada SDR/Closer ativo
 * que ainda não tem uma lançada nesse mês — idempotente (pode rodar
 * quantas vezes quiser no mesmo período, nunca duplica). Roda: (1) na
 * hora, quando o admin salva a regra base em /comissoes; (2) todo dia
 * no cron, pra pegar gente nova que entrou no time no meio do mês. Não
 * mexe em fixas já lançadas — nem quando o valor da regra muda depois. */
export async function generateMonthlyBaseCommissions(admin: SupabaseClient<Database>) {
  const rules = await getCommissionRules(admin);
  if (!rules) return { created: 0 };

  const period = currentPeriod();
  const { data: team } = await admin.from("profiles").select("id,role").in("role", ["sdr", "closer"]).eq("active", true);
  if (!team || team.length === 0) return { created: 0 };

  const { data: existing } = await admin.from("commissions").select("closer_id").eq("tipo", "fixo").eq("period", period);
  const already = new Set((existing ?? []).map((c) => c.closer_id));

  let created = 0;
  for (const member of team) {
    if (already.has(member.id)) continue;
    const amount = baseAmountFor(rules, member.role as "sdr" | "closer");
    if (amount <= 0) continue;
    const { error } = await admin.from("commissions").insert({ closer_id: member.id, tipo: "fixo", amount, period });
    if (!error) created++;
  }
  return { created };
}
