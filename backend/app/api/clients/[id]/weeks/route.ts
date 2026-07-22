import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Lists the client's plan weeks merged with their completion progress. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, plan_id")
    .eq("id", params.id)
    .single();
  if (clientError) return dbError(clientError);
  if (!client.plan_id) return NextResponse.json({ weeks: [] });

  const { data: weeks, error: weeksError } = await supabase
    .from("playbook_weeks")
    .select("*, fields:playbook_week_fields(*)")
    .eq("plan_id", client.plan_id)
    .order("week_number");
  if (weeksError) return dbError(weeksError);

  const { data: progress, error: progressError } = await supabase
    .from("client_week_progress")
    .select("*")
    .eq("client_id", params.id);
  if (progressError) return dbError(progressError);

  const progressByWeek = new Map(progress.map((p) => [p.week_number, p]));
  const merged = weeks.map((w) => ({
    ...w,
    progress: progressByWeek.get(w.week_number) ?? null,
  }));

  return NextResponse.json({ weeks: merged });
}
