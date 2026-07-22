import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePurchaseStats, healthScore, quintileRank, classifyGroup } from "@/lib/rfv";

/** Cron diário (06:00, ver vercel.json) que recalcula a Matriz RFV de
 * cada cliente: grava o snapshot do dia em `rfv_snapshots` e, quando o
 * grupo de ciclo de vida muda em relação ao snapshot anterior, grava
 * `group_migrations`. Também atualiza `clients.ltv`/`ticket_medio`/
 * `data_primeira_compra` para os outros endpoints (ex.: `/rfv/client/:id`)
 * não precisarem recalcular a partir de `purchases` toda hora. */
export async function GET(request: Request) {
  const forbidden = verifyCronSecret(request);
  if (forbidden) return forbidden;

  const admin = createAdminClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const [{ data: clients, error: clientsError }, { data: purchases, error: purchasesError }] = await Promise.all([
    admin.from("clients").select("id,financeiro_status,atividade_status"),
    admin.from("purchases").select("client_id,valor,data"),
  ]);
  if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 400 });
  if (purchasesError) return NextResponse.json({ error: purchasesError.message }, { status: 400 });

  const comprasPorCliente = new Map<string, { valor: number; data: string }[]>();
  for (const p of purchases ?? []) {
    const lista = comprasPorCliente.get(p.client_id) ?? [];
    lista.push({ valor: p.valor, data: p.data });
    comprasPorCliente.set(p.client_id, lista);
  }

  const statsPorCliente = (clients ?? []).map((client) => {
    const compras = comprasPorCliente.get(client.id) ?? [];
    const stats = computePurchaseStats(compras);
    return { client, compras, stats };
  });

  // Quintis calculados sobre a base inteira (frequência e valor), como o
  // front descreve ("as notas usam sempre quintis").
  const frequencias = statsPorCliente.map((s) => s.stats.frequencia).sort((a, b) => a - b);
  const valores = statsPorCliente.map((s) => s.stats.valor).sort((a, b) => a - b);

  const snapshots = statsPorCliente.map(({ client, stats }) => {
    const fQuintile = quintileRank(stats.frequencia, frequencias);
    const vQuintile = quintileRank(stats.valor, valores);
    const recenciaDias = Number.isFinite(stats.recenciaDias) ? stats.recenciaDias : 9999;
    const score = healthScore({
      recenciaDias,
      frequencia: stats.frequencia,
      financeiroEmDia: client.financeiro_status === "em_dia",
      atividadeEmDia: client.atividade_status === "no_prazo",
    });
    const grupo = classifyGroup({ recenciaDias, fQuintile, vQuintile });

    return {
      client_id: client.id,
      data: hoje,
      recencia: recenciaDias,
      frequencia: stats.frequencia,
      valor: stats.valor,
      ticket_medio: stats.ticketMedio,
      tempo_entre_compras: stats.tempoEntreComprasDias,
      grupo,
      health_score: score,
    };
  });

  // Snapshot anterior de cada cliente (o mais recente antes de hoje) para
  // detectar migração de grupo.
  const { data: anteriores, error: anterioresError } = await admin
    .from("rfv_snapshots")
    .select("client_id,grupo,data")
    .neq("data", hoje)
    .order("data", { ascending: false });
  if (anterioresError) return NextResponse.json({ error: anterioresError.message }, { status: 400 });

  const grupoAnteriorPorCliente = new Map<string, string>();
  for (const s of anteriores ?? []) {
    if (!grupoAnteriorPorCliente.has(s.client_id)) grupoAnteriorPorCliente.set(s.client_id, s.grupo);
  }

  const { error: upsertError } = await admin
    .from("rfv_snapshots")
    .upsert(snapshots, { onConflict: "client_id,data" });
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 400 });

  const migracoes = snapshots
    .filter((s) => {
      const anterior = grupoAnteriorPorCliente.get(s.client_id);
      return anterior && anterior !== s.grupo;
    })
    .map((s) => {
      const anterior = grupoAnteriorPorCliente.get(s.client_id)!;
      const stat = statsPorCliente.find((x) => x.client.id === s.client_id)!;
      return {
        client_id: s.client_id,
        grupo_origem: anterior,
        grupo_destino: s.grupo,
        data: hoje,
        motivo: `Recalculo diário: recência ${s.recencia}d, frequência ${s.frequencia}, health score ${s.health_score}`,
        impacto_financeiro: stat.stats.valor,
      };
    });

  if (migracoes.length > 0) {
    const { error: migrationsError } = await admin.from("group_migrations").insert(migracoes);
    if (migrationsError) return NextResponse.json({ error: migrationsError.message }, { status: 400 });
  }

  // Mantém clients.ltv/ticket_medio/data_primeira_compra em sincronia
  // para o resto da API não precisar reprocessar `purchases`.
  await Promise.all(
    statsPorCliente.map(({ client, compras, stats }) => {
      const primeira = compras.length > 0 ? compras.reduce((min, p) => (p.data < min ? p.data : min), compras[0].data) : null;
      return admin
        .from("clients")
        .update({ ltv: stats.valor, ticket_medio: stats.ticketMedio, data_primeira_compra: primeira })
        .eq("id", client.id);
    })
  );

  return NextResponse.json({ recalculados: snapshots.length, migracoes: migracoes.length });
}
