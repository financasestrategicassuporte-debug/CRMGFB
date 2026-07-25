import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { dealTaskSchema } from "@/lib/validation";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("deal_tasks")
    .select("*, assignee:profiles(id,name,initials)")
    .eq("deal_id", params.id)
    .order("created_at", { ascending: true });
  if (error) return dbError(error);
  return NextResponse.json({ tasks: data });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, dealTaskSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("deal_tasks")
    .insert({ deal_id: params.id, ...parsed.data })
    .select("*, assignee:profiles(id,name,initials)")
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ task: data }, { status: 201 });
}
