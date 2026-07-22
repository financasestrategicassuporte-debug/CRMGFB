/** "IA da conversa" do módulo Chats: resumo/intenção/objeção/próximo
 * passo por palavra-chave, no mesmo espírito determinístico de
 * `scoreLead` — sem chamar nenhum provedor de LLM externo. Roda toda vez
 * que uma mensagem inbound é registrada em `POST /chats/:id/messages`. */

export type ChatAnalysis = {
  resumo: string;
  intencao: string;
  objecoes: string[];
  proximoPasso: string;
};

const OBJECOES: { palavras: string[]; label: string }[] = [
  { palavras: ["caro", "preço", "preco", "valor alto", "desconto"], label: "Objeção de preço" },
  { palavras: ["pensar", "depois", "outro momento", "não sei"], label: "Objeção de tempo/indecisão" },
  { palavras: ["concorrente", "outra empresa", "outra consultoria"], label: "Comparando com concorrente" },
  { palavras: ["não funciona", "não confio", "já tentei"], label: "Objeção de confiança/ceticismo" },
];

const INTENCOES: { palavras: string[]; label: string }[] = [
  { palavras: ["quando", "que horas", "agenda", "disponibilidade", "terça", "quarta", "quinta", "sexta"], label: "Agendamento" },
  { palavras: ["quanto custa", "qual o valor", "investimento", "plano"], label: "Qualificando" },
  { palavras: ["obrigado", "recebi", "combinado", "ok"], label: "Confirmação/nutrição" },
  { palavras: ["quero", "vamos", "fechar", "topo"], label: "Alta intenção" },
];

function containsAny(text: string, palavras: string[]) {
  const lower = text.toLowerCase();
  return palavras.some((p) => lower.includes(p));
}

/** Analisa a última mensagem inbound (mais o histórico curto, se houver)
 * e devolve o mesmo shape exibido no painel "IA da conversa" do front. */
export function analyzeConversation(messages: { direction: string; content: string }[]): ChatAnalysis {
  const ultimaInbound = [...messages].reverse().find((m) => m.direction === "in");
  const texto = ultimaInbound?.content ?? "";

  const objecoes = OBJECOES.filter((o) => containsAny(texto, o.palavras)).map((o) => o.label);
  const intencaoEncontrada = INTENCOES.find((i) => containsAny(texto, i.palavras));
  const intencao = intencaoEncontrada?.label ?? "Em andamento";

  const resumo = ultimaInbound
    ? `Última mensagem: "${texto.slice(0, 140)}"${texto.length > 140 ? "…" : ""}`
    : "Sem mensagens recebidas ainda.";

  let proximoPasso = "Aguardar retorno do lead.";
  if (objecoes.length > 0) {
    proximoPasso = "Responder a objeção antes de avançar — reforçar valor/caso de sucesso.";
  } else if (intencao === "Agendamento") {
    proximoPasso = "Confirmar horário sugerido e criar tarefa no CRM.";
  } else if (intencao === "Alta intenção") {
    proximoPasso = "Enviar proposta/link de fechamento agora.";
  } else if (intencao === "Qualificando") {
    proximoPasso = "Enviar detalhes do plano e reforçar próximo passo (reunião).";
  }

  return { resumo, intencao, objecoes, proximoPasso };
}
