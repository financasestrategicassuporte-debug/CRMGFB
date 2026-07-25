"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

const TABS = [
  { id: "overview", icon: "dashboard", label: "Visão geral" },
  { id: "priorities", icon: "emoji_events", label: "O que fazer" },
  { id: "migration", icon: "swap_vert", label: "Migração" },
  { id: "recurrence", icon: "replay", label: "Recorrência" },
  { id: "alerts", icon: "notifications_active", label: "Alertas" },
] as const;

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtK(v: number) {
  return Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmtBRL(v);
}
function fmtPct(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

export default function RfvPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [overview, setOverview] = useState<any>(null);
  const [priorities, setPriorities] = useState<any>(null);
  const [migration, setMigration] = useState<any>(null);
  const [recurrence, setRecurrence] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/rfv/overview").then((r) => r.json()),
      fetch("/api/rfv/priorities").then((r) => r.json()),
      fetch("/api/rfv/migration").then((r) => r.json()),
      fetch("/api/rfv/recurrence").then((r) => r.json()),
      fetch("/api/rfv/alerts").then((r) => r.json()),
    ]).then(([o, p, m, r, a]) => {
      setOverview(o);
      setPriorities(p);
      setMigration(m);
      setRecurrence(r);
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <Banner
        title="Matriz RFV · Inteligência de Clientes"
        subtitle="Recência, frequência e valor recalculados diariamente"
        icon="insights"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: active ? "var(--bg-dark)" : "#fff",
                  color: active ? "#fff" : "var(--text)",
                }}
              >
                <span className="msym" style={{ fontSize: 16, color: active ? "var(--accent)" : "var(--text-faint)" }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : tab === "overview" && overview ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ background: "var(--bg-dark)", color: "#fff", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700 }}>Recalculado diariamente às 06:00</div>
                <div style={{ color: "var(--text-faint)", fontSize: 12 }}>Janela de 36 meses · corte de ex-cliente em 90 dias</div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>CLIENTES</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{overview.clientes}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>GRUPOS</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{overview.grupos}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div className="card">
                <div style={{ color: "var(--text-faint)", fontSize: 11 }}>FATURAMENTO ACUMULADO</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtK(overview.faturamento.acumulado)}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>Recorrente: {fmtK(overview.faturamento.recorrente)}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Nova: {fmtK(overview.faturamento.nova)}</div>
              </div>
              <div className="card">
                <div style={{ color: "var(--text-faint)", fontSize: 11 }}>POTENCIAL NA MESA</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-darker)" }}>{fmtK(overview.potencialNaMesa.convertivel)}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>Imediato: {fmtK(overview.potencialNaMesa.imediato)}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Oculto: {fmtK(overview.potencialNaMesa.oculto)}</div>
              </div>
              <div className="card">
                <div style={{ color: "var(--text-faint)", fontSize: 11 }}>LTV MÉDIO</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtK(overview.ltv.medio)}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>Permanência: {overview.permanenciaMediaMeses.toFixed(1)} meses</div>
              </div>
              <div className="card">
                <div style={{ color: "var(--text-faint)", fontSize: 11 }}>ROI</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{(overview.roi * 100).toFixed(0)}%</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>CAC: {fmtK(overview.cac)}</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 14, marginTop: 0 }}>Retenção de receita (NRR trimestral)</h3>
              <div style={{ fontSize: 28, fontWeight: 800, color: overview.nrr.trimestral >= 1 ? "var(--accent-darker)" : "var(--status-late-fg)" }}>
                {fmtPct(overview.nrr.trimestral)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <div className="card">
                <div style={{ fontWeight: 700 }}>Grupo VIP</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{overview.grupoVip.total}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                  Crescendo {overview.grupoVip.crescendo} · Estável {overview.grupoVip.estavel} · Em risco {overview.grupoVip.emRisco}
                </div>
              </div>
              <div className="card">
                <div style={{ fontWeight: 700 }}>Faturamento em risco</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--status-late-fg)" }}>{fmtK(overview.faturamentoEmRisco.total)}</div>
              </div>
              <div className="card">
                <div style={{ fontWeight: 700 }}>Clientes ativos</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPct(overview.clientesAtivos.pct)}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{overview.clientesAtivos.total} clientes</div>
              </div>
              <div className="card">
                <div style={{ fontWeight: 700 }}>Ex-clientes</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtPct(overview.exClientes.pct)}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{overview.exClientes.total} clientes</div>
              </div>
            </div>
          </div>
        ) : tab === "priorities" && priorities ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {priorities.priorities.map((p: any, i: number) => (
              <div key={i} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="badge badge-ok">{p.categoria}</span>
                  <div style={{ fontWeight: 700, marginTop: 6 }}>{p.titulo}</div>
                  <div style={{ color: "var(--text-faint)", fontSize: 13 }}>{p.detalhe}</div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === "migration" && migration ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card">
              <h3 style={{ fontSize: 14, marginTop: 0, color: "var(--accent-darker)" }}>↑ Subiram de grupo</h3>
              {migration.subiram.map((m: any, i: number) => (
                <div key={i} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  {m.origem} → {m.destino} <strong>{m.clientes}</strong> clientes
                </div>
              ))}
              {migration.subiram.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Sem migrações registradas ainda.</p>}
            </div>
            <div className="card">
              <h3 style={{ fontSize: 14, marginTop: 0, color: "var(--status-late-fg)" }}>↓ Caíram de grupo</h3>
              {migration.cairam.map((m: any, i: number) => (
                <div key={i} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  {m.origem} → {m.destino} <strong>{m.clientes}</strong> clientes
                </div>
              ))}
              {migration.cairam.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Sem migrações registradas ainda.</p>}
            </div>
          </div>
        ) : tab === "recurrence" && recurrence ? (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                  <th style={thStyle}>Frequência</th>
                  <th style={thStyle}>Clientes</th>
                  <th style={thStyle}>% Clientes</th>
                  <th style={thStyle}>Faturamento</th>
                  <th style={thStyle}>Ticket 1ª</th>
                  <th style={thStyle}>Ticket 2ª</th>
                </tr>
              </thead>
              <tbody>
                {recurrence.linhas.map((l: any) => (
                  <tr key={l.frequencia} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={tdStyle}>{l.frequencia}</td>
                    <td style={tdStyle}>{l.clientes}</td>
                    <td style={tdStyle}>{fmtPct(l.pctClientes)}</td>
                    <td style={tdStyle}>{fmtK(l.faturamento)}</td>
                    <td style={tdStyle}>{fmtK(l.ticketMedio1aCompra)}</td>
                    <td style={tdStyle}>{l.ticketMedio2aCompra ? fmtK(l.ticketMedio2aCompra) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "alerts" && alerts ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {alerts.alerts.map((a: any, i: number) => (
              <div key={i} className="card" style={{ borderLeft: "4px solid var(--status-late-fg)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--status-late-fg)", textTransform: "uppercase" }}>{a.tipo}</div>
                <div style={{ fontWeight: 700 }}>{a.titulo}</div>
                <div style={{ color: "var(--text-faint)", fontSize: 13 }}>{a.detalhe}</div>
              </div>
            ))}
            {alerts.alerts.length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhum alerta no momento.</p>}
          </div>
        ) : (
          <p style={{ color: "var(--text-faint)" }}>
            Sem dados ainda — a Matriz RFV populada depende do cron diário (06:00 UTC) já ter rodado ao menos uma vez.
          </p>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 12, color: "var(--text-faint)", fontWeight: 700 };
const tdStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 13 };
