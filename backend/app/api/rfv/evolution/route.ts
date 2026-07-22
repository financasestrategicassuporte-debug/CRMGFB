import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Série mensal do nº de clientes por grupo — usa o último snapshot de
 * cada cliente dentro de cada mês (o cron roda uma vez por dia, então o
 * histórico só cresce a partir de quando o cron começar a rodar; meses
 * sem nenhum snapshot simplesmente não aparecem na série). */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { data: snapshots, error } = await supabase
    .from("rfv_snapshots")
    .select("client_id,data,grupo")
    .order("data", { ascending: true });
  if (error) return dbError(error);

  const porMes = new Map<string, Map<string, { grupo: string; data: string }>>();
  for (const s of snapshots ?? []) {
    const mes = s.data.slice(0, 7); // YYYY-MM
    const clientesDoMes = porMes.get(mes) ?? new Map();
    const atual = clientesDoMes.get(s.client_id);
    if (!atual || s.data > atual.data) clientesDoMes.set(s.client_id, { grupo: s.grupo, data: s.data });
    porMes.set(mes, clientesDoMes);
  }

  const serie = [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, clientes]) => {
      const contagem: Record<string, number> = {};
      for (const { grupo } of clientes.values()) {
        contagem[grupo] = (contagem[grupo] ?? 0) + 1;
      }
      return { mes, contagem };
    });

  return NextResponse.json({ serie });
}
