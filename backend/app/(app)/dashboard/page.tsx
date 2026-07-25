import { getCurrentProfile } from "@/lib/auth";
import { computeFunnel, computeProductEconomics } from "@/lib/funnels";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export default async function DashboardPage() {
  const { supabase } = await getCurrentProfile();

  const [{ data: deals }, { data: spend }] = await Promise.all([
    supabase.from("deals").select("product_id,stage,qualification,revenue,value"),
    supabase.from("ad_spend").select("amount").is("product_id", null),
  ]);

  const funnel = computeFunnel(deals ?? []);
  const investimento = (spend ?? []).reduce((sum, s) => sum + s.amount, 0);
  const economics = computeProductEconomics(funnel, investimento);
  const ticketMedio = funnel.vendas > 0 ? funnel.receita / funnel.vendas : 0;

  const funil = [
    { label: "Leads", value: funnel.leads, pct: 1 },
    { label: "Qualificados", value: funnel.qualificados, pct: funnel.leads > 0 ? funnel.qualificados / funnel.leads : 0 },
    { label: "Agendamentos", value: funnel.agendamentos, pct: funnel.leads > 0 ? funnel.agendamentos / funnel.leads : 0 },
    { label: "Comparecimentos", value: funnel.comparecimentos, pct: funnel.leads > 0 ? funnel.comparecimentos / funnel.leads : 0 },
    { label: "Vendas", value: funnel.vendas, pct: funnel.leads > 0 ? funnel.vendas / funnel.leads : 0 },
  ];

  const kpis = [
    { label: "Receita", value: fmtBRL(funnel.receita) },
    { label: "Ticket médio", value: fmtBRL(ticketMedio) },
    { label: "Conversão geral", value: fmtPct(economics.conversao) },
    { label: "ROAS", value: `${economics.roas.toFixed(1)}x` },
    { label: "CAC", value: fmtBRL(economics.cac) },
    { label: "Custo por reunião", value: fmtBRL(economics.custoPorReuniao) },
    { label: "Custo por venda", value: fmtBRL(economics.custoPorVenda) },
    { label: "Investimento total", value: fmtBRL(investimento) },
  ];

  return (
    <div style={{ padding: 32 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Dashboard Geral</h1>
        <p style={{ color: "var(--text-faint)", margin: "4px 0 0" }}>
          Marketing, CRM e financeiro cruzados em tempo real
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card">
            <div style={{ color: "var(--text-faint)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{kpi.value}</div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0 }}>Funil geral consolidado</h2>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {funil.map((step) => (
            <div key={step.label} style={{ minWidth: 110 }}>
              <div style={{ color: "var(--text-faint)", fontSize: 12 }}>{step.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{step.value}</div>
              <div style={{ color: "var(--accent-darker)", fontSize: 12, fontWeight: 700 }}>{fmtPct(step.pct)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
