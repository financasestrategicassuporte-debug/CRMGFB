import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBody, dbError } from "@/lib/api";
import { teamMemberSchema } from "@/lib/validation";

export async function GET() {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return dbError(error);
  return NextResponse.json({ team: data });
}

export async function POST(request: Request) {
  const { profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, teamMemberSchema);
  if ("error" in parsed) return parsed.error;
  const { email, password, name, role, phone, initials, color } = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Falha ao criar usuário" },
      { status: 400 }
    );
  }

  const { data: profileRow, error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, email, name, role, phone, initials, color })
    .select()
    .single();

  if (profileError) {
    // roll back the auth user so we don't leave an orphaned account
    await admin.auth.admin.deleteUser(created.user.id);
    return dbError(profileError);
  }

  return NextResponse.json({ profile: profileRow }, { status: 201 });
}
