import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseBody } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if ("error" in parsed) return parsed.error;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  return NextResponse.json({ user: data.user, profile });
}
