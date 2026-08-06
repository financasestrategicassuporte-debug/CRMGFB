import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Encerra uma pausa (marca `ended_at`). RLS já garante que só o dono
 * da pausa (ou admin) consegue — não precisa checar aqui. */
export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("break_logs")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ break: data });
}
