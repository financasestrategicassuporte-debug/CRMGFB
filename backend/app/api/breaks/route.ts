import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";

const startBreakSchema = z.object({
  tipo: z.enum(["banheiro", "almoco", "outro"]),
});

/** Registro de pausa voluntário (banheiro/almoço/outro) — só pra folha
 * de ponto, sem nenhum bloqueio de funcionalidade associado.
 *   - `GET ?current=1`: a pausa em aberto do usuário logado (se houver),
 *     usado pelo widget pra saber se mostra "iniciar" ou "voltar".
 *   - `GET` (sem current): admin only, folha de ponto do time — aceita
 *     `?from=&to=&profile_id=`.
 *   - `POST`: inicia uma pausa (idempotente — se já tem uma aberta,
 *     devolve ela em vez de criar outra). */
export async function GET(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);

  if (searchParams.get("current") === "1") {
    const { data, error } = await supabase
      .from("break_logs")
      .select("*")
      .eq("profile_id", profile.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return dbError(error);
    return NextResponse.json({ current: data });
  }

  const forbidden = requireAdmin(profile.role);
  if (forbidden) return forbidden;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const profileId = searchParams.get("profile_id");

  let query = supabase
    .from("break_logs")
    .select("*, profile:profiles(id,name,initials,color)")
    .order("started_at", { ascending: false });
  if (from) query = query.gte("started_at", from);
  if (to) query = query.lte("started_at", `${to}T23:59:59.999`);
  if (profileId) query = query.eq("profile_id", profileId);

  const { data, error } = await query;
  if (error) return dbError(error);
  return NextResponse.json({ breaks: data });
}

export async function POST(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = await parseBody(request, startBreakSchema);
  if ("error" in parsed) return parsed.error;

  const { data: existing, error: existingError } = await supabase
    .from("break_logs")
    .select("*")
    .eq("profile_id", profile.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return dbError(existingError);
  if (existing) return NextResponse.json({ break: existing });

  const { data, error } = await supabase
    .from("break_logs")
    .insert({ profile_id: profile.id, tipo: parsed.data.tipo })
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ break: data }, { status: 201 });
}
