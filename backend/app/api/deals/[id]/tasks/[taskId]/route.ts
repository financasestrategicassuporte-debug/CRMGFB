import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealTaskUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: { id: string; taskId: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, dealTaskUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("deal_tasks")
    .update(parsed.data)
    .eq("id", params.taskId)
    .eq("deal_id", params.id)
    .select("*, assignee:profiles(id,name,initials)")
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ task: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string; taskId: string } }) {
  const { supabase } = await getCurrentProfile();
  const { error } = await supabase.from("deal_tasks").delete().eq("id", params.taskId).eq("deal_id", params.id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
