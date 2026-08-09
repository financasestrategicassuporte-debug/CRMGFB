import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealUpdateSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { runImmediateDealAutomations } from "@/lib/dealAutomationEngine";
import { awardMeetingCommission, revokeSdrCommission, LOST_REASON_REVOKES_SDR_COMMISSION } from "@/lib/commissionRules";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("deals")
    .select("*, assignee:profiles(id,name,initials,color), notes:deal_notes(*)")
    .eq("id", params.id)
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ deal: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, dealUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const payload = { ...parsed.data } as typeof parsed.data & { stage_changed_at?: string };
  if (payload.stage !== undefined) {
    payload.stage_changed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("deals")
    .update(payload)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return dbError(error);

  // Motivo de perda específico = qualificação errada/mentida do SDR —
  // derruba qualquer comissão automática (reunião/venda) já lançada
  // pra essa negociação.
  if (payload.lost === true && payload.lost_reason === LOST_REASON_REVOKES_SDR_COMMISSION) {
    try {
      await revokeSdrCommission(createAdminClient(), params.id);
    } catch {
      // não deixa a revogação quebrar o PATCH
    }
  }

  // Tarefas não podem esperar o cron diário: a de hoje e as de 24h/48h/72h
  // já são criadas todas juntas assim que o negócio entra na etapa, cada
  // uma com o due_date certo — o SDR já vê a fila inteira. E-mail/WhatsApp
  // com atraso continuam esperando o cron disparar na data certa.
  if (payload.stage !== undefined) {
    const admin = createAdminClient();
    try {
      await runImmediateDealAutomations(admin, params.id, payload.stage);
    } catch {
      // não deixa uma falha na automação quebrar a resposta do PATCH
    }
    // "Reunião qualificada comparecida" = negócio cruzou pra etapa >= 3.
    // O trigger deals_set_first_attended_at só grava a data; quem decide
    // se paga comissão (e evita pagar de novo se o estágio oscilar) é a
    // constraint única (deal_id, tipo) — o insert repetido só falha.
    if (payload.stage >= 3) {
      try {
        await awardMeetingCommission(admin, params.id, data.assigned_to);
      } catch {
        // idem — comissão não pode quebrar o PATCH de estágio
      }
    }
  }

  return NextResponse.json({ deal: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { error } = await supabase.from("deals").delete().eq("id", params.id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
