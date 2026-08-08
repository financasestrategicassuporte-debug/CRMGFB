import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncMarketingSpend } from "@/lib/integrations/marketingSpend";

/** Sincroniza `ad_spend` com o investimento real do dashboard de
 * marketing — chamado ao abrir Dashboard/Dashboard de Produtos (igual
 * o sync de leads ao abrir "Leads Recebidos") e também 1x/dia pelo cron,
 * pra funcionar mesmo com ninguém olhando a tela. */
export async function GET() {
  const { profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const result = await syncMarketingSpend(createAdminClient());
  return NextResponse.json(result);
}
