import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";

const updateSchema = z.object({
  strategy: z.enum(["round_robin", "balanceamento", "peso", "prioridade", "manual"]).optional(),
  auto_enabled: z.boolean().optional(),
  paused: z.boolean().optional(),
});

/** Configuração única (singleton) do motor de distribuição automática de
 * leads — ver lib/leadAutoDistribute.ts pra onde ela é lida. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabase.from("lead_distribution_settings").select("*").limit(1).maybeSingle();
  if (error) return dbError(error);
  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, updateSchema);
  if ("error" in parsed) return parsed.error;

  const { data: existing, error: existingError } = await supabase.from("lead_distribution_settings").select("id").limit(1).maybeSingle();
  if (existingError) return dbError(existingError);
  if (!existing) return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 });

  const { data, error } = await supabase
    .from("lead_distribution_settings")
    .update(parsed.data)
    .eq("id", existing.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ settings: data });
}
