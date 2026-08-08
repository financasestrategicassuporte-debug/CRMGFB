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
const STAGE_COMPARECEU = 3;
const STAGE_FECHADO = 6;

// Lead duplicado não é um lead real — não deve inflar nenhum indicador
// (recebidos, qualificados, agendamentos etc.) em nenhuma tela que usa
// computeFunnel (Dashboard Geral, Dashboard Produtos, Funis, Gargalos).
const DUPLICATE_LOST_REASON = "Lead duplicado";

export function computeFunnel(deals: Deal[]) {
  const validDeals = deals.filter((d) => d.lost_reason !== DUPLICATE_LOST_REASON);
  const leads = validDeals.length;
  const qualificados = validDeals.filter((d) => (d.qualification ?? 0) >= 3).length;
  const agendamentos = validDeals.filter((d) => d.stage >= STAGE_AGENDADO).length;
  const comparecimentos = validDeals.filter((d) => d.stage >= STAGE_COMPARECEU).length;
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
