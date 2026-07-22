import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBody, dbError } from "@/lib/api";
import { whatsappWebhookSchema } from "@/lib/validation";
import { analyzeConversation } from "@/lib/chatAi";

/** Verificação do webhook (handshake da Meta Cloud API): responde o
 * `hub.challenge` quando `hub.verify_token` bate com
 * `WHATSAPP_VERIFY_TOKEN`. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Verificação inválida" }, { status: 403 });
}

/** Recebe mensagens inbound. NOTA: sem uma credencial real da Meta para
 * validar o formato exato do payload ainda, este endpoint aceita um
 * shape simplificado (`from`, `message`, `sdr_id`, `deal_id?`) — ao
 * conectar a Cloud API de verdade, adaptar o parse para o formato oficial
 * (`entry[].changes[].value.messages[]`) mantendo a lógica abaixo
 * (achar/criar conversa, gravar mensagem, rodar a IA) igual. Sem sessão de
 * usuário (é a Meta chamando), por isso usa o client de service role. */
export async function POST(request: Request) {
  const parsed = await parseBody(request, whatsappWebhookSchema);
  if ("error" in parsed) return parsed.error;
  const { from, message, sdr_id, deal_id } = parsed.data;

  const admin = createAdminClient();

  let conversation = null;
  if (deal_id) {
    const { data } = await admin
      .from("conversations")
      .select("*")
      .eq("deal_id", deal_id)
      .eq("channel", "whatsapp")
      .maybeSingle();
    conversation = data;
  }

  if (!conversation) {
    const { data: created, error: createError } = await admin
      .from("conversations")
      .insert({ deal_id: deal_id ?? null, sdr_id, channel: "whatsapp" })
      .select()
      .single();
    if (createError) return dbError(createError);
    conversation = created;
  }

  const { error: messageError } = await admin
    .from("messages")
    .insert({ conversation_id: conversation.id, direction: "in", content: message });
  if (messageError) return dbError(messageError);

  const { data: historico } = await admin
    .from("messages")
    .select("direction,content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  const analise = analyzeConversation(historico ?? []);
  await admin
    .from("conversations")
    .update({ ia_resumo: analise.resumo, ia_intencao: analise.intencao, ia_objecoes: analise.objecoes })
    .eq("id", conversation.id);

  return NextResponse.json({ received: true, from, conversationId: conversation.id, analise });
}
