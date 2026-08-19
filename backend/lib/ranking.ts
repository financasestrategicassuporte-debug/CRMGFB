/** Ranking do mês — SDR compete com SDR, Closer compete com Closer,
 * cada um na métrica que faz sentido pro papel dele: SDR é dono do
 * negócio (`deals.assigned_to`); Closer é quem consta como responsável
 * na tarefa de Reunião (`deal_tasks.assigned_to` quando task_type é
 * "reuniao") — são papéis diferentes na mesma negociação. */

type Deal = {
  id: string;
  assigned_to: string | null;
  stage: number;
  revenue: number | null;
  value: number | null;
  first_attended_at: string | null;
  stage_changed_at: string | null;
};

type ReuniaoTask = { deal_id: string; assigned_to: string | null };

type Member = { id: string; name: string; initials: string | null; color: string | null };

export type RankingRow = {
  id: string;
  name: string;
  initials: string | null;
  color: string | null;
  reunioes: number;
  vendas: number;
  receita: number;
};

const STAGE_FECHADO = 6;

function inMonth(iso: string | null, monthStart: Date, monthEnd: Date) {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= monthStart && d < monthEnd;
}

export function rankSdrs(deals: Deal[], sdrs: Member[], monthStart: Date, monthEnd: Date): RankingRow[] {
  const rows = sdrs.map((sdr) => {
    const meus = deals.filter((d) => d.assigned_to === sdr.id);
    const reunioes = meus.filter((d) => inMonth(d.first_attended_at, monthStart, monthEnd)).length;
    const vendidos = meus.filter((d) => d.stage === STAGE_FECHADO && inMonth(d.stage_changed_at, monthStart, monthEnd));
    return {
      id: sdr.id,
      name: sdr.name,
      initials: sdr.initials,
      color: sdr.color,
      reunioes,
      vendas: vendidos.length,
      receita: vendidos.reduce((sum, d) => sum + (d.revenue ?? d.value ?? 0), 0),
    };
  });
  return rows.sort((a, b) => b.vendas - a.vendas || b.reunioes - a.reunioes);
}

export function rankClosers(deals: Deal[], reuniaoTasks: ReuniaoTask[], closers: Member[], monthStart: Date, monthEnd: Date): RankingRow[] {
  const dealsById = new Map(deals.map((d) => [d.id, d]));
  const rows = closers.map((closer) => {
    const meusDealIds = new Set(reuniaoTasks.filter((t) => t.assigned_to === closer.id).map((t) => t.deal_id));
    const meus = [...meusDealIds].map((id) => dealsById.get(id)).filter((d): d is Deal => !!d);
    const reunioes = meus.filter((d) => inMonth(d.first_attended_at, monthStart, monthEnd)).length;
    const vendidos = meus.filter((d) => d.stage === STAGE_FECHADO && inMonth(d.stage_changed_at, monthStart, monthEnd));
    return {
      id: closer.id,
      name: closer.name,
      initials: closer.initials,
      color: closer.color,
      reunioes,
      vendas: vendidos.length,
      receita: vendidos.reduce((sum, d) => sum + (d.revenue ?? d.value ?? 0), 0),
    };
  });
  return rows.sort((a, b) => b.vendas - a.vendas || b.reunioes - a.reunioes);
}
