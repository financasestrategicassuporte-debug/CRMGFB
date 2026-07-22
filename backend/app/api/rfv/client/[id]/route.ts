import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Retrato individual do cliente na Matriz RFV: health score/grupo atual,
 * histórico de snapshots, migrações de grupo e as compras que sustentam
 * esses números. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [
    { data: client, error: clientError },
    { data: snapshots, error: snapshotsError },
    { data: migrations, error: migrationsError },
    { data: purchases, error: purchasesError },
  ] = await Promise.all([
    supabase.from("clients").select("*, plan:plans(id,name), consultant:profiles!clients_consultant_id_fkey(id,name), closer:profiles!clients_closer_id_fkey(id,name)").eq("id", params.id).single(),
    supabase.from("rfv_snapshots").select("*").eq("client_id", params.id).order("data", { ascending: false }),
    supabase.from("group_migrations").select("*").eq("client_id", params.id).order("data", { ascending: false }),
    supabase.from("purchases").select("*").eq("client_id", params.id).order("data", { ascending: false }),
  ]);
  if (clientError) return dbError(clientError);
  if (snapshotsError) return dbError(snapshotsError);
  if (migrationsError) return dbError(migrationsError);
  if (purchasesError) return dbError(purchasesError);

  return NextResponse.json({
    client,
    snapshotAtual: snapshots?.[0] ?? null,
    historicoSnapshots: snapshots,
    migracoes: migrations,
    compras: purchases,
  });
}
