/** Resumo diário do SDR/Closer via Claude (Anthropic) — mesmo padrão de
 * callAnalysis.ts: sem `ANTHROPIC_API_KEY` configurada, o caller usa a
 * mensagem de fallback baseada em regra (sempre útil, nunca depende da
 * IA pra funcionar). A chave nunca roda no navegador. */
export async function generateDailyCoachingMessage(context: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 220,
        messages: [
          {
            role: "user",
            content: `Você é um coach de vendas direto e motivador, escrevendo pra um SDR/Closer de uma empresa de mentoria pra academias. Com base nos dados abaixo, escreva um resumo curto (máximo 3 frases, português do Brasil, tom confiante e prático — sem emojis em excesso) dizendo: (1) em qual negociação focar primeiro e por quê, (2) o que precisa de atenção urgente, (3) uma dica objetiva de como melhorar o resultado. Seja específico usando os nomes reais dos dados, não genérico.

DADOS DE HOJE:
${context}`,
          },
        ],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  } catch {
    return "";
  }
}
