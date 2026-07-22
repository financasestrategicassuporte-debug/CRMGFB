import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { automationSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { supabase } = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  let query = supabase.from("automations").select("*").order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ automations: data });
}

export async function POST(request: Request) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, automationSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("automations")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ automation: data }, { status: 201 });
}
