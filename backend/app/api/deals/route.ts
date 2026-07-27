import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealSchema } from "@/lib/validation";

/** "Status da negociação" — filtro único no topo do CRM (dropdown do
 * mockup): combina lost/paused/stage numa única seleção pro usuário, em
 * vez de expor cada flag como um parâmetro separado.
 *   - andamento: ativa, não vendida, não perdida, não pausada (default)
 *   - vendido: stage 6, não perdida
 *   - perdido: lost = true
 *   - pausado: paused = true
 *   - nao_pausado: paused = false (pode incluir vendidas/perdidas)
 *   - all: sem filtro nenhum */
export async function GET(request: Request) {
  const { supabase } = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const pipeline = searchParams.get("pipeline");
  const stage = searchParams.get("stage");
  const assignedTo = searchParams.get("assigned_to");
  const status = searchParams.get("status") ?? "andamento";

  let query = supabase
    .from("deals")
    .select("*, assignee:profiles(id,name,initials,color), tasks:deal_tasks(id,title,done,due_date,task_type)")
    .order("created_at", { ascending: false });

  if (pipeline) query = query.eq("pipeline", pipeline);
  if (stage) query = query.eq("stage", Number(stage));
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  switch (status) {
    case "andamento":
      query = query.eq("lost", false).eq("paused", false).neq("stage", 6);
      break;
    case "vendido":
      query = query.eq("stage", 6).eq("lost", false);
      break;
    case "perdido":
      query = query.eq("lost", true);
      break;
    case "pausado":
      query = query.eq("paused", true);
      break;
    case "nao_pausado":
      query = query.eq("paused", false);
      break;
    case "all":
    default:
      break;
  }

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ deals: data });
}

export async function POST(request: Request) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, dealSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase.from("deals").insert(parsed.data).select().single();
  if (error) return dbError(error);
  return NextResponse.json({ deal: data }, { status: 201 });
}
