import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapQuenteRow, mapFrioRow } from "@/lib/integrations/sheets";
import { insertLeadIfNew } from "@/lib/leadImport";
import { autoDistributeNewLeads } from "@/lib/leadAutoDistribute";

/** Recebe, em tempo real, a linha recém-adicionada em uma das planilhas
 * (Apps Script instalado na própria planilha chama isto no exato momento
 * em que a linha aparece — ver instruções entregues ao usuário). Sem
 * sessão de usuário (é o Google Apps Script chamando), autentica via
 * `LEADS_WEBHOOK_SECRET` no header Authorization, mesmo padrão do
 * `CRON_SECRET`. `?source=quente|frio` escolhe o mapeamento de colunas. */
export async function POST(request: Request) {
  const secret = process.env.LEADS_WEBHOOK_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") === "frio" ? "frio" : "quente";

  const row = (await request.json().catch(() => null)) as Record<string, string> | null;
  if (!row) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const mapper = source === "quente" ? mapQuenteRow : mapFrioRow;
  const lead = mapper(row);
  if (!lead) return NextResponse.json({ skipped: true, reason: "linha sem nome ou de teste" });

  const admin = createAdminClient();
  try {
    const result = await insertLeadIfNew(admin, { ...lead, source: `sheets_${source}` });
    if (result.inserted && result.lead?.id) {
      try {
        await autoDistributeNewLeads(admin, [result.lead.id as string]);
      } catch {
        // não deixa a distribuição automática quebrar o webhook
      }
    }
    return NextResponse.json(result, { status: result.inserted ? 201 : 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 400 });
  }
}
