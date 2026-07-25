"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Commission = {
  id: string;
  amount: number;
  percent: number | null;
  status: "pending" | "paid";
  period: string;
  closer: { id: string; name: string; initials: string | null } | null;
  deal: { id: string; person_name: string } | null;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtK(v: number) {
  return v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmtBRL(v);
}

export default function ComissoesPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/commissions")
      .then((r) => r.json())
      .then((data) => {
        setCommissions(data.commissions ?? []);
        setLoading(false);
      });
  }, []);

  const total = commissions.reduce((sum, c) => sum + c.amount, 0);

  const byCloser = new Map<string, { name: string; initials: string | null; total: number; count: number }>();
  for (const c of commissions) {
    if (!c.closer) continue;
    const bucket = byCloser.get(c.closer.id) ?? { name: c.closer.name, initials: c.closer.initials, total: 0, count: 0 };
    bucket.total += c.amount;
    bucket.count += 1;
    byCloser.set(c.closer.id, bucket);
  }
  const closerRows = [...byCloser.values()].sort((a, b) => b.total - a.total);

  return (
    <div>
      <Banner
        title="Comissões"
        subtitle="Cálculo automático de SDR e Closer em tempo real"
        icon="savings"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        <div className="card" style={{ background: "var(--bg-dark)", color: "#fff", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Comissões do período · cálculo automático</div>
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>Atualizado conforme reuniões e vendas entram.</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "right" }}>TOTAL A PAGAR</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{fmtK(total)}</div>
          </div>
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <section className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>handshake</span>
              Closers · por venda fechada
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {closerRows.map((c) => (
                <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                      {c.initials ?? c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ color: "var(--text-faint)", fontSize: 12 }}>{c.count} comissões</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: "var(--accent-darker)" }}>{fmtK(c.total)}</div>
                </div>
              ))}
              {closerRows.length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhuma comissão registrada ainda.</p>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
