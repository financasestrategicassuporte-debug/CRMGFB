"use client";

import { useEffect, useState } from "react";
import { Banner } from "../../banner";

type Closer = {
  id: string;
  name: string;
  reunioes: number;
  fechamentos: number;
  conversao: number;
  ticketMedio: number;
  receita: number;
};

function fmtK(v: number) {
  return v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PerformanceCloserPage() {
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/performance/closer")
      .then((r) => r.json())
      .then((data) => {
        setClosers((data.closers ?? []).sort((a: Closer, b: Closer) => b.receita - a.receita));
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Banner
        title="Performance dos Closers"
        subtitle="Da reunião ao fechamento · receita e ranking"
        icon="handshake"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>workspace_premium</span>
            Ranking de Closers · reunião → receita
          </h2>
          {loading ? (
            <p style={{ padding: 16 }}>Carregando…</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
              <thead>
                <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Closer</th>
                  <th style={thStyle}>Reun.</th>
                  <th style={thStyle}>Fech.</th>
                  <th style={thStyle}>Conv.</th>
                  <th style={thStyle}>Ticket</th>
                  <th style={thStyle}>Receita</th>
                </tr>
              </thead>
              <tbody>
                {closers.map((c, i) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{c.name}</td>
                    <td style={tdStyle}>{c.reunioes}</td>
                    <td style={tdStyle}>{c.fechamentos}</td>
                    <td style={tdStyle}>{Math.round(c.conversao * 100)}%</td>
                    <td style={tdStyle}>{fmtK(c.ticketMedio)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: "var(--accent-darker)" }}>{fmtK(c.receita)}</td>
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
