/** Disparo de e-mail (Resend). Sem `RESEND_API_KEY` configurada, faz
 * no-op e loga — mesma lógica de `whatsapp.ts`. */

export type SendResult = { status: "sent" | "skipped" | "failed"; detail?: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "gymplus@example.com";

  if (!apiKey) {
    console.info(`[email:skipped] sem RESEND_API_KEY configurada — e-mail para ${to} não enviado: "${subject}"`);
    return { status: "skipped", detail: "RESEND_API_KEY não configurada" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { status: "failed", detail };
    }
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", detail: err instanceof Error ? err.message : String(err) };
  }
}
