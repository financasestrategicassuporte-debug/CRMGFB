import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { conversationSchema } from "@/lib/validation";

/** Inbox de conversas — RLS já filtra: admin vê todas, sdr/closer só as
 * suas (policies `conversations_admin_all`/`conversations_self`). */
export async function GET(request: Request) {
  const { supabase } = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");

  let query = supabase
    .from("conversations")
    .select("*, sdr:profiles(id,name,initials,color), deal:deals(id,person_name,product), messages(content,direction,created_at)")
    .order("updated_at", { ascending: false });
  if (owner) query = query.eq("sdr_id", owner);

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ conversations: data });
}

export async function POST(request: Request) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, conversationSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase.from("conversations").insert(parsed.data).select().single();
  if (error) return dbError(error);
  return NextResponse.json({ conversation: data }, { status: 201 });
}
