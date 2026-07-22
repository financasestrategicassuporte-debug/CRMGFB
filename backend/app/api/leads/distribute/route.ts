import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { distributeSchema } from "@/lib/validation";
import { distributeLeads } from "@/lib/distribution";
import { computeSdrStat } from "@/lib/performance";

/** Aplica o motor de distribuição (botão "Distribuir por Performance" do
 * CRM) sobre uma lista de deals ainda sem dono, atualizando
 * `assigned_to` de cada um. */
export async function POST(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, distributeSchema);
  if ("error" in parsed) return parsed.error;
  const { lead_ids, strategy, manual_assignments } = parsed.data;

  const [{ data: deals, error: dealsError }, { data: sdrs, error: sdrsError }, { data: conversations, error: convError }] =
    await Promise.all([
      supabase.from("deals").select("id,assigned_to,qualification,stage,revenue,value").in("id", lead_ids),
      supabase.from("profiles").select("id").eq("role", "sdr").eq("active", true),
      supabase.from("conversations").select("sdr_id,created_at,messages(direction,created_at)"),
    ]);
  if (dealsError) return dbError(dealsError);
  if (sdrsError) return dbError(sdrsError);
  if (convError) return dbError(convError);

  if (!sdrs || sdrs.length === 0) {
    return NextResponse.json({ error: "Nenhum SDR ativo para distribuir" }, { status: 400 });
  }

  const candidatos = sdrs.map((sdr) => {
    const stat = computeSdrStat(sdr.id, deals ?? [], conversations ?? []);
    return { id: sdr.id, cargaAtual: stat.recebidos, taxaAgendamento: stat.taxaAgendamento };
  });

  const atribuicoes = distributeLeads(
    (deals ?? []).map((d) => ({ id: d.id })),
    candidatos,
    strategy,
    manual_assignments
  );

  const atualizacoes = await Promise.all(
    Object.entries(atribuicoes).map(([dealId, sdrId]) =>
      supabase.from("deals").update({ assigned_to: sdrId }).eq("id", dealId).select().single()
    )
  );
  const erro = atualizacoes.find((r) => r.error);
  if (erro?.error) return dbError(erro.error);

  return NextResponse.json({ deals: atualizacoes.map((r) => r.data) });
}
