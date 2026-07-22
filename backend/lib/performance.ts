/** Agregações de performance (SDR e Closer) compartilhadas entre
 * `GET /performance/sdr(/:id)` e `GET /performance/closer(/:id)` — mesmo
 * padrão de redução em memória de `commercial/summary`. */

type Deal = {
  assigned_to: string | null;
  qualification: number | null;
  stage: number;
  revenue: number | null;
  value: number | null;
};

type ConversationWithMessages = {
  sdr_id: string | null;
  created_at: string;
  messages: { direction: string; created_at: string }[] | null;
};

export function computeSdrStat(sdrId: string, deals: Deal[], conversations: ConversationWithMessages[]) {
  const meusDeals = deals.filter((d) => d.assigned_to === sdrId);
  const recebidos = meusDeals.length;
  const qualificados = meusDeals.filter((d) => (d.qualification ?? 0) >= 3).length;
  const agendados = meusDeals.filter((d) => d.stage >= 2).length;

  const minhasConversas = conversations.filter((c) => c.sdr_id === sdrId);
  const tempos: number[] = [];
  for (const conv of minhasConversas) {
    const primeiraSaida = (conv.messages ?? [])
      .filter((m) => m.direction === "out")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    if (primeiraSaida) {
      tempos.push((new Date(primeiraSaida.created_at).getTime() - new Date(conv.created_at).getTime()) / 60_000);
    }
  }
  const tmrMinutos = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
  const respondidos = minhasConversas.filter((c) => (c.messages ?? []).some((m) => m.direction === "out")).length;

  return {
    recebidos,
    respondidos,
    qualificados,
    agendados,
    tmrMinutos,
    taxaAgendamento: recebidos > 0 ? agendados / recebidos : 0,
  };
}

// Estágios do kanban (0-6): 0 sem contato · 1 contato feito · 2 reunião
// agendada · 3 remarcar reunião · 4 entrar em contato · 5 negociação/
// proposta · 6 acompanhamento (venda fechada).
const STAGE_REUNIAO_AGENDADA = 2;
const STAGE_PROPOSTA = 5;
const STAGE_FECHADO = 6;

export function computeCloserStat(closerId: string, deals: Deal[]) {
  const meusDeals = deals.filter((d) => d.assigned_to === closerId);
  const reunioes = meusDeals.filter((d) => d.stage >= STAGE_REUNIAO_AGENDADA).length;
  const propostas = meusDeals.filter((d) => d.stage >= STAGE_PROPOSTA).length;
  const fechamentos = meusDeals.filter((d) => d.stage === STAGE_FECHADO).length;
  const receita = meusDeals
    .filter((d) => d.stage === STAGE_FECHADO)
    .reduce((sum, d) => sum + (d.revenue ?? d.value ?? 0), 0);

  return {
    reunioes,
    propostas,
    fechamentos,
    receita,
    ticketMedio: fechamentos > 0 ? receita / fechamentos : 0,
    conversao: reunioes > 0 ? fechamentos / reunioes : 0,
    comparecimentoRate: reunioes > 0 ? propostas / reunioes : 0,
  };
}
