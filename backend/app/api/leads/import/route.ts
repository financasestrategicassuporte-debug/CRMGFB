import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { syncLeadsFromSheet } from "@/lib/leadImport";

/** Puxa leads da planilha do funil quente ou frio (`?source=quente|frio`)
 * sob demanda — o mesmo sync também roda sozinho 1x/dia (ver
 * `/api/cron/automations`) e automaticamente toda vez que a página
 * "Leads Recebidos" é aberta, então este botão manual é só pra forçar
 * uma atualização imediata. */
export async function GET(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") === "frio" ? "frio" : "quente";

  const result = await syncLeadsFromSheet(supabase, source);
  return NextResponse.json(result);
}
