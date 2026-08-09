import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { regiaoFromPhone, REGIAO_NAO_IDENTIFICADA } from "@/lib/ddd";
import { LOST_REASONS } from "@/lib/lostReasons";

const STAGE_FECHADO = 6;
const REGIOES_ORDEM = ["Sudeste", "Nordeste", "Sul", "Centro-Oeste", "Norte", REGIAO_NAO_IDENTIFICADA];

const FAIXAS_HORARIO = [
  { label: "Madrugada (00h–06h)", from: 0, to: 6 },
  { label: "Manhã (06h–12h)", from: 6, to: 12 },
  { label: "Tarde (12h–18h)", from: 12, to: 18 },
  { label: "Noite (18h–24h)", from: 18, to: 24 },
];

/** Cruzamentos gerais que complementam os funis por produto: vendas por
 * região (a partir do DDD do telefone do lead), reuniões agendadas por
 * faixa de horário (a partir do due_date das tarefas do tipo "Reunião")
 * e motivos de perda categorizados pela lista canônica do CRM — tudo
 * pra ajudar a enxergar padrão sem depender de nenhum relatório externo. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [{ data: deals, error: dealsError }, { data: reunioes, error: reunioesError }] = await Promise.all([
    supabase.from("deals").select("phone,stage,lost,lost_reason").neq("lost_reason", "Lead duplicado"),
    supabase.from("deal_tasks").select("due_date").eq("task_type", "reuniao").not("due_date", "is", null),
  ]);
  if (dealsError) return dbError(dealsError);
  if (reunioesError) return dbError(reunioesError);

  const porRegiaoMap = new Map<string, { vendas: number; leads: number }>();
  for (const regiao of REGIOES_ORDEM) porRegiaoMap.set(regiao, { vendas: 0, leads: 0 });
  const porMotivoMap = new Map<string, number>();

  for (const deal of deals ?? []) {
    const regiao = regiaoFromPhone(deal.phone);
    const stat = porRegiaoMap.get(regiao) ?? { vendas: 0, leads: 0 };
    stat.leads++;
    if (deal.stage === STAGE_FECHADO) stat.vendas++;
    porRegiaoMap.set(regiao, stat);

    if (deal.lost && deal.lost_reason) {
      const motivo = LOST_REASONS.includes(deal.lost_reason) ? deal.lost_reason : "Outro";
      porMotivoMap.set(motivo, (porMotivoMap.get(motivo) ?? 0) + 1);
    }
  }

  const porRegiao = REGIOES_ORDEM.map((regiao) => ({ regiao, ...porRegiaoMap.get(regiao)! })).filter(
    (r) => r.leads > 0
  );

  const porHorario = FAIXAS_HORARIO.map((faixa) => ({
    faixa: faixa.label,
    quantidade: (reunioes ?? []).filter((r) => {
      const hora = new Date(r.due_date as string).getUTCHours();
      return hora >= faixa.from && hora < faixa.to;
    }).length,
  }));

  const porMotivoPerda = LOST_REASONS.map((motivo) => ({ motivo, quantidade: porMotivoMap.get(motivo) ?? 0 })).filter(
    (m) => m.quantidade > 0
  );
  const outros = porMotivoMap.get("Outro") ?? 0;
  if (outros > 0) porMotivoPerda.push({ motivo: "Outro", quantidade: outros });

  return NextResponse.json({ porRegiao, porHorario, porMotivoPerda });
}
