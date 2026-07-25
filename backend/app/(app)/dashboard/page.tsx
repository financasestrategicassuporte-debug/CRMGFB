import { getCurrentProfile } from "@/lib/auth";
import { computeFunnel, computeProductEconomics } from "@/lib/funnels";
import { Banner } from "../banner";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtK(v: number) {
  return v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmtBRL(v);
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

const STAGE_BAR_COLORS = ["#94a3b8", "#3b82f6", "#f59e0b", "#a855f7", "#22c55e"];

export default async function DashboardPage() {
  const { supabase, profile } = await getCurrentProfile();

  const [{ data: deals }, { data: spend }] = await Promise.all([
    supabase.from("deals").select("product_id,stage,qualification,revenue,value"),
    supabase.from("ad_spend").select("amount").is("product_id", null),
  ]);

  const funnel = computeFunnel(deals ?? []);
  const investimento = (spend ?? []).reduce((sum, s) => sum + s.amount, 0);
  const economics = computeProductEconomics(funnel, investimento);
  const ticketMedio = funnel.vendas > 0 ? funnel.receita / funnel.vendas : 0;

  const mainCards = [
    { icon: "group_add", color: "#3b82f6", label: "Leads recebidos", value: funnel.leads, pct: 1 },
    { icon: "verified", color: "#22c55e", label: "Leads qualificados", value: funnel.qualificados, pct: funnel.leads > 0 ? funnel.qualificados / funnel.leads : 0 },
    { icon: "event_available", color: "#f59e0b", label: "Agendamentos", value: funnel.agendamentos, pct: funnel.leads > 0 ? funnel.agendamentos / funnel.leads : 0 },
    { icon: "how_to_reg", color: "#a855f7", label: "Comparecimentos", value: funnel.comparecimentos, pct: funnel.leads > 0 ? funnel.comparecimentos / funnel.leads : 0 },
  ];

  const secondaryCards = [
    { icon: "shopping_bag", color: "#f97316", label: "Vendas", value: String(funnel.vendas), pct: funnel.leads > 0 ? fmtPct(funnel.vendas / funnel.leads) : "0%" },
    { icon: "payments", color: "#3b82f6", label: "Receita", value: fmtK(funnel.receita), pct: fmtBRL(funnel.receita) },
    { icon: "sell", color: "#f59e0b", label: "Ticket médio", value: fmtK(ticketMedio), pct: "por venda" },
    { icon: "trending_up", color: "#22c55e", label: "ROI", value: `${(economics.roi * 100).toFixed(0)}%`, pct: `${economics.roas.toFixed(1)}x ROAS` },
  ];

  const miniStats = [
    { icon: "person_add", label: "CAC", value: fmtK(economics.cac) },
    { icon: "event", label: "Custo por reunião", value: fmtK(economics.custoPorReuniao) },
    { icon: "shopping_cart", label: "Custo por venda", value: fmtK(economics.custoPorVenda) },
    { icon: "ads_click", label: "Investimento total", value: fmtK(investimento) },
    { icon: "conversion_path", label: "Conversão geral", value: fmtPct(economics.conversao) },
    { icon: "trending_up", label: "ROAS", value: `${economics.roas.toFixed(1)}x` },
  ];

  const funil = [
    { label: "Leads", value: funnel.leads, pct: 1 },
    { label: "Qualificados", value: funnel.qualificados, pct: funnel.leads > 0 ? funnel.qualificados / funnel.leads : 0 },
    { label: "Agendamentos", value: funnel.agendamentos, pct: funnel.leads > 0 ? funnel.agendamentos / funnel.leads : 0 },
    { label: "Comparecimentos", value: funnel.comparecimentos, pct: funnel.leads > 0 ? funnel.comparecimentos / funnel.leads : 0 },
    { label: "Vendas", value: funnel.vendas, pct: funnel.leads > 0 ? funnel.vendas / funnel.leads : 0 },
  ];

  return (
    <div>
      <Banner
        title="Dashboard Geral · Sistema Operacional"
        subtitle="Marketing, CRM, SDR, Closer, produtos e financeiro cruzados em tempo real"
        icon="insights"
        role={profile?.role ?? "admin"}
      />

      <div style={{ padding: 32 }}>
        <section
          className="card"
          style={{
            background: "var(--bg-dark)",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="msym" style={{ fontSize: 26, color: "var(--accent)" }}>hub</span>
            <div>
              <div style={{ fontWeight: 700 }}>Centro de inteligência da operação</div>
              <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
                Marketing, CRM, SDR, Closer, produtos, financeiro e comissões — cruzados automaticamente.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>RECEITA</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtK(funnel.receita)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>LUCRO</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{fmtK(economics.lucro)}</div>
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>
          {[...mainCards, ...secondaryCards].map((c) => (
            <div key={c.label} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${c.color}1a`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span className="msym" style={{ color: c.color, fontSize: 20 }}>{c.icon}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.pct}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 10 }}>{c.value}</div>
              <div style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          {miniStats.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="msym" style={{ color: "var(--accent-darker)", fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.value}</div>
                <div style={{ color: "var(--text-faint)", fontSize: 11 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <section className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>filter_alt</span>
            Funil geral consolidado
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {funil.map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 130, fontSize: 13, color: "var(--text-faint)" }}>{step.label}</div>
                <div style={{ flex: 1, background: "var(--surface-muted)", borderRadius: 6, height: 26, position: "relative" }}>
                  <div
                    style={{
                      width: `${Math.max(6, step.pct * 100)}%`,
                      height: "100%",
                      borderRadius: 6,
                      background: STAGE_BAR_COLORS[i],
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {step.value}
                  </div>
                </div>
                <div style={{ width: 44, fontSize: 12, fontWeight: 700, color: "var(--text-faint)" }}>{fmtPct(step.pct)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
