import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { RFV_GROUPS } from "@/lib/rfv";

// Ordem de "força" dos grupos (índice maior = ciclo de vida mais saudável),
// usada só para decidir se uma migração foi uma subida ou queda.
const ORDEM_GRUPOS = [
  "Perdido",
  "Ex-campeão",
  "Baixo potencial",
  "Fiel abandonado",
  "Talento desperdiçado",
  "Carente",
  "Recém-chegado",
  "Jovem talento",
  "Cliente fiel",
  "Potencial campeão",
  "Campeão se despedindo",
  "Campeão",
];

export async function GET(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const dias = Number(searchParams.get("period_dias") ?? 30);
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const { data: migrations, error } = await supabase
    .from("group_migrations")
    .select("*")
    .gte("data", desde.toISOString().slice(0, 10));
  if (error) return dbError(error);

  const pares = new Map<string, { origem: string; destino: string; clientes: number }>();
  for (const m of migrations ?? []) {
    const key = `${m.grupo_origem}→${m.grupo_destino}`;
    const atual = pares.get(key) ?? { origem: m.grupo_origem, destino: m.grupo_destino, clientes: 0 };
    atual.clientes++;
    pares.set(key, atual);
  }

  const todos = [...pares.values()];
  const subiram = todos
    .filter((p) => ORDEM_GRUPOS.indexOf(p.destino) > ORDEM_GRUPOS.indexOf(p.origem))
    .sort((a, b) => b.clientes - a.clientes);
  const cairam = todos
    .filter((p) => ORDEM_GRUPOS.indexOf(p.destino) < ORDEM_GRUPOS.indexOf(p.origem))
    .sort((a, b) => b.clientes - a.clientes);

  const novosJovensTalentos = (migrations ?? []).filter(
    (m) => m.grupo_destino === "Jovem talento" || m.grupo_destino === "Potencial campeão"
  ).length;
  const novosExClientes = (migrations ?? []).filter((m) => m.grupo_destino === "Ex-campeão" || m.grupo_destino === "Perdido").length;

  return NextResponse.json({ subiram, cairam, novosJovensTalentos, novosExClientes, grupos: RFV_GROUPS });
}
