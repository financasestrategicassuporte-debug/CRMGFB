import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(2),
  total_weeks: z.number().int().min(1).default(12),
  price: z.number().nonnegative().optional(),
});

export async function GET() {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase.from("plans").select("*").order("name");
  if (error) return dbError(error);
  return NextResponse.json({ plans: data });
}

export async function POST(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, planSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase.from("plans").insert(parsed.data).select().single();
  if (error) return dbError(error);
  return NextResponse.json({ plan: data }, { status: 201 });
}
