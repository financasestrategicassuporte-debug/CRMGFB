"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Area = { area: string; status: "Saudável" | "Atenção" | "Gargalo"; title: string; detail: string };
type Decision = { category: "OPORTUNIDADE" | "RISCO" | "PESSOAS" | "CAPACIDADE"; title: string; detail: string };

const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string }> = {
  Saudável: { bg: "#dcfce7", fg: "#15803d", dot: "#22c55e" },
  Atenção: { bg: "#fef3c7", fg: "#b45309", dot: "#f59e0b" },
  Gargalo: { bg: "#fee2e2", fg: "#b91c1c", dot: "#ef4444" },
};

const CATEGORY_ICON: Record<string, string> = {
  OPORTUNIDADE: "rocket_launch",
  RISCO: "warning",
  PESSOAS: "person_alert",
  CAPACIDADE: "groups_2",
};

export default function GargalosPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/bottlenecks").then((r) => r.json()), fetch("/api/decisions").then((r) => r.json())]).then(
      ([b, d]) => {
        setAreas(b.areas ?? []);
        setDecisions(d.decisions ?? []);
        setLoading(false);
      }
    );
  }, []);

  return (
    <div>
      <Banner
        title="Gargalos & Motor de Decisão"
        subtitle="Onde está o gargalo hoje e o que fazer a respeito"
        icon="troubleshoot"
        role="admin"
      />
      <div style={{ padding: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <section className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>troubleshoot</span>
            Onde está o gargalo hoje?
          </h2>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: -6 }}>
            O sistema analisa cada etapa e sinaliza o que trava o crescimento.
          </p>
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {areas.map((a) => {
                const style = STATUS_STYLE[a.status];
                return (
                  <div key={a.area} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: style.dot, display: "inline-block" }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{a.area}</div>
                        <div style={{ fontSize: 13 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{a.detail}</div>
                      </div>
                    </div>
                    <span className="badge" style={{ background: style.bg, color: style.fg }}>{a.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card" style={{ background: "var(--bg-dark)", color: "#fff" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent)" }}>neurology</span>
            Motor de Decisão
          </h2>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: -6 }}>
            Recomendações geradas a partir dos dados — não só métricas, ações.
          </p>
          {loading ? (
            <p>Carregando…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {decisions.map((d, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className="msym" style={{ color: "var(--accent)", fontSize: 18 }}>{CATEGORY_ICON[d.category]}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)" }}>{d.category}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{d.detail}</div>
                </div>
              ))}
              {decisions.length === 0 && <p style={{ color: "var(--text-faint)" }}>Sem recomendações no momento.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
