import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { meetingSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { supabase } = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("deal_id");
  const clientId = searchParams.get("client_id");

  let query = supabase.from("meetings").select("*").order("meeting_date", { ascending: false });
  if (dealId) query = query.eq("deal_id", dealId);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ meetings: data });
}

export async function POST(request: Request) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, meetingSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase.from("meetings").insert(parsed.data).select().single();
  if (error) return dbError(error);
  return NextResponse.json({ meeting: data }, { status: 201 });
}
