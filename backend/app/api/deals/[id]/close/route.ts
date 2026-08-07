import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { awardSaleCommission } from "@/lib/commissionRules";

/** Fecha a negociação (venda ganha): move o deal pro estágio final
 * (Acompanhamento) e cria o `client` correspondente já com o playbook
 * de onboarding rodando — mesmo efeito colateral de `POST /api/clients`
 * (semana 1 + régua de cobrança D+1..D+10), mais uma `purchase` "nova"
 * pra Matriz RFV já enxergar essa venda. É o elo que faltava entre o
 * CRM (deals) e a entrega (clients) — sem isso, fechar um negócio no
 * kanban não criava nada na base de clientes. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("*")
    .eq("id", params.id)
    .single();
  if (dealError) return dbError(dealError);

  if (deal.stage === 6) {
    return NextResponse.json({ error: "Esta negociação já foi fechada" }, { status: 409 });
  }

  const valor = deal.revenue ?? deal.value ?? 0;
  const today = new Date();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: deal.person_name,
      plan_id: deal.product_id ?? null,
      consultant_id: deal.assigned_to ?? null,
      closer_id: deal.assigned_to ?? null,
      valor,
      start_date: today.toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (clientError) return dbError(clientError);

  await supabase.from("client_week_progress").insert({ client_id: client.id, week_number: 1 });

  const offsets = [
    { step: "D+1", days: 1 },
    { step: "D+3", days: 3 },
    { step: "D+5", days: 5 },
    { step: "D+7", days: 7 },
    { step: "D+10", days: 10 },
  ] as const;
  await supabase.from("cobranca_steps").insert(
    offsets.map(({ step, days }) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return { client_id: client.id, step, scheduled_for: d.toISOString().slice(0, 10) };
    })
  );

  if (valor > 0) {
    await supabase.from("purchases").insert({
      client_id: client.id,
      product_id: deal.product_id ?? null,
      valor,
      tipo: "nova",
      data: today.toISOString().slice(0, 10),
    });
  }

  const { data: closedDeal, error: updateError } = await supabase
    .from("deals")
    .update({ stage: 6, revenue: valor, stage_changed_at: today.toISOString() })
    .eq("id", params.id)
    .select()
    .single();
  if (updateError) return dbError(updateError);

  // Bônus de fechamento pro SDR dono da negociação — comissão por venda
  // além da de reunião comparecida (a constraint (deal_id, tipo) evita
  // duplicar se o deal já tivesse sido fechado e reaberto).
  try {
    await awardSaleCommission(createAdminClient(), params.id, deal.assigned_to);
  } catch {
    // não deixa a comissão quebrar o fechamento da venda
  }

  const monthStart = `${today.toISOString().slice(0, 7)}-01`;
  const { data: monthPurchases } = await supabase.from("purchases").select("valor").gte("data", monthStart);
  const saleNumber = monthPurchases?.length ?? 1;
  const monthRevenue = (monthPurchases ?? []).reduce((sum, p) => sum + (p.valor ?? 0), 0);

  return NextResponse.json({ client, deal: closedDeal, saleNumber, monthRevenue }, { status: 201 });
}
