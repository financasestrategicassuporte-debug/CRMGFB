import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Agenda interna — tarefas de Ligação/Reunião com data marcada, pro
 * calendário em /agenda. SDR/Closer só vê a própria (assigned_to = eu);
 * admin vê todo mundo, com filtro opcional `?user_id=`. `?from=`/`?to=`
 * (YYYY-MM-DD) recortam o intervalo — a tela manda o mês visível. */
export async function GET(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userIdParam = searchParams.get("user_id");

  let query = supabase
    .from("deal_tasks")
    .select("id, title, task_type, due_date, done, deal:deals(id,person_name,company_name), assignee:profiles(id,name,initials,color)")
    .in("task_type", ["reuniao", "ligacao"])
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  if (from) query = query.gte("due_date", `${from}T00:00:00`);
  if (to) query = query.lte("due_date", `${to}T23:59:59`);

  if (profile.role === "admin") {
    if (userIdParam) query = query.eq("assigned_to", userIdParam);
  } else {
    query = query.eq("assigned_to", profile.id);
  }

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ tasks: data });
}
