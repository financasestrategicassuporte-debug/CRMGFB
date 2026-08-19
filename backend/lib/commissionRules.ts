import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/** Comissionamento automático por reunião comparecida + venda fechada —
 * SDR (dono da negociação, `deals.assigned_to`) e Closer (responsável
 * pela tarefa de Reunião daquela negociação, `deal_tasks.assigned_to`
 * quando task_type é "reuniao") ganham cada um a sua, com os valores
 * configurados em /comissoes (admin) — ver `commission_rules`. A
 * constraint (deal_id, tipo, closer_id) no banco garante que cada
 * colaborador só ganha uma vez por negociação/tipo, então essas funções
 * podem ser chamadas mais de uma vez sem duplicar (insert repetido só
 * falha silenciosamente). */

function currentPeriod() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

async function roleOf(admin: SupabaseClient<Database>, profileId: string | null) {
  if (!profileId) return null;
  const { data } = await admin.from("profiles").select("role").eq("id", profileId).maybeSingle();
  return data?.role ?? null;
}

/** O closer "dono" da reunião de uma negociação: quem consta como
 * responsável na tarefa de Reunião mais recente daquele negócio — não
 * existe um campo `deals.closer_id` separado, já que `assigned_to` do
 * deal é sempre o SDR (a distribuição automática só atribui a SDRs). */
async function findCloserForDeal(admin: SupabaseClient<Database>, dealId: string) {
  const { data } = await admin
    .from("deal_tasks")
    .select("assigned_to")
    .eq("deal_id", dealId)
    .eq("task_type", "reuniao")
    .not("assigned_to", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.assigned_to) return null;
  const role = await roleOf(admin, data.assigned_to);
  return role === "closer" ? data.assigned_to : null;
}

async function awardIfRole(
  admin: SupabaseClient<Database>,
  dealId: string,
  profileId: string | null,
  role: "sdr" | "closer",
  amount: number,
  tipo: "reuniao" | "venda"
) {
  if (!profileId || amount <= 0) return;
  if ((await roleOf(admin, profileId)) !== role) return;
  await admin.from("commissions").insert({
    closer_id: profileId,
    deal_id: dealId,
    amount,
    tipo,
    period: currentPeriod(),
  });
}

export async function awardMeetingCommission(admin: SupabaseClient<Database>, dealId: string, assignedTo: string | null) {
  const rules = await getCommissionRules(admin);
  if (!rules) return;
  await awardIfRole(admin, dealId, assignedTo, "sdr", rules.sdr_meeting_amount, "reuniao");
  const closerId = await findCloserForDeal(admin, dealId);
  await awardIfRole(admin, dealId, closerId, "closer", rules.closer_meeting_amount, "reuniao");
}

export async function awardSaleCommission(admin: SupabaseClient<Database>, dealId: string, assignedTo: string | null) {
  const rules = await getCommissionRules(admin);
  if (!rules) return;
  await awardIfRole(admin, dealId, assignedTo, "sdr", rules.sdr_sale_amount, "venda");
  const closerId = await findCloserForDeal(admin, dealId);
  await awardIfRole(admin, dealId, closerId, "closer", rules.closer_sale_amount, "venda");
}

/** Motivo de perda que indica que a qualificação foi mal feita/mentida
 * pelo SDR — quando o Closer marca a negociação como perdida com esse
 * motivo exato, as comissões automáticas (reunião comparecida e/ou
 * venda, se já tivesse fechado antes de reabrir) que SDR e Closer
 * ganharam por essa negociação são revogadas — os dois, já que se a
 * reunião não foi de verdade qualificada, não foi reunião de verdade
 * pra nenhum dos dois papéis. */
export const LOST_REASON_REVOKES_SDR_COMMISSION = "Lead desqualificado — erro do SDR ou mentiu na qualificação";

export async function revokeSdrCommission(admin: SupabaseClient<Database>, dealId: string) {
  await admin.from("commissions").delete().eq("deal_id", dealId).in("tipo", ["reuniao", "venda"]);
}

/** Regra base de comissionamento (singleton) — ver migrações
 * 0016_commission_rules.sql / 0017_closer_commission_rules.sql.
 * Configurável em /comissoes (admin): fixa mensal (SDR/Closer) + valor
 * por reunião comparecida e por venda fechada (SDR/Closer), com um
 * valor de campanha opcional que substitui só a fixa mensal enquanto
 * estiver ligado. */
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
