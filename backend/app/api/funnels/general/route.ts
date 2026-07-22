import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { computeFunnel } from "@/lib/funnels";

export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { data: deals, error } = await supabase
    .from("deals")
    .select("product_id,stage,qualification,revenue,value");
  if (error) return dbError(error);

  return NextResponse.json({ funnel: computeFunnel(deals ?? []) });
}
