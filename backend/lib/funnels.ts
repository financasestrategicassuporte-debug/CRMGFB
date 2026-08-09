/** Funil consolidado (geral e por produto) + cruzamento com investimento
 * em mídia (`ad_spend`) para CAC/ROI/ROAS — mesmo padrão de redução em
 * memória usado no resto do commercial. */

type Deal = {
  product_id: string | null;
  stage: number;
  qualification: number | null;
  revenue: number | null;
  value: number | null;
  lost_reason?: string | null;
};

// Ver comentário em lib/performance.ts sobre os estágios do kanban.
const STAGE_AGENDADO = 2;
const STAGE_NEGOCIACAO = 5;
const STAGE_FECHADO = 6;

// Lead duplicado não é um lead real — não deve inflar nenhum indicador
// (recebidos, qualificados, agendamentos etc.) em nenhuma tela que usa
// computeFunnel (Dashboard Geral, Dashboard Produtos, Funis, Gargalos).
const DUPLICATE_LOST_REASON = "Lead duplicado";

// Reunião realmente aconteceu, mas o lead optou por não fechar — não
// avança de estágio (o negócio é marcado como perdido ali mesmo), então
// sem essa exceção esse comparecimento sumiria do indicador. Não mexe
// no gatilho de comissão do SDR (deals_set_first_attended_at, stage>=3),
// que é uma lógica separada e não pode ser alterada por essa definição.
export const MEETING_HAPPENED_LOST_REASON = "Reunião acontecida e o lead optou por não realizar o projeto";

export function computeFunnel(deals: Deal[]) {
  const validDeals = deals.filter((d) => d.lost_reason !== DUPLICATE_LOST_REASON);
  const leads = validDeals.length;
  const qualificados = validDeals.filter((d) => (d.qualification ?? 0) >= 3).length;
  const agendamentos = validDeals.filter((d) => d.stage >= STAGE_AGENDADO).length;
  // Comparecimento = chegou em Negociação/Acompanhamento (ou foi vendido,
  // que é um subconjunto disso) ou a reunião aconteceu mas o lead optou
  // por não fechar — "Remarcar Reunião"/"Entrar em Contato" não contam
  // mais aqui porque não é garantia de que a reunião de fato aconteceu.
  const comparecimentos = validDeals.filter(
    (d) => d.stage >= STAGE_NEGOCIACAO || d.lost_reason === MEETING_HAPPENED_LOST_REASON
  ).length;
  const vendas = validDeals.filter((d) => d.stage === STAGE_FECHADO).length;
  const receita = validDeals
    .filter((d) => d.stage === STAGE_FECHADO)
    .reduce((sum, d) => sum + (d.revenue ?? d.value ?? 0), 0);

  return { leads, qualificados, agendamentos, comparecimentos, vendas, receita };
}

export function computeProductEconomics(funnel: ReturnType<typeof computeFunnel>, investimento: number) {
  const { comparecimentos, vendas, receita } = funnel;
  return {
    investimento,
    // Custo por reunião usa comparecimentos (reuniões que de fato
    // aconteceram), não agendamentos (marcadas, mas nem toda marcada
    // acontece) — fórmula: investimento / reuniões acontecidas.
    custoPorReuniao: comparecimentos > 0 ? investimento / comparecimentos : 0,
    custoPorVenda: vendas > 0 ? investimento / vendas : 0,
    cac: vendas > 0 ? investimento / vendas : 0,
    roi: investimento > 0 ? (receita - investimento) / investimento : 0,
    roas: investimento > 0 ? receita / investimento : 0,
    lucro: receita - investimento,
    conversao: funnel.leads > 0 ? vendas / funnel.leads : 0,
  };
}
