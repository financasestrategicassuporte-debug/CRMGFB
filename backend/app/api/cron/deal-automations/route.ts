import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDealAutomations } from "@/lib/dealAutomationEngine";

/** Ponto de entrada manual/CLI (`vercel crons run`) pro motor de
 * automações de CRM — o disparo automático de verdade acontece dentro do
 * cron diário `/api/cron/automations`, que já roda 1x/dia (ver comentário
 * em lib/dealAutomationEngine.ts sobre o limite de cron do plano atual). */
export async function GET(request: Request) {
  const forbidden = verifyCronSecret(request);
  if (forbidden) return forbidden;

  const admin = createAdminClient();
  const result = await runDealAutomations(admin);
  return NextResponse.json(result);
}
