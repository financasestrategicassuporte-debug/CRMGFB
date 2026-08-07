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
