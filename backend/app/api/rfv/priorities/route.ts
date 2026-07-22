import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { latestByClient } from "@/lib/rfv";

/** "O que fazer": lista de prioridades do dia — cada item é uma regra
 * simples sobre o snapshot mais recente de cada cliente (mesmo espírito
 * do motor de gargalos: limiar sobre dado real, sem IA generativa). */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [{ data: clients, error: clientsError }, { data: snapshots, error: snapshotsError }] = await Promise.all([
    supabase.from("clients").select("id,name,ltv"),
    supabase.from("rfv_snapshots").select("*").order("data", { ascending: false }),
  ]);
  if (clientsError) return dbError(clientsError);
  if (snapshotsError) return dbError(snapshotsError);

  const latest = latestByClient(snapshots ?? []);
  const withGroup = (grupos: string[]) => (clients ?? []).filter((c) => grupos.includes(latest.get(c.id)?.grupo ?? ""));

  const vipEmRisco = withGroup(["Campeão se despedindo", "Carente"]).filter((c) => (latest.get(c.id)?.health_score ?? 0) < 50);
  const exClientes = withGroup(["Perdido", "Ex-campeão"]);
  const campeoes = withGroup(["Campeão"]);
  const potencialCampeao = withGroup(["Potencial campeão"]);

  const impactoVip = vipEmRisco.reduce((sum, c) => sum + (c.ltv ?? 0), 0);
  const potencialUpgrade = potencialCampeao.reduce((sum, c) => sum + (c.ltv ?? 0) * 0.2, 0);

  return NextResponse.json({
    priorities: [
      {
        categoria: "Retenção",
        titulo: `Ligue para ${vipEmRisco.length} clientes VIP em risco`,
        detalhe: `Impacto R$ ${Math.round(impactoVip).toLocaleString("pt-BR")}`,
        clientIds: vipEmRisco.map((c) => c.id),
      },
      {
        categoria: "Reativação",
        titulo: `Envie winback para ${exClientes.length} ex-clientes`,
        detalhe: "Maior ROI da operação",
        clientIds: exClientes.map((c) => c.id),
      },
      {
        categoria: "Aquisição",
        titulo: `Peça indicação a ${campeoes.length} clientes campeões`,
        detalhe: "Custo zero",
        clientIds: campeoes.map((c) => c.id),
      },
      {
        categoria: "Expansão",
        titulo: `Ofereça upgrade a ${potencialCampeao.length} clientes de alto potencial`,
        detalhe: `R$ ${Math.round(potencialUpgrade).toLocaleString("pt-BR")} na mesa`,
        clientIds: potencialCampeao.map((c) => c.id),
      },
    ],
  });
}
