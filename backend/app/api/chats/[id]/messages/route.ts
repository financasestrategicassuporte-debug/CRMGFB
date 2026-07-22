import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { messageSchema } from "@/lib/validation";
import { analyzeConversation } from "@/lib/chatAi";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });
  if (error) return dbError(error);
  return NextResponse.json({ messages: data });
}

/** Grava a mensagem e roda a "IA da conversa" (heurística determinística
 * em `lib/chatAi.ts`) para atualizar resumo/intenção/objeções exibidos no
 * painel lateral do módulo Chats. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, messageSchema);
  if ("error" in parsed) return parsed.error;

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({ conversation_id: params.id, direction: parsed.data.direction ?? "in", content: parsed.data.content })
    .select()
    .single();
  if (messageError) return dbError(messageError);

  const { data: historico, error: historicoError } = await supabase
    .from("messages")
    .select("direction,content")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });
  if (historicoError) return dbError(historicoError);

  const analise = analyzeConversation(historico ?? []);
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .update({ ia_resumo: analise.resumo, ia_intencao: analise.intencao, ia_objecoes: analise.objecoes })
    .eq("id", params.id)
    .select()
    .single();
  if (convError) return dbError(convError);

  return NextResponse.json({ message, conversation, analise }, { status: 201 });
}
