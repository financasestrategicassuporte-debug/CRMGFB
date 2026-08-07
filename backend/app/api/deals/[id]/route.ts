import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealUpdateSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { runImmediateDealAutomations } from "@/lib/dealAutomationEngine";

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

  // Regras "imediatas" (delay_days = 0) não podem esperar o cron diário —
  // o SDR precisa da tarefa (ligar/whatsapp) assim que o negócio entra na
  // etapa. As com atraso continuam só pelo cron.
  if (payload.stage !== undefined) {
    try {
      await runImmediateDealAutomations(createAdminClient(), params.id, payload.stage);
    } catch {
      // não deixa uma falha na automação quebrar a resposta do PATCH
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
