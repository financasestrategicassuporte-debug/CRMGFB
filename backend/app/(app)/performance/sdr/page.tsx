"use client";

import { useEffect, useState } from "react";
import { Banner } from "../../banner";

type Sdr = {
  id: string;
  name: string;
  initials: string | null;
  color: string | null;
  recebidos: number;
  qualificados: number;
  agendados: number;
  tmrMinutos: number;
  taxaAgendamento: number;
};

const STRATEGIES = [
  { id: "round_robin", icon: "sync_alt", label: "Round Robin", desc: "Distribui em círculo, um lead para cada SDR." },
  { id: "balanceamento", icon: "balance", label: "Balanceamento", desc: "Equaliza pela carga atual de cada SDR." },
  { id: "peso", icon: "lock", label: "Peso", desc: "Mais leads para SDRs de maior conversão." },
  { id: "prioridade", icon: "priority_high", label: "Prioridade", desc: "Leads quentes vão para os melhores." },
  { id: "manual", icon: "back_hand", label: "Manual", desc: "Gestor distribui caso a caso." },
] as const;

export default function PerformanceSdrPage() {
  const [sdrs, setSdrs] = useState<Sdr[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]["id"]>("round_robin");
  const [distributing, setDistributing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/performance/sdr");
    const data = await res.json();
    setSdrs((data.sdrs ?? []).sort((a: Sdr, b: Sdr) => b.agendados - a.agendados));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function distribute() {
    setDistributing(true);
    setMessage(null);
    const dealsRes = await fetch("/api/deals");
    const dealsData = await dealsRes.json();
    const unassigned = (dealsData.deals ?? []).filter((d: any) => !d.assigned_to).map((d: any) => d.id);
    if (unassigned.length === 0) {
      setMessage("Nenhum lead sem dono para distribuir agora.");
      setDistributing(false);
      return;
    }
    const res = await fetch("/api/leads/distribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_ids: unassigned, strategy }),
    });
    if (res.ok) {
      setMessage(`${unassigned.length} negociações distribuídas.`);
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setMessage(body.error ?? "Não foi possível distribuir agora.");
    }
    setDistributing(false);
  }

  return (
    <div>
      <Banner
        title="Performance dos SDRs"
        subtitle="Do lead recebido à reunião agendada · ranking automático"
        icon="call"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        <section className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>alt_route</span>
            Motor de distribuição de leads
          </h2>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: -6 }}>
            Leads do Marketing entram na plataforma e são distribuídos automaticamente aos SDRs. Escolha a estratégia.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            {STRATEGIES.map((s) => {
              const active = strategy === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrategy(s.id)}
                  style={{
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "rgba(34,197,94,0.08)" : "#fff",
                    borderRadius: 10,
                    padding: 10,
                    textAlign: "left",
                  }}
                >
                  <span className="msym" style={{ color: active ? "var(--accent-darker)" : "var(--text-faint)", display: "block", marginBottom: 4 }}>
                    {s.icon}
                  </span>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{s.desc}</div>
                </button>
              );
            })}
          </div>
          <button className="btn-primary" onClick={distribute} disabled={distributing}>
            {distributing ? "Distribuindo…" : "Distribuir por Performance"}
          </button>
          {message && <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 8 }}>{message}</p>}
        </section>

        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>leaderboard</span>
            Ranking de SDRs · leads → agendamentos
          </h2>
          {loading ? (
            <p style={{ padding: 16 }}>Carregando…</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
              <thead>
                <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>SDR</th>
                  <th style={thStyle}>Leads</th>
                  <th style={thStyle}>Qualif.</th>
                  <th style={thStyle}>Agend.</th>
                  <th style={thStyle}>TMR</th>
                  <th style={thStyle}>Tx. Agend.</th>
                </tr>
              </thead>
              <tbody>
                {sdrs.map((s, i) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{s.name}</td>
                    <td style={tdStyle}>{s.recebidos}</td>
                    <td style={tdStyle}>{s.qualificados}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{s.agendados}</td>
                    <td style={tdStyle}>{s.tmrMinutos} min</td>
                    <td style={tdStyle}>{Math.round(s.taxaAgendamento * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 12, color: "var(--text-faint)", fontWeight: 700 };
const tdStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 13 };
