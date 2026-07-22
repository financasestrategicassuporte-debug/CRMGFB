import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { auditSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("audits")
    .select("*, author:profiles(id,name,initials)")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return dbError(error);
  return NextResponse.json({ audits: data });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getCurrentProfile();
  const parsed = await parseBody(request, auditSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("audits")
    .insert({ ...parsed.data, client_id: params.id, author_id: user?.id })
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ audit: data }, { status: 201 });
}
