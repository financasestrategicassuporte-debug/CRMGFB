import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError, parseBody } from "@/lib/api";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("cobranca_steps")
    .select("*")
    .eq("client_id", params.id)
    .order("scheduled_for");
  if (error) return dbError(error);
  return NextResponse.json({ steps: data });
}

const markDoneSchema = z.object({ step_id: z.string().uuid(), done: z.boolean() });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, markDoneSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("cobranca_steps")
    .update({
      done: parsed.data.done,
      done_at: parsed.data.done ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.step_id)
    .eq("client_id", params.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ step: data });
}
