import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { clientUpdateSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("clients")
    .select("*, plan:plans(*), consultant:profiles(id,name,initials,color)")
    .eq("id", params.id)
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ client: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, clientUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("clients")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ client: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { error } = await supabase.from("clients").delete().eq("id", params.id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
