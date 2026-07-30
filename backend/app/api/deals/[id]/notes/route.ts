import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealNoteSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("deal_notes")
    .select("*, author:profiles(id,name,initials)")
    .eq("deal_id", params.id)
    .order("created_at", { ascending: false });
  if (error) return dbError(error);
  return NextResponse.json({ notes: data });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getCurrentProfile();
  const parsed = await parseBody(request, dealNoteSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("deal_notes")
    .insert({
      deal_id: params.id,
      body: parsed.data.body,
      author_id: user?.id,
      is_ai_generated: parsed.data.is_ai_generated ?? false,
    })
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ note: data }, { status: 201 });
}
