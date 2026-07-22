/** Motor de distribuição de leads: recebe uma lista de leads/deals sem
 * dono e uma lista de SDRs com suas métricas de performance, devolve o
 * `assigned_to` escolhido para cada um. Puro e determinístico — nenhuma
 * chamada externa — para ser fácil de testar e auditar. */

export type DistributionStrategy = "round_robin" | "balanceamento" | "peso" | "prioridade" | "manual";

export type SdrCandidate = {
  id: string;
  cargaAtual: number; // deals abertos hoje
  taxaAgendamento: number; // 0..1, usada por "peso" e "prioridade"
};

export type LeadToDistribute = {
  id: string;
  prioridade?: number; // 1-5, maior = mais quente (usado por "prioridade")
};

/** `manualAssignments` é obrigatório quando strategy === "manual": mapa
 * leadId -> sdrId escolhido pelo gestor. */
export function distributeLeads(
  leads: LeadToDistribute[],
  sdrs: SdrCandidate[],
  strategy: DistributionStrategy,
  manualAssignments?: Record<string, string>
): Record<string, string> {
  if (sdrs.length === 0) return {};

  if (strategy === "manual") {
    return manualAssignments ?? {};
  }

  const result: Record<string, string> = {};

  if (strategy === "round_robin") {
    leads.forEach((lead, i) => {
      result[lead.id] = sdrs[i % sdrs.length].id;
    });
    return result;
  }

  if (strategy === "balanceamento") {
    // Sempre manda para quem tem menos deals abertos no momento,
    // simulando a fila esvaziar a cada atribuição.
    const cargas = new Map(sdrs.map((s) => [s.id, s.cargaAtual]));
    for (const lead of leads) {
      const [sdrId] = [...cargas.entries()].sort((a, b) => a[1] - b[1])[0];
      result[lead.id] = sdrId;
      cargas.set(sdrId, (cargas.get(sdrId) ?? 0) + 1);
    }
    return result;
  }

  if (strategy === "peso") {
    // Mais leads para quem converte mais: sorteio ponderado pela taxa
    // de agendamento (peso mínimo 0.05 para não zerar quem está começando).
    const pesos = sdrs.map((s) => Math.max(0.05, s.taxaAgendamento));
    const total = pesos.reduce((a, b) => a + b, 0);
    for (const lead of leads) {
      let r = pseudoRandom(lead.id) * total;
      let escolhido = sdrs[sdrs.length - 1].id;
      for (let i = 0; i < sdrs.length; i++) {
        r -= pesos[i];
        if (r <= 0) {
          escolhido = sdrs[i].id;
          break;
        }
      }
      result[lead.id] = escolhido;
    }
    return result;
  }

  // "prioridade": leads quentes (prioridade alta) vão para os SDRs com
  // melhor taxa de agendamento; os demais seguem round robin no restante.
  const ranking = [...sdrs].sort((a, b) => b.taxaAgendamento - a.taxaAgendamento);
  const ordenados = [...leads].sort((a, b) => (b.prioridade ?? 3) - (a.prioridade ?? 3));
  ordenados.forEach((lead, i) => {
    result[lead.id] = ranking[i % ranking.length].id;
  });
  return result;
}

/** Hash determinístico simples (sem Math.random) para o sorteio ponderado
 * dar sempre o mesmo resultado para o mesmo lead — importante para poder
 * reexecutar/testar a distribuição. */
function pseudoRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}
