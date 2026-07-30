import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { importLeadsFromSheet } from "@/lib/integrations/sheets";

export type SyncResult = { imported: number; skipped: number };

/** Puxa os leads novos de uma planilha (quente/frio) e insere os que
 * ainda não existem (dedupe por telefone/e-mail) — mesma lógica usada
 * tanto pelo botão manual (`GET /api/leads/import`) quanto pelo cron
 * diário, pra manter as duas fontes sempre em dia sem precisar de clique. */
export async function syncLeadsFromSheet(
  supabase: SupabaseClient<Database>,
  source: "quente" | "frio"
): Promise<SyncResult> {
  const novos = await importLeadsFromSheet(source);
  if (novos.length === 0) return { imported: 0, skipped: 0 };

  const { data: existentes } = await supabase.from("leads").select("phone,email");
  const telefones = new Set((existentes ?? []).map((l) => l.phone).filter(Boolean));
  const emails = new Set((existentes ?? []).map((l) => l.email).filter(Boolean));
  const novosUnicos = novos.filter((l) => !(l.phone && telefones.has(l.phone)) && !(l.email && emails.has(l.email)));

  if (novosUnicos.length === 0) return { imported: 0, skipped: novos.length };

  await supabase.from("leads").insert(novosUnicos.map((l) => ({ ...l, source: `sheets_${source}` })));
  return { imported: novosUnicos.length, skipped: novos.length - novosUnicos.length };
}
