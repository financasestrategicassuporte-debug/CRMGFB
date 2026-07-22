import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { supabase } = await getCurrentProfile();
  const { searchParams } = new URL(request.url);
  const pipeline = searchParams.get("pipeline");
  const stage = searchParams.get("stage");
  const assignedTo = searchParams.get("assigned_to");

  let query = supabase
    .from("deals")
    .select("*, assignee:profiles(id,name,initials,color)")
    .order("created_at", { ascending: false });

  if (pipeline) query = query.eq("pipeline", pipeline);
  if (stage) query = query.eq("stage", Number(stage));
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ deals: data });
}

export async function POST(request: Request) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, dealSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase.from("deals").insert(parsed.data).select().single();
  if (error) return dbError(error);
  return NextResponse.json({ deal: data }, { status: 201 });
}
