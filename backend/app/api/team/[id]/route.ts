import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBody, dbError } from "@/lib/api";
import { teamMemberUpdateSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, teamMemberUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ profile: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const admin = createAdminClient();
  // deleting the auth user cascades to profiles via the FK's ON DELETE CASCADE
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
