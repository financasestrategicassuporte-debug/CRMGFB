import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { clientSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { supabase } = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const atividade = searchParams.get("atividade_status");
  const financeiro = searchParams.get("financeiro_status");
  const consultantId = searchParams.get("consultant_id");

  let query = supabase
    .from("clients")
    .select("*, plan:plans(*), consultant:profiles(id,name,initials,color)")
    .order("created_at", { ascending: false });

  if (atividade) query = query.eq("atividade_status", atividade);
  if (financeiro) query = query.eq("financeiro_status", financeiro);
  if (consultantId) query = query.eq("consultant_id", consultantId);

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ clients: data });
}

export async function POST(request: Request) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, clientSchema);
  if ("error" in parsed) return parsed.error;

  const { data: client, error } = await supabase
    .from("clients")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return dbError(error);

  // seed week-1 progress row and the D+1..D+10 dunning ladder so the new
  // client shows up immediately in every operational view
  await supabase.from("client_week_progress").insert({ client_id: client.id, week_number: 1 });
  const today = new Date();
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

  return NextResponse.json({ client }, { status: 201 });
}
