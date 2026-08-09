import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoDistributeNewLeads } from "@/lib/leadAutoDistribute";

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

  // Ligou o modo automático agora: varre o backlog de leads ainda não
  // convertidos e distribui na hora, não só os que chegarem depois —
  // senão o toggle fica sem efeito visível até o próximo lead novo.
  let backlogDistribuido = 0;
  if (parsed.data.auto_enabled === true && !data.paused) {
    const admin = createAdminClient();
    const { data: pendentes } = await admin.from("leads").select("id").is("converted_deal_id", null);
    const pendenteIds = (pendentes ?? []).map((l) => l.id);
    if (pendenteIds.length > 0) {
      try {
        await autoDistributeNewLeads(admin, pendenteIds);
        backlogDistribuido = pendenteIds.length;
      } catch {
        // não deixa uma falha na distribuição derrubar a atualização das configurações
      }
    }
  }

  return NextResponse.json({ settings: data, backlogDistribuido });
}
