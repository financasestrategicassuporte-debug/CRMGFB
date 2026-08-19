import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { commissionRulesUpdateSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMonthlyBaseCommissions } from "@/lib/commissionRules";

/** Configuração única (singleton) da regra base de comissionamento — ver
 * lib/commissionRules.ts pra onde ela é usada. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabase.from("commission_rules").select("*").limit(1).maybeSingle();
  if (error) return dbError(error);
  return NextResponse.json({ rules: data });
}

export async function PATCH(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, commissionRulesUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { data: existing, error: existingError } = await supabase.from("commission_rules").select("id").limit(1).maybeSingle();
  if (existingError) return dbError(existingError);
  if (!existing) return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 });

  const { data, error } = await supabase
    .from("commission_rules")
    .update(parsed.data)
    .eq("id", existing.id)
    .select()
    .single();
  if (error) return dbError(error);

  // Aplica na hora pra quem ainda não tem a fixa desse período (gente
  // nova, ou a regra que acabou de sair de R$0 pra um valor real) — sem
  // esperar o cron do dia seguinte.
  let created = 0;
  try {
    const result = await generateMonthlyBaseCommissions(createAdminClient());
    created = result.created;
  } catch {
    // não deixa uma falha aqui quebrar a atualização da regra
  }

  return NextResponse.json({ rules: data, created });
}
