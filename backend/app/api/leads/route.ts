import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBody, dbError } from "@/lib/api";
import { leadSchema } from "@/lib/validation";

/** Team-only: list raw leads awaiting triage/conversion into the CRM. */
export async function GET() {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return dbError(error);
  return NextResponse.json({ leads: data });
}

/** Public: the landing page posts here directly, with no session. RLS has
 * no anon policy on `leads` at all, so this uses the service-role client
 * deliberately and only after validating the payload — the only sanctioned
 * way for the browser to write into this table. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, leadSchema);
  if ("error" in parsed) return parsed.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leads")
    .insert({ ...parsed.data, source: parsed.data.source ?? "landing_page" })
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ lead: data }, { status: 201 });
}
