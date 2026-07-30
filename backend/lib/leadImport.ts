import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { importLeadsFromSheet, type SheetLead } from "@/lib/integrations/sheets";

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

  const { error } = await supabase.from("leads").insert(novosUnicos.map((l) => ({ ...l, source: `sheets_${source}` })));
  if (error) throw new Error(error.message);
  return { imported: novosUnicos.length, skipped: novos.length - novosUnicos.length };
}

/** Insere um único lead já mapeado (vindo do webhook em tempo real do
 * Apps Script) se ainda não existir um com o mesmo telefone/e-mail.
 * Mesmo dedupe do sync em lote, mas para uma linha só. */
export async function insertLeadIfNew(
  supabase: SupabaseClient<Database>,
  lead: SheetLead
): Promise<{ inserted: boolean; lead?: Record<string, unknown> }> {
  if (lead.phone || lead.email) {
    const orFilters = [
      lead.phone ? `phone.eq.${lead.phone}` : null,
      lead.email ? `email.eq.${lead.email}` : null,
    ].filter(Boolean) as string[];
    const { data: existing } = await supabase.from("leads").select("id").or(orFilters.join(",")).limit(1);
    if (existing && existing.length > 0) return { inserted: false };
  }

  const { data, error } = await supabase.from("leads").insert(lead).select().single();
  if (error) throw new Error(error.message);
  return { inserted: true, lead: data };
}
