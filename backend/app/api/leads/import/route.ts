import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { importLeadsFromSheet } from "@/lib/integrations/sheets";

/** Puxa leads da planilha do funil quente ou frio (`?source=quente|frio`)
 * e insere os que ainda não existem (dedupe por telefone/e-mail). Sem
 * credencial do Google Sheets configurada, `importLeadsFromSheet` devolve
 * lista vazia — o endpoint responde normalmente, só não traz nada novo. */
export async function GET(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") === "frio" ? "frio" : "quente";

  const novos = await importLeadsFromSheet(source);
  if (novos.length === 0) {
    return NextResponse.json({ imported: [], skipped: 0 });
  }

  const { data: existentes, error: existentesError } = await supabase
    .from("leads")
    .select("phone,email");
  if (existentesError) return dbError(existentesError);

  const telefones = new Set((existentes ?? []).map((l) => l.phone).filter(Boolean));
  const emails = new Set((existentes ?? []).map((l) => l.email).filter(Boolean));
  const novosUnicos = novos.filter((l) => !(l.phone && telefones.has(l.phone)) && !(l.email && emails.has(l.email)));

  if (novosUnicos.length === 0) {
    return NextResponse.json({ imported: [], skipped: novos.length });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("leads")
    .insert(novosUnicos.map((l) => ({ ...l, source: `sheets_${source}` })))
    .select();
  if (insertError) return dbError(insertError);

  return NextResponse.json({ imported: inserted, skipped: novos.length - novosUnicos.length });
}
