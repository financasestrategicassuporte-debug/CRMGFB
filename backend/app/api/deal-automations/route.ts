import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealAutomationSchema } from "@/lib/validation";

export async function GET() {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("deal_automations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return dbError(error);
  return NextResponse.json({ automations: data });
}

export async function POST(request: Request) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, dealAutomationSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase.from("deal_automations").insert(parsed.data).select().single();
  if (error) return dbError(error);
  return NextResponse.json({ automation: data }, { status: 201 });
}
