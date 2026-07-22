/** Motor da Matriz RFV — recência/frequência/valor + health score + grupo
 * de ciclo de vida. Tudo aqui é determinístico e roda a partir de
 * `purchases` + o status atual do `client` (sem depender de nenhuma IA
 * externa), recalculado uma vez por dia pelo cron `rfv-recalc`. */

export type Purchase = { valor: number; data: string };

const EX_CLIENTE_CORTE_DIAS = 90;
const JANELA_MESES = 36;

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** Recência/frequência/valor/ticket médio/tempo entre compras, dentro da
 * janela de 36 meses usada pela tela "Matriz RFV". */
export function computePurchaseStats(purchases: Purchase[], today = new Date()) {
  const janelaCorte = new Date(today);
  janelaCorte.setMonth(janelaCorte.getMonth() - JANELA_MESES);

  const dentroDaJanela = purchases
    .filter((p) => new Date(p.data) >= janelaCorte)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  if (dentroDaJanela.length === 0) {
    return { recenciaDias: Infinity, frequencia: 0, valor: 0, ticketMedio: 0, tempoEntreComprasDias: null as number | null };
  }

  const ultima = new Date(dentroDaJanela[dentroDaJanela.length - 1].data);
  const recenciaDias = daysBetween(today, ultima);
  const frequencia = dentroDaJanela.length;
  const valor = dentroDaJanela.reduce((sum, p) => sum + p.valor, 0);
  const ticketMedio = valor / frequencia;

  let tempoEntreComprasDias: number | null = null;
  if (frequencia > 1) {
    const intervalos: number[] = [];
    for (let i = 1; i < dentroDaJanela.length; i++) {
      intervalos.push(daysBetween(new Date(dentroDaJanela[i].data), new Date(dentroDaJanela[i - 1].data)));
    }
    tempoEntreComprasDias = intervalos.reduce((s, v) => s + v, 0) / intervalos.length;
  }

  return { recenciaDias, frequencia, valor, ticketMedio, tempoEntreComprasDias };
}

/** Health score 0–100 (seção 5 do prompt), adaptado às colunas que
 * realmente existem em `clients`: recência/frequência de compra vêm de
 * `purchases`; "pagamento em dia" e "comparecimento/interação" vêm do
 * status operacional do playbook (`financeiro_status`/`atividade_status`)
 * — não temos NPS nem log de abertura de WhatsApp por cliente ainda. */
export function healthScore(input: {
  recenciaDias: number;
  frequencia: number;
  financeiroEmDia: boolean;
  atividadeEmDia: boolean;
}): number {
  let score = 50;
  score += input.recenciaDias <= 30 ? 15 : input.recenciaDias > 180 ? -25 : 0;
  score += input.frequencia >= 4 ? 20 : input.frequencia >= 2 ? 8 : 0;
  score += input.atividadeEmDia ? 20 : -20;
  score += input.financeiroEmDia ? 10 : -15;
  return Math.max(0, Math.min(100, score));
}

/** Posição em quintil (1 = pior 20%, 5 = melhor 20%) de `value` dentro da
 * distribuição `sortedAsc` (mesma base usada pela tela, que informa
 * explicitamente "as notas usam sempre quintis"). */
export function quintileRank(value: number, sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 3;
  let count = 0;
  for (const v of sortedAsc) if (v <= value) count++;
  const pct = count / sortedAsc.length;
  return Math.min(5, Math.max(1, Math.ceil(pct * 5)));
}

export const RFV_GROUPS = [
  "Campeão",
  "Campeão se despedindo",
  "Potencial campeão",
  "Cliente fiel",
  "Jovem talento",
  "Recém-chegado",
  "Carente",
  "Fiel abandonado",
  "Baixo potencial",
  "Talento desperdiçado",
  "Ex-campeão",
  "Perdido",
] as const;
export type RfvGroup = (typeof RFV_GROUPS)[number];

/** Classifica o cliente em um dos 12 grupos de ciclo de vida. A recência
 * absoluta decide o corte de ex-cliente (90 dias, igual ao texto da tela);
 * dentro de cada lado desse corte, frequência/valor em quintil decidem o
 * grupo — é uma adaptação prática do RFM clássico para os 12 rótulos que
 * o front já usa, não uma fórmula de mercado fechada. */
/** A partir de várias linhas de `rfv_snapshots` (várias datas por
 * cliente), devolve só o snapshot mais recente de cada um — usado pelos
 * endpoints de leitura da Matriz RFV, que sempre olham a "foto de hoje". */
export function latestByClient<T extends { client_id: string; data: string }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const atual = map.get(row.client_id);
    if (!atual || row.data > atual.data) map.set(row.client_id, row);
  }
  return map;
}

export function classifyGroup(input: {
  recenciaDias: number;
  fQuintile: number;
  vQuintile: number;
}): RfvGroup {
  const { recenciaDias, fQuintile, vQuintile } = input;
  const recente = recenciaDias <= 30;

  if (recenciaDias > EX_CLIENTE_CORTE_DIAS) {
    return fQuintile >= 4 || vQuintile >= 4 ? "Ex-campeão" : "Perdido";
  }

  if (fQuintile >= 5 && vQuintile >= 5) return "Campeão";
  if (fQuintile >= 4 && vQuintile >= 4 && !recente) return "Campeão se despedindo";
  if (fQuintile >= 4 && vQuintile >= 3 && recente) return "Potencial campeão";
  if (fQuintile >= 3 && vQuintile >= 4 && !recente) return "Talento desperdiçado";
  if (fQuintile <= 1 && recente) return "Recém-chegado";
  if (fQuintile <= 2 && recente) return "Jovem talento";
  if (fQuintile >= 3 && vQuintile >= 3) return "Cliente fiel";
  if (fQuintile <= 2 && vQuintile <= 2 && !recente) return "Carente";
  if (fQuintile <= 2 && !recente) return "Fiel abandonado";
  return "Baixo potencial";
}
