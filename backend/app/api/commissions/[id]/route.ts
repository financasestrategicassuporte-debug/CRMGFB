import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Admin only — marcar como paga/pendente ou apagar um lançamento
 * manual (fixo/extra). Comissão "por venda" (tipo=venda) segue a mesma
 * rota, sem tratamento especial. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const status = body.status === "paid" ? "paid" : body.status === "pending" ? "pending" : undefined;
  if (!status) return NextResponse.json({ error: "status inválido" }, { status: 400 });

  const { data, error } = await supabase.from("commissions").update({ status }).eq("id", params.id).select().single();
  if (error) return dbError(error);
  return NextResponse.json({ commission: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { error } = await supabase.from("commissions").delete().eq("id", params.id);
  if (error) return dbError(error);
  return NextResponse.json({ ok: true });
}
