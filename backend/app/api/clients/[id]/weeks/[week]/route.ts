import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { weekResponseSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: { id: string; week: string } }
) {
  const { supabase } = await getCurrentProfile();
  const weekNumber = Number(params.week);

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, plan_id")
    .eq("id", params.id)
    .single();
  if (clientError) return dbError(clientError);
  if (!client.plan_id) {
    return NextResponse.json({ error: "Cliente ainda não tem um plano atribuído" }, { status: 404 });
  }

  const { data: week, error: weekError } = await supabase
    .from("playbook_weeks")
    .select("*, fields:playbook_week_fields(*)")
    .eq("plan_id", client.plan_id)
    .eq("week_number", weekNumber)
    .single();
  if (weekError) return dbError(weekError);

  const { data: progress } = await supabase
    .from("client_week_progress")
    .select("*, responses:client_week_field_responses(*)")
    .eq("client_id", params.id)
    .eq("week_number", weekNumber)
    .maybeSingle();

  return NextResponse.json({ week, progress });
}

/** Submits form-field responses for a week, and optionally marks it
 * complete — but only if the previous week is already done, mirroring
 * the sequential-unlock rule from the original playbook UI. */
export async function POST(
  request: Request,
  { params }: { params: { id: string; week: string } }
) {
  const { supabase } = await getCurrentProfile();
  const weekNumber = Number(params.week);

  const parsed = await parseBody(request, weekResponseSchema);
  if ("error" in parsed) return parsed.error;

  if (weekNumber > 1) {
    const { data: previous } = await supabase
      .from("client_week_progress")
      .select("completed")
      .eq("client_id", params.id)
      .eq("week_number", weekNumber - 1)
      .maybeSingle();
    if (!previous?.completed) {
      return NextResponse.json(
        { error: `A semana ${weekNumber - 1} ainda não foi concluída` },
        { status: 409 }
      );
    }
  }

  const { data: progressRow, error: upsertError } = await supabase
    .from("client_week_progress")
    .upsert(
      { client_id: params.id, week_number: weekNumber },
      { onConflict: "client_id,week_number" }
    )
    .select()
    .single();
  if (upsertError) return dbError(upsertError);

  if (parsed.data.responses.length > 0) {
    const rows = parsed.data.responses.map((r) => ({
      client_week_progress_id: progressRow.id,
      playbook_week_field_id: r.playbook_week_field_id,
      response: r.response,
    }));
    const { error: responsesError } = await supabase
      .from("client_week_field_responses")
      .insert(rows);
    if (responsesError) return dbError(responsesError);
  }

  if (parsed.data.complete_week) {
    const { error: completeError } = await supabase
      .from("client_week_progress")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", progressRow.id);
    if (completeError) return dbError(completeError);

    const { data: client } = await supabase
      .from("clients")
      .select("plan:plans(total_weeks)")
      .eq("id", params.id)
      .single();
    const totalWeeks = client?.plan?.total_weeks ?? 12;
    const progress = Math.min(100, Math.round((weekNumber / totalWeeks) * 100));
    await supabase
      .from("clients")
      .update({
        current_week: Math.min(totalWeeks, weekNumber + 1),
        progress,
      })
      .eq("id", params.id);
  }

  return NextResponse.json({ ok: true });
}
