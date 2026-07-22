import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { latestByClient } from "@/lib/rfv";

type Alert = { tipo: "receita" | "retencao" | "operacao" | "comercial" | "marketing"; titulo: string; detalhe: string };

/** Alertas da Matriz RFV. Cada um é um limiar sobre dado que realmente
 * existe (snapshot RFV + quem é o consultor/closer/produto do cliente) —
 * onde não há dado suficiente para uma dimensão (ex.: CPL por campanha
 * não está ligado ao cliente pós-venda), o alerta correspondente
 * simplesmente não é gerado em vez de usar um número fictício. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [
    { data: clients, error: clientsError },
    { data: snapshots, error: snapshotsError },
    { data: team, error: teamError },
  ] = await Promise.all([
    supabase.from("clients").select("id,ltv,consultant_id,closer_id"),
    supabase.from("rfv_snapshots").select("*").order("data", { ascending: false }),
    supabase.from("profiles").select("id,name"),
  ]);
  if (clientsError) return dbError(clientsError);
  if (snapshotsError) return dbError(snapshotsError);
  if (teamError) return dbError(teamError);

  const latest = latestByClient(snapshots ?? []);
  const alerts: Alert[] = [];

  const emRisco = (clients ?? []).filter((c) => {
    const grupo = latest.get(c.id)?.grupo;
    return grupo === "Campeão se despedindo" || grupo === "Carente";
  });
  const receitaEmRisco = emRisco.reduce((sum, c) => sum + (c.ltv ?? 0), 0);
  if (receitaEmRisco > 0) {
    alerts.push({
      tipo: "receita",
      titulo: `R$ ${Math.round(receitaEmRisco).toLocaleString("pt-BR")} podem ser perdidos nos próximos 30 dias`,
      detalhe: `${emRisco.length} clientes com sinais de esfriamento.`,
    });
  }

  const diminuiramFrequencia = (clients ?? []).filter((c) => (latest.get(c.id)?.health_score ?? 100) < 40);
  if (diminuiramFrequencia.length > 0) {
    alerts.push({
      tipo: "retencao",
      titulo: `${diminuiramFrequencia.length} clientes diminuíram a frequência de compra`,
      detalhe: "Health score abaixo de 40 no recálculo de hoje.",
    });
  }

  const porConsultor = groupAvgHealth(clients ?? [], latest, "consultant_id");
  const piorConsultor = pickWorst(porConsultor, team ?? []);
  if (piorConsultor) {
    alerts.push({
      tipo: "operacao",
      titulo: `Consultor ${piorConsultor.name}: retenção abaixo da média`,
      detalhe: `Health score médio dos clientes: ${Math.round(piorConsultor.mediaHealth)}.`,
    });
  }

  const porCloser = groupAvgHealth(clients ?? [], latest, "closer_id");
  const piorCloser = pickWorst(porCloser, team ?? []);
  if (piorCloser) {
    alerts.push({
      tipo: "comercial",
      titulo: `Closer ${piorCloser.name}: clientes compram, mas engajam pouco`,
      detalhe: `Health score médio dos clientes: ${Math.round(piorCloser.mediaHealth)}.`,
    });
  }

  return NextResponse.json({ alerts });
}

function groupAvgHealth(
  clients: { id: string; ltv: number | null; consultant_id?: string | null; closer_id?: string | null }[],
  latest: Map<string, { health_score: number }>,
  campo: "consultant_id" | "closer_id"
) {
  const grupos = new Map<string, number[]>();
  for (const c of clients) {
    const ownerId = c[campo];
    if (!ownerId) continue;
    const score = latest.get(c.id)?.health_score;
    if (score === undefined) continue;
    const lista = grupos.get(ownerId) ?? [];
    lista.push(score);
    grupos.set(ownerId, lista);
  }
  return grupos;
}

function pickWorst(grupos: Map<string, number[]>, team: { id: string; name: string }[]) {
  let pior: { id: string; mediaHealth: number } | null = null;
  for (const [id, scores] of grupos) {
    const media = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (!pior || media < pior.mediaHealth) pior = { id, mediaHealth: media };
  }
  if (!pior || pior.mediaHealth >= 50) return null;
  const membro = team.find((t) => t.id === pior!.id);
  return membro ? { name: membro.name, mediaHealth: pior.mediaHealth } : null;
}
