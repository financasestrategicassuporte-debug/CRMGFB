/** Motor de automação (SE gatilho → ENTÃO ação). `condition_json` é
 * declarativo — hoje cobre os gatilhos de exemplo da spec (plano semanal
 * de sexta, lembrete de atraso, cobrança de inadimplente); novos tipos
 * de condição entram aqui, sem precisar mexer no cron que só chama
 * `resolveTargets`. */

export type ConditionJson =
  | { when: "friday_weekly" }
  | { when: "atividade_atrasada" }
  | { when: "financeiro_inadimplente" }
  | { when: "sempre" };

export type ClientState = {
  id: string;
  name: string;
  atividade_status: string;
  financeiro_status: string;
};

/** Decide, para a rodada de hoje, quais clientes disparam a automação. */
export function resolveTargets(condition: ConditionJson | null | undefined, clients: ClientState[], today = new Date()): ClientState[] {
  if (!condition) return [];

  switch (condition.when) {
    case "friday_weekly":
      return today.getDay() === 5 ? clients : [];
    case "atividade_atrasada":
      return clients.filter((c) => c.atividade_status === "atrasado");
    case "financeiro_inadimplente":
      return clients.filter((c) => c.financeiro_status === "inadimplente");
    case "sempre":
      return clients;
    default:
      return [];
  }
}

export function buildMessage(titulo: string, clientName: string) {
  return `${titulo} — ${clientName}`;
}
