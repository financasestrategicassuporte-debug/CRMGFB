import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { dbError } from "@/lib/api";

const BUCKETS = ["1×", "2×", "3×", "4×", "5× ou mais"];

export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const { data: purchases, error } = await supabase.from("purchases").select("client_id,valor,data");
  if (error) return dbError(error);

  const porCliente = new Map<string, { valor: number; data: string }[]>();
  for (const p of purchases ?? []) {
    const lista = porCliente.get(p.client_id) ?? [];
    lista.push({ valor: p.valor, data: p.data });
    porCliente.set(p.client_id, lista);
  }

  const totalClientes = porCliente.size;
  const totalFaturamento = (purchases ?? []).reduce((s, p) => s + p.valor, 0);

  const linhas = BUCKETS.map((label, i) => {
    const min = i + 1;
    const clientesDoBucket = [...porCliente.entries()].filter(([, compras]) =>
      i === BUCKETS.length - 1 ? compras.length >= min : compras.length === min
    );
    const faturamento = clientesDoBucket.reduce((sum, [, compras]) => sum + compras.reduce((s, p) => s + p.valor, 0), 0);
    const primeiras = clientesDoBucket
      .map(([, compras]) => [...compras].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()))
      .filter((compras) => compras.length >= 1)
      .map((compras) => compras[0].valor);
    const segundas = clientesDoBucket
      .map(([, compras]) => [...compras].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()))
      .filter((compras) => compras.length >= 2)
      .map((compras) => compras[1].valor);

    return {
      frequencia: label,
      clientes: clientesDoBucket.length,
      pctClientes: totalClientes > 0 ? clientesDoBucket.length / totalClientes : 0,
      faturamento,
      pctFaturamento: totalFaturamento > 0 ? faturamento / totalFaturamento : 0,
      ticketMedio1aCompra: avg(primeiras),
      ticketMedio2aCompra: segundas.length > 0 ? avg(segundas) : null,
    };
  });

  const clientesRecorrentes = [...porCliente.values()].filter((compras) => compras.length >= 2).length;

  return NextResponse.json({
    linhas,
    totalClientes,
    clientesRecorrentesPct: totalClientes > 0 ? clientesRecorrentes / totalClientes : 0,
  });
}

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
