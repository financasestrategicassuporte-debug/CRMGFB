/** Deterministic lead-scoring formula for the CRM qualification wizard.
 * Combines gym size, revenue, stated pain, urgency and current tooling
 * into a 0–100 score, then maps it to a 1–5 qualification and a pipeline
 * classification (quente/morno/frio). Tune the weights as real
 * conversion data comes in. */
export function scoreLead(input: {
  students_count: number;
  revenue: number;
  pain_level: number; // 1-5, self-reported pain intensity
  urgency: number; // 1-5, how soon they want to start
  uses_software: boolean; // already using a CRM/marketing tool
}) {
  const sizeScore = Math.min(30, Math.round((input.students_count / 300) * 30));
  const revenueScore = Math.min(25, Math.round((input.revenue / 50000) * 25));
  const painScore = Math.round((input.pain_level / 5) * 25);
  const urgencyScore = Math.round((input.urgency / 5) * 15);
  const toolingScore = input.uses_software ? 0 : 5;

  const score = Math.max(
    0,
    Math.min(100, sizeScore + revenueScore + painScore + urgencyScore + toolingScore)
  );

  const qualification = Math.max(1, Math.min(5, Math.ceil(score / 20)));
  const classification: "quente" | "morno" | "frio" =
    score >= 70 ? "quente" : score >= 40 ? "morno" : "frio";

  return { score, qualification, classification };
}
