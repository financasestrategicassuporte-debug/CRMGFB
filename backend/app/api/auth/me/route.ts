import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { selfProfileUpdateSchema } from "@/lib/validation";

export async function GET() {
  const { user, profile } = await getCurrentProfile();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json({ user, profile });
}

/** "Meu Perfil": o próprio usuário altera o próprio nome — a RLS
 * `profiles_self_update` (id = auth.uid()) já garante que ninguém edita
 * a linha de outra pessoa, então usa o client de sessão normal, sem
 * precisar de admin client nem checagem de role. Como o nome já é lido
 * dinamicamente em todo lugar (sidebar, tarefas, negociações,
 * comissões...), a mudança aparece pra todo mundo sozinha. */
export async function PATCH(request: Request) {
  const { supabase, user } = await getCurrentProfile();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = await parseBody(request, selfProfileUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ profile: data });
}
