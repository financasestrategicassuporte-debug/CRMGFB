import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealTaskSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("deal_tasks")
    .select("*, assignee:profiles(id,name,initials)")
    .eq("deal_id", params.id)
    .order("created_at", { ascending: true });
  if (error) return dbError(error);
  return NextResponse.json({ tasks: data });
}

const STAGE_AGENDADO = 2;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, dealTaskSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("deal_tasks")
    .insert({ deal_id: params.id, ...parsed.data })
    .select("*, assignee:profiles(id,name,initials)")
    .single();
  if (error) return dbError(error);

  // Criar uma tarefa de Reunião é mais uma forma de marcar "Reunião
  // Agendada" (além de mover o card no kanban / qualificar) — usa o
  // mesmo campo `stage` como fonte única da verdade, só avança se ainda
  // não tiver chegado lá, nunca reduz nem duplica o indicador.
  if (parsed.data.task_type === "reuniao") {
    const { data: deal } = await supabase.from("deals").select("stage").eq("id", params.id).single();
    if (deal && deal.stage < STAGE_AGENDADO) {
      await supabase.from("deals").update({ stage: STAGE_AGENDADO }).eq("id", params.id);
    }
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
