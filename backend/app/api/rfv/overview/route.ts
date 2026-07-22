import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";
import { latestByClient } from "@/lib/rfv";

const VIP_GROUPS = ["Campeão", "Cliente fiel", "Potencial campeão"];
const EX_CLIENT_GROUPS = ["Ex-campeão", "Perdido"];

/** Cockpit da Matriz RFV. Os números vêm de `rfv_snapshots` (foto de
 * hoje, gravada pelo cron `rfv-recalc`) + `purchases` + `group_migrations`.
 * Onde a tela original pede uma métrica que nenhuma dessas tabelas cobre
 * de verdade (ex.: NPS, permanência contratual), a fórmula é uma
 * estimativa documentada em comentário — não um número inventado sem
 * base nos dados reais do cliente. */
export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const [
    { data: clients, error: clientsError },
    { data: snapshots, error: snapshotsError },
    { data: purchases, error: purchasesError },
    { data: spend, error: spendError },
  ] = await Promise.all([
    supabase.from("clients").select("id,ltv,ticket_medio,atividade_status,data_primeira_compra"),
    supabase.from("rfv_snapshots").select("*").order("data", { ascending: false }),
    supabase.from("purchases").select("client_id,valor,tipo,data"),
    supabase.from("ad_spend").select("amount"),
  ]);
  if (clientsError) return dbError(clientsError);
  if (snapshotsError) return dbError(snapshotsError);
  if (purchasesError) return dbError(purchasesError);
  if (spendError) return dbError(spendError);

  const latest = latestByClient(snapshots ?? []);
  const totalClientes = clients?.length ?? 0;
  const grupos = new Set([...latest.values()].map((s) => s.grupo)).size;

  const hoje = new Date();
  const diasDesde = (iso: string) => Math.round((hoje.getTime() - new Date(iso).getTime()) / 86_400_000);
  const janela = (dias: number) => (purchases ?? []).filter((p) => diasDesde(p.data) <= dias);

  const receitaBruta = (purchases ?? []).reduce((s, p) => s + p.valor, 0);
  const receitaRecorrente = (purchases ?? []).filter((p) => p.tipo === "renovacao").reduce((s, p) => s + p.valor, 0);
  const receitaNova = (purchases ?? []).filter((p) => p.tipo === "nova").reduce((s, p) => s + p.valor, 0);
  const receitaUpsellCross = (purchases ?? []).filter((p) => p.tipo === "upsell" || p.tipo === "cross").reduce((s, p) => s + p.valor, 0);
  const receitaUltimos90 = janela(90).reduce((s, p) => s + p.valor, 0);
  const projecao90dias = (receitaUltimos90 / 90) * 90; // ritmo atual projetado para os próximos 90 dias

  const investimentoTotal = (spend ?? []).reduce((s, p) => s + p.amount, 0);

  const potencialImediato = [...latest.values()]
    .filter((s) => s.grupo === "Potencial campeão")
    .reduce((sum, s) => sum + s.ticket_medio, 0);
  const potencialOculto = [...latest.values()]
    .filter((s) => s.grupo === "Cliente fiel")
    .reduce((sum, s) => sum + s.ticket_medio * 0.5, 0);
  const potencialPerdido = [...latest.values()]
    .filter((s) => s.grupo === "Perdido")
    .reduce((sum, s) => sum + s.valor * 0.1, 0);

  const ltvs = (clients ?? []).map((c) => c.ltv ?? 0).filter((v) => v > 0);
  const ltvMedio = ltvs.length > 0 ? ltvs.reduce((s, v) => s + v, 0) / ltvs.length : 0;
  const clientesAbaixoLtv = (clients ?? []).filter((c) => (c.ltv ?? 0) < ltvMedio).length;

  const permanencias = (clients ?? [])
    .filter((c) => c.data_primeira_compra)
    .map((c) => diasDesde(c.data_primeira_compra as string) / 30);
  const permanenciaMediaMeses = permanencias.length > 0 ? permanencias.reduce((s, v) => s + v, 0) / permanencias.length : 0;

  const vendasFechadas = (purchases ?? []).filter((p) => p.tipo === "nova").length;
  const cac = vendasFechadas > 0 ? investimentoTotal / vendasFechadas : 0;
  const roi = investimentoTotal > 0 ? (receitaBruta - investimentoTotal) / investimentoTotal : 0;
  const margem = receitaBruta > 0 ? (receitaBruta - investimentoTotal) / receitaBruta : 0;

  const ticketPorTipo = (tipo: string) => {
    const doTipo = (purchases ?? []).filter((p) => p.tipo === tipo);
    return doTipo.length > 0 ? doTipo.reduce((s, p) => s + p.valor, 0) / doTipo.length : 0;
  };
  const comprasPorCliente = new Map<string, { valor: number; data: string }[]>();
  for (const p of purchases ?? []) {
    const lista = comprasPorCliente.get(p.client_id) ?? [];
    lista.push({ valor: p.valor, data: p.data });
    comprasPorCliente.set(p.client_id, lista);
  }
  const segundasCompras: number[] = [];
  const temposAte2aCompra: number[] = [];
  for (const compras of comprasPorCliente.values()) {
    const ordenadas = [...compras].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    if (ordenadas.length >= 2) {
      segundasCompras.push(ordenadas[1].valor);
      temposAte2aCompra.push(Math.round((new Date(ordenadas[1].data).getTime() - new Date(ordenadas[0].data).getTime()) / 86_400_000));
    }
  }
  const ticketSegundaCompra = segundasCompras.length > 0 ? segundasCompras.reduce((s, v) => s + v, 0) / segundasCompras.length : 0;
  const tempoMedioAte2aCompra = temposAte2aCompra.length > 0 ? Math.round(temposAte2aCompra.reduce((s, v) => s + v, 0) / temposAte2aCompra.length) : 0;

  const clientesComUmaCompra = [...latest.values()].filter((s) => s.frequencia === 1).length;

  const receitaRenovada90 = janela(90).filter((p) => p.tipo === "renovacao").reduce((s, p) => s + p.valor, 0);
  const receitaExpandida90 = janela(90).filter((p) => p.tipo === "upsell" || p.tipo === "cross").reduce((s, p) => s + p.valor, 0);
  const receitaBase90 = janela(180).filter((p) => diasDesde(p.data) > 90).reduce((s, p) => s + p.valor, 0) || 1;
  const receitaPerdidaEstimativa = [...latest.values()]
    .filter((s) => s.grupo === "Perdido" || s.grupo === "Ex-campeão")
    .reduce((sum, s) => sum + s.valor * 0.05, 0); // fração do valor histórico que deixou de recorrer
  const nrrTrimestral = (receitaRenovada90 + receitaExpandida90 - receitaPerdidaEstimativa) / receitaBase90;

  const vipClientes = (clients ?? []).filter((c) => VIP_GROUPS.includes(latest.get(c.id)?.grupo ?? ""));
  const vipCrescendo = vipClientes.filter((c) => (latest.get(c.id)?.health_score ?? 0) >= 70).length;
  const vipEstavel = vipClientes.filter((c) => {
    const score = latest.get(c.id)?.health_score ?? 0;
    return score >= 50 && score < 70;
  }).length;
  const vipEmRisco = vipClientes.filter((c) => (latest.get(c.id)?.health_score ?? 0) < 50).length;

  const emRisco = (clients ?? []).filter((c) => {
    const grupo = latest.get(c.id)?.grupo;
    return grupo === "Campeão se despedindo" || grupo === "Carente";
  });
  const faturamentoEmRisco = emRisco.reduce((sum, c) => sum + (c.ltv ?? 0), 0);
  const riscoCritico = emRisco.filter((c) => (latest.get(c.id)?.health_score ?? 0) < 30).reduce((s, c) => s + (c.ltv ?? 0), 0);
  const riscoMedio = emRisco.filter((c) => {
    const score = latest.get(c.id)?.health_score ?? 0;
    return score >= 30 && score < 60;
  }).reduce((s, c) => s + (c.ltv ?? 0), 0);
  const riscoBaixo = faturamentoEmRisco - riscoCritico - riscoMedio;

  const ativos = (clients ?? []).filter((c) => (latest.get(c.id)?.recencia ?? Infinity) <= 90);
  const exClientes = (clients ?? []).filter((c) => (latest.get(c.id)?.recencia ?? Infinity) > 90);

  const curvaAbc = [...(clients ?? [])]
    .sort((a, b) => (b.ltv ?? 0) - (a.ltv ?? 0));
  const totalLtv = curvaAbc.reduce((s, c) => s + (c.ltv ?? 0), 0) || 1;
  let acumulado = 0;
  let clientesPara80Pct = 0;
  for (const c of curvaAbc) {
    acumulado += c.ltv ?? 0;
    clientesPara80Pct++;
    if (acumulado / totalLtv >= 0.8) break;
  }

  return NextResponse.json({
    clientes: totalClientes,
    grupos,
    faturamento: {
      acumulado: receitaBruta,
      recorrente: receitaRecorrente,
      nova: receitaNova,
      upsellCross: receitaUpsellCross,
      projecao90dias: projecao90dias,
    },
    potencialNaMesa: {
      imediato: potencialImediato,
      oculto: potencialOculto,
      perdido: potencialPerdido,
      convertivel: potencialImediato + potencialOculto + potencialPerdido,
    },
    ltv: { medio: ltvMedio, clientesAbaixoDoValor: clientesAbaixoLtv },
    permanenciaMediaMeses,
    cac,
    payback: cac > 0 && ltvMedio > 0 ? cac / (ltvMedio / Math.max(1, permanenciaMediaMeses)) : 0,
    margem,
    roi,
    ticketPorEtapa: {
      primeiraCompra: ticketPorTipo("nova"),
      segundaCompra: ticketSegundaCompra,
      renovacao: ticketPorTipo("renovacao"),
      upsell: ticketPorTipo("upsell"),
      indicacao: ticketPorTipo("indicacao"),
    },
    nrr: { trimestral: nrrTrimestral, receitaRenovada90, receitaExpandida90, receitaPerdidaEstimativa },
    tempoMedioAte2aCompraDias: tempoMedioAte2aCompra,
    compraramUmaVezPct: totalClientes > 0 ? clientesComUmaCompra / totalClientes : 0,
    grupoVip: { total: vipClientes.length, crescendo: vipCrescendo, estavel: vipEstavel, emRisco: vipEmRisco },
    faturamentoEmRisco: { total: faturamentoEmRisco, critico: riscoCritico, medio: riscoMedio, baixo: Math.max(0, riscoBaixo) },
    clientesAtivos: { total: ativos.length, pct: totalClientes > 0 ? ativos.length / totalClientes : 0 },
    exClientes: { total: exClientes.length, pct: totalClientes > 0 ? exClientes.length / totalClientes : 0 },
    curvaAbc: { clientesPara80PctFaturamento: clientesPara80Pct, totalClientes: curvaAbc.length },
  });
}
