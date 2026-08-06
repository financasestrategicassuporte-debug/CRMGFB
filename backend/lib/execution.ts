/** Relatório de Execução: tempo de resposta ao lead, tarefas vencidas e
 * negociações paradas — os três sinais de "onde alguém está enrolando"
 * que dão pra medir só com dado de sistema, sem monitorar pausa nenhuma
 * do colaborador (banheiro/almoço). Tudo aqui é derivado de
 * deals/deal_tasks, mesmo padrão de redução em memória do resto do
 * commercial. */

export type ExecutionDeal = {
  id: string;
  person_name: string;
  company_name: string | null;
  assigned_to: string | null;
  created_at: string;
  first_contacted_at: string | null;
  stage: number;
  stage_changed_at: string;
  lost: boolean;
};

export type ExecutionTask = {
  id: string;
  deal_id: string;
  title: string;
  assigned_to: string | null;
  due_date: string | null;
  done: boolean;
};

const STAGE_FECHADO = 6;

// Negociação ativa sem trocar de etapa há 3 dias corridos = parada.
export const STALLED_DAYS_THRESHOLD = 3;

export function minutesBetween(from: string, to: string) {
  return (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
}

/** Tempo médio (minutos) entre o lead cair e a negociação sair do
 * estágio 0 pela primeira vez — só conta quem já foi contatado; quem
 * ainda está parado em "Sem Contato" entra em `semContato`, não puxa a
 * média pra baixo por engano. */
export function computeResponseTime(deals: ExecutionDeal[]) {
  const contatados = deals.filter((d) => d.first_contacted_at);
  const tempos = contatados.map((d) => minutesBetween(d.created_at, d.first_contacted_at!));
  const avgMinutos = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
  const semContato = deals.filter((d) => !d.first_contacted_at && !d.lost && d.stage === 0).length;
  return { avgMinutos, respondidos: contatados.length, semContato };
}

export function responseTimeBySdr(sdrId: string, deals: ExecutionDeal[]) {
  return computeResponseTime(deals.filter((d) => d.assigned_to === sdrId));
}

/** Tarefas em aberto com prazo já vencido — mesmo critério do chip
 * "Atrasada" do kanban, mas consolidado pra visão do admin. */
export function computeOverdueTasks(tasks: ExecutionTask[], dealsById: Map<string, ExecutionDeal>, now = new Date()) {
  return tasks
    .filter((t) => !t.done && t.due_date && new Date(t.due_date) < now)
    .map((t) => {
      const deal = dealsById.get(t.deal_id);
      const ownerId = t.assigned_to ?? deal?.assigned_to ?? null;
      const diasAtraso = t.due_date ? Math.max(0, Math.floor((now.getTime() - new Date(t.due_date).getTime()) / 86_400_000)) : 0;
      return {
        taskId: t.id,
        title: t.title,
        dealId: t.deal_id,
        dealName: deal ? (deal.company_name ? `${deal.company_name} – ${deal.person_name}` : deal.person_name) : "—",
        ownerId,
        dueDate: t.due_date,
        diasAtraso,
      };
    })
    .sort((a, b) => b.diasAtraso - a.diasAtraso);
}

export function countOverdueTasksByOwner(overdueTasks: ReturnType<typeof computeOverdueTasks>, ownerId: string) {
  return overdueTasks.filter((t) => t.ownerId === ownerId).length;
}

/** Negociações ativas (não vendidas, não perdidas) sem troca de etapa
 * há STALLED_DAYS_THRESHOLD dias — sinal de que ninguém está tocando
 * aquele lead, mesmo sem tarefa vencida associada. */
export function computeStalledDeals(deals: ExecutionDeal[], now = new Date()) {
  return deals
    .filter((d) => !d.lost && d.stage !== STAGE_FECHADO)
    .map((d) => ({ deal: d, diasParada: Math.floor((now.getTime() - new Date(d.stage_changed_at).getTime()) / 86_400_000) }))
    .filter((x) => x.diasParada >= STALLED_DAYS_THRESHOLD)
    .sort((a, b) => b.diasParada - a.diasParada);
}

export function countStalledDealsByOwner(stalled: ReturnType<typeof computeStalledDeals>, ownerId: string) {
  return stalled.filter((x) => x.deal.assigned_to === ownerId).length;
}
