/** Motor de Gargalos & Decisão: regras determinísticas sobre os mesmos
 * agregados que alimentam `commercial/summary` e `performance/*` — sem
 * IA, só limiares. Cada regra vira um item de `GET /bottlenecks` (status
 * por área) ou `GET /decisions` (recomendação acionável). */

export type AreaStatus = "Saudável" | "Atenção" | "Gargalo";

export type BottleneckArea = {
  area: "Marketing" | "SDR" | "Closer" | "Entrega" | "Financeiro";
  status: AreaStatus;
  title: string;
  detail: string;
};

export type Decision = {
  category: "OPORTUNIDADE" | "RISCO" | "PESSOAS" | "CAPACIDADE";
  title: string;
  detail: string;
};

type SdrStat = { id: string; name: string; tmrMinutos: number; taxaAgendamento: number };
type CloserStat = { id: string; name: string; comparecimentoRate: number; conversao: number; receita: number };
type ProductStat = { name: string; roi: number; comparecimentoRate: number };

const TMR_ALERTA_MULTIPLICADOR = 1.5;
const COMPARECIMENTO_QUEDA_ALERTA = 0.15; // 15pp abaixo da média = gargalo

export function evaluateBottlenecks(input: {
  leadsVariacaoPct: number;
  sdrs: SdrStat[];
  closers: CloserStat[];
  clientesNoPrazoPct: number;
  clientesInadimplentesSemContato: number;
}): BottleneckArea[] {
  const areas: BottleneckArea[] = [];

  areas.push({
    area: "Marketing",
    status: input.leadsVariacaoPct >= 0 ? "Saudável" : input.leadsVariacaoPct >= -0.1 ? "Atenção" : "Gargalo",
    title: `Leads ${input.leadsVariacaoPct >= 0 ? "+" : ""}${Math.round(input.leadsVariacaoPct * 100)}% vs. período anterior`,
    detail: input.leadsVariacaoPct >= 0 ? "Volume saudável, custo por lead estável." : "Volume de leads caindo — revisar campanhas ativas.",
  });

  const tmrMedio = avg(input.sdrs.map((s) => s.tmrMinutos));
  const piorSdr = input.sdrs.reduce<SdrStat | null>((worst, s) => (!worst || s.tmrMinutos > worst.tmrMinutos ? s : worst), null);
  const sdrGargalo = piorSdr && tmrMedio > 0 && piorSdr.tmrMinutos > tmrMedio * TMR_ALERTA_MULTIPLICADOR;
  areas.push({
    area: "SDR",
    status: sdrGargalo ? "Atenção" : "Saudável",
    title: sdrGargalo ? "Tempo de resposta subindo" : "Tempo de resposta sob controle",
    detail: sdrGargalo && piorSdr
      ? `${piorSdr.name} está com ${piorSdr.tmrMinutos} min de TMR (média ${Math.round(tmrMedio)} min).`
      : `TMR médio do time: ${Math.round(tmrMedio)} min.`,
  });

  const comparecimentoMedio = avg(input.closers.map((c) => c.comparecimentoRate));
  const piorProduto = input.closers.reduce<CloserStat | null>((worst, c) => (!worst || c.comparecimentoRate < worst.comparecimentoRate ? c : worst), null);
  const closerGargalo = piorProduto && comparecimentoMedio > 0 && comparecimentoMedio - piorProduto.comparecimentoRate > COMPARECIMENTO_QUEDA_ALERTA;
  areas.push({
    area: "Closer",
    status: closerGargalo ? "Gargalo" : "Saudável",
    title: closerGargalo ? "Comparecimento caiu" : "Comparecimento estável",
    detail: closerGargalo && piorProduto
      ? `${piorProduto.name} com comparecimento de ${Math.round(piorProduto.comparecimentoRate * 100)}%, abaixo da média do time.`
      : "Comparecimento dentro do esperado.",
  });

  areas.push({
    area: "Entrega",
    status: input.clientesNoPrazoPct >= 0.8 ? "Saudável" : input.clientesNoPrazoPct >= 0.6 ? "Atenção" : "Gargalo",
    title: "Jornadas no prazo",
    detail: `${Math.round(input.clientesNoPrazoPct * 100)}% dos clientes em dia com as atividades.`,
  });

  areas.push({
    area: "Financeiro",
    status: input.clientesInadimplentesSemContato === 0 ? "Saudável" : input.clientesInadimplentesSemContato <= 2 ? "Gargalo" : "Gargalo",
    title: input.clientesInadimplentesSemContato > 0 ? "Inadimplência acima da meta" : "Inadimplência sob controle",
    detail: `${input.clientesInadimplentesSemContato} clientes sem contato há mais de 5 dias.`,
  });

  return areas;
}

export function generateDecisions(input: {
  products: ProductStat[];
  sdrs: SdrStat[];
  closers: CloserStat[];
  capacidadeOciosaReunioes: number;
}): Decision[] {
  const decisions: Decision[] = [];

  const melhorProduto = input.products.reduce<ProductStat | null>((best, p) => (!best || p.roi > best.roi ? p : best), null);
  if (melhorProduto) {
    decisions.push({
      category: "OPORTUNIDADE",
      title: `Aumentar orçamento de ${melhorProduto.name} em 20%`,
      detail: `Maior ROI dos últimos 30 dias (${Math.round(melhorProduto.roi * 100)}%) com CAC abaixo da média.`,
    });
  }

  const piorComparecimento = input.products.reduce<ProductStat | null>((worst, p) => (!worst || p.comparecimentoRate < worst.comparecimentoRate ? p : worst), null);
  if (piorComparecimento && piorComparecimento.comparecimentoRate < 0.75) {
    decisions.push({
      category: "RISCO",
      title: `Reduzir no-show de ${piorComparecimento.name}`,
      detail: `Comparecimento de ${Math.round(piorComparecimento.comparecimentoRate * 100)}% derruba a conversão. Reforçar lembretes 24h e 1h antes.`,
    });
  }

  const tmrMedio = avg(input.sdrs.map((s) => s.tmrMinutos));
  const piorSdr = input.sdrs.reduce<SdrStat | null>((worst, s) => (!worst || s.tmrMinutos > worst.tmrMinutos ? s : worst), null);
  if (piorSdr && tmrMedio > 0 && piorSdr.tmrMinutos > tmrMedio * TMR_ALERTA_MULTIPLICADOR) {
    decisions.push({
      category: "PESSOAS",
      title: `Acompanhar ${piorSdr.name} (SDR)`,
      detail: `Tempo de resposta ${(piorSdr.tmrMinutos / tmrMedio).toFixed(1)}x acima da média e menor taxa de agendamento do time.`,
    });
  }

  if (input.capacidadeOciosaReunioes > 0) {
    decisions.push({
      category: "CAPACIDADE",
      title: `Time absorve +${input.capacidadeOciosaReunioes} reuniões/semana`,
      detail: "Ociosidade nos Closers permite escalar mídia sem novas contratações.",
    });
  }

  return decisions;
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
