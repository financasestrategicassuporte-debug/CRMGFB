/** Funil consolidado (geral e por produto) + cruzamento com investimento
 * em mídia (`ad_spend`) para CAC/ROI/ROAS — mesmo padrão de redução em
 * memória usado no resto do commercial. */

type Deal = {
  product_id: string | null;
  stage: number;
  qualification: number | null;
  revenue: number | null;
  value: number | null;
};

// Ver comentário em lib/performance.ts sobre os estágios do kanban.
const STAGE_AGENDADO = 2;
const STAGE_COMPARECEU = 3;
const STAGE_FECHADO = 6;

export function computeFunnel(deals: Deal[]) {
  const leads = deals.length;
  const qualificados = deals.filter((d) => (d.qualification ?? 0) >= 3).length;
  const agendamentos = deals.filter((d) => d.stage >= STAGE_AGENDADO).length;
  const comparecimentos = deals.filter((d) => d.stage >= STAGE_COMPARECEU).length;
  const vendas = deals.filter((d) => d.stage === STAGE_FECHADO).length;
  const receita = deals
    .filter((d) => d.stage === STAGE_FECHADO)
    .reduce((sum, d) => sum + (d.revenue ?? d.value ?? 0), 0);

  return { leads, qualificados, agendamentos, comparecimentos, vendas, receita };
}

export function computeProductEconomics(funnel: ReturnType<typeof computeFunnel>, investimento: number) {
  const { agendamentos, vendas, receita } = funnel;
  return {
    investimento,
    custoPorReuniao: agendamentos > 0 ? investimento / agendamentos : 0,
    custoPorVenda: vendas > 0 ? investimento / vendas : 0,
    cac: vendas > 0 ? investimento / vendas : 0,
    roi: investimento > 0 ? (receita - investimento) / investimento : 0,
    roas: investimento > 0 ? receita / investimento : 0,
    lucro: receita - investimento,
    conversao: funnel.leads > 0 ? vendas / funnel.leads : 0,
  };
}
