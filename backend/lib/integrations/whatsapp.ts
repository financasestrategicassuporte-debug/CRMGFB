/** WhatsApp Cloud API (Meta) — envio de mensagens. Sem
 * `WHATSAPP_CLOUD_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` configurados, faz
 * no-op e loga em vez de lançar erro, para automações/testes rodarem
 * fim-a-fim antes de a credencial real existir. */

export type SendResult = { status: "sent" | "skipped" | "failed"; detail?: string };

export async function sendWhatsapp(to: string, message: string): Promise<SendResult> {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.info(`[whatsapp:skipped] sem credencial configurada — mensagem para ${to} não enviada: "${message}"`);
    return { status: "skipped", detail: "WHATSAPP_CLOUD_TOKEN/WHATSAPP_PHONE_NUMBER_ID não configurados" };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
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
