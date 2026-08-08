import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { distributeLeads, type DistributionStrategy } from "@/lib/distribution";
import { computeSdrStat } from "@/lib/performance";

/** Motor de "cai e já distribui": quando `lead_distribution_settings`
 * está ligado (auto_enabled) e não pausado, todo lead novo (venha do
 * import manual, do cron diário ou do webhook em tempo real) já é
 * convertido em negociação e distribuído sozinho, na estratégia
 * configurada — mesma lógica de conversão de `POST /api/leads/:id/convert`
 * e do motor de `POST /api/leads/distribute`, só que rodando sem
 * intervenção manual. */
export async function autoDistributeNewLeads(admin: SupabaseClient<Database>, leadIds: string[]) {
  if (leadIds.length === 0) return { converted: 0, distributed: 0 };

  const { data: settings } = await admin.from("lead_distribution_settings").select("*").limit(1).maybeSingle();
  if (!settings || !settings.auto_enabled || settings.paused) return { converted: 0, distributed: 0 };

  const { data: leads } = await admin.from("leads").select("*").in("id", leadIds).is("converted_deal_id", null);
  if (!leads || leads.length === 0) return { converted: 0, distributed: 0 };

  const dealIds: string[] = [];
  for (const lead of leads) {
    const { data: deal, error } = await admin
      .from("deals")
      .insert({
        pipeline: lead.source?.includes("quente") ? "quente" : "frio",
        person_name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        campaign: lead.campaign,
        adset: lead.adset,
        ad: lead.ad,
        students_count: lead.students_count,
        revenue: lead.revenue,
        pain_points: lead.pain_points,
        stage: 0,
      })
      .select()
      .single();
    if (error || !deal) continue;
    await admin.from("leads").update({ converted_deal_id: deal.id }).eq("id", lead.id);
    dealIds.push(deal.id);
  }

  if (dealIds.length === 0 || settings.strategy === "manual") {
    return { converted: dealIds.length, distributed: 0 };
  }

  const [{ data: deals }, { data: sdrs }, { data: conversations }] = await Promise.all([
    admin.from("deals").select("id,assigned_to,qualification,stage,revenue,value").in("id", dealIds),
    admin.from("profiles").select("id").eq("role", "sdr").eq("active", true),
    admin.from("conversations").select("sdr_id,created_at,messages(direction,created_at)"),
  ]);
  if (!sdrs || sdrs.length === 0) return { converted: dealIds.length, distributed: 0 };

  const candidatos = sdrs.map((sdr) => {
    const stat = computeSdrStat(sdr.id, deals ?? [], conversations ?? []);
    return { id: sdr.id, cargaAtual: stat.recebidos, taxaAgendamento: stat.taxaAgendamento };
  });
  const atribuicoes = distributeLeads(
    (deals ?? []).map((d) => ({ id: d.id })),
    candidatos,
    settings.strategy as DistributionStrategy
  );

  await Promise.all(
    Object.entries(atribuicoes).map(([dealId, sdrId]) => admin.from("deals").update({ assigned_to: sdrId }).eq("id", dealId))
  );

  return { converted: dealIds.length, distributed: Object.keys(atribuicoes).length };
}
