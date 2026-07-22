import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealUpdateSchema } from "@/lib/validation";

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

  const { data, error } = await supabase
    .from("deals")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ deal: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { error } = await supabase.from("deals").delete().eq("id", params.id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
