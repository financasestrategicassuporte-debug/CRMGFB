import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { automationUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, automationUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("automations")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ automation: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { error } = await supabase.from("automations").delete().eq("id", params.id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
