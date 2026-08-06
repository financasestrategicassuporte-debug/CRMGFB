/** Análise de ligações SDR via Claude (Anthropic). Sem `ANTHROPIC_API_KEY`
 * configurada, faz no-op e retorna um aviso — mesma lógica de `email.ts`
 * e `whatsapp.ts`. A chave nunca roda no navegador: só o servidor chama
 * a Anthropic, o widget de ligação (`app/(app)/call`) só fala com a
 * nossa própria rota `/api/ai/analyze-call`. */

const DEFAULT_CRITERIA = `Critérios SDR Gestão Fitness Brasil:
1. SDR se apresentou claramente?
2. Qualificou o lead (faturamento, alunos, cargo)?
3. Gerou interesse genuíno?
4. Agendou reunião ou próximo passo?
5. Tom profissional e confiante?
6. Superou objeções com eficácia?
Avalie e dê nota de 0 a 10.`;

export type AnalyzeResult = { status: "ok" | "skipped" | "failed"; analysis: string };

export async function analyzeCallTranscript(transcript: string, criteria?: string): Promise<AnalyzeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.info("[call-analysis:skipped] sem ANTHROPIC_API_KEY configurada — ligação salva sem análise de IA");
    return { status: "skipped", analysis: "⚠️ Análise de IA desativada — configure ANTHROPIC_API_KEY no servidor." };
  }
  if (!transcript || transcript.trim().length < 10) {
    return { status: "skipped", analysis: "⚠️ Transcrição vazia ou muito curta para análise." };
  }

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
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Analise esta ligação SDR com os critérios abaixo. Responda em português, direto e objetivo.

CRITÉRIOS:
${criteria || DEFAULT_CRITERIA}

TRANSCRIÇÃO:
${transcript}

Formato obrigatório:
✅ Pontos fortes: (lista rápida)
⚠️ Melhorar: (lista rápida)
📊 Nota: X/10
💡 Recomendação: (1 frase)`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { status: "failed", analysis: `Erro ao analisar com IA (${res.status}): ${detail.slice(0, 200)}` };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    return { status: "ok", analysis: text || "Erro na análise: resposta vazia." };
  } catch (err) {
    return { status: "failed", analysis: `Erro ao conectar com a IA: ${err instanceof Error ? err.message : String(err)}` };
  }
}
