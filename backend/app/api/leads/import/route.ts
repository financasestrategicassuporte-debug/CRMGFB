import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncLeadsFromSheet } from "@/lib/leadImport";

/** Puxa leads da planilha do funil quente ou frio (`?source=quente|frio`)
 * sob demanda — o mesmo sync também roda sozinho 1x/dia (ver
 * `/api/cron/automations`) e automaticamente toda vez que a página
 * "Leads Recebidos" é aberta, então este botão manual é só pra forçar
 * uma atualização imediata.
 *
 * A tabela `leads` não tem policy de INSERT pra usuários autenticados de
 * propósito (só o service role escreve nela — ver migration 0001); por
 * isso o INSERT em si precisa do client admin, mesmo com a rota exigindo
 * sessão de admin pra autorizar a chamada. */
export async function GET(request: Request) {
  const { profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") === "frio" ? "frio" : "quente";

  const admin = createAdminClient();
  const result = await syncLeadsFromSheet(admin, source);
  return NextResponse.json(result);
}
