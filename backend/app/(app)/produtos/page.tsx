"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Row = {
  product: { id: string; name: string };
  funnel: { leads: number; comparecimentos: number; vendas: number; receita: number };
  economics: { cac: number; roi: number; investimento: number; lucro: number; custoPorReuniao: number; custoPorVenda: number; conversao: number };
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtK(v: number) {
  return v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmtBRL(v);
}

export default function ProdutosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setRows(data.products ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Banner
        title="Dashboard por Produto"
        subtitle="Funil, CAC, ROI e receita de cada produto"
        icon="category"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        {loading ? (
          <p>Carregando…</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
              {rows.map((r) => (
                <div key={r.product.id} className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{r.product.name}</div>
                    <span className="badge badge-ok">ROI {Math.round(r.economics.roi * 100)}%</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.funnel.leads}</div>
                      <div style={{ color: "var(--text-faint)", fontSize: 11 }}>Leads</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.funnel.comparecimentos}</div>
                      <div style={{ color: "var(--text-faint)", fontSize: 11 }}>Comparec.</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.funnel.vendas}</div>
                      <div style={{ color: "var(--text-faint)", fontSize: 11 }}>Vendas</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{fmtK(r.funnel.receita)}</div>
                      <div style={{ color: "var(--text-faint)", fontSize: 11 }}>Receita</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <section className="card" style={{ padding: 0, overflow: "hidden" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, padding: "16px 16px 0" }}>Marketing × Vendas · cruzamento por produto</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                <thead>
                  <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                    <th style={thStyle}>Produto</th>
                    <th style={thStyle}>Invest.</th>
                    <th style={thStyle}>C/Reunião</th>
                    <th style={thStyle}>C/Venda</th>
                    <th style={thStyle}>Receita</th>
                    <th style={thStyle}>ROI</th>
                    <th style={thStyle}>Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.product.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={tdStyle}>{r.product.name}</td>
                      <td style={tdStyle}>{fmtK(r.economics.investimento)}</td>
                      <td style={tdStyle}>{fmtK(r.economics.custoPorReuniao)}</td>
                      <td style={tdStyle}>{fmtK(r.economics.custoPorVenda)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtK(r.funnel.receita)}</td>
                      <td style={{ ...tdStyle, color: "var(--accent-darker)", fontWeight: 700 }}>{Math.round(r.economics.roi * 100)}%</td>
                      <td style={tdStyle}>{fmtK(r.economics.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 12, color: "var(--text-faint)", fontWeight: 700 };
const tdStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 13 };
