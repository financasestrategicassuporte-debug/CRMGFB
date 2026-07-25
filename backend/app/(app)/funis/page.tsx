"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Plan = { id: string; name: string };
type Funnel = { leads: number; qualificados: number; agendamentos: number; comparecimentos: number; vendas: number };

const COLORS = ["#f59e0b", "#22c55e", "#a855f7", "#3b82f6", "#ef4444", "#0ea5e9"];

function pct(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";
}

export default function FunisPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [funnels, setFunnels] = useState<Record<string, Funnel>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then(async (data) => {
        const activePlans: Plan[] = (data.plans ?? []).filter((p: any) => p.active !== false);
        setPlans(activePlans);
        const results = await Promise.all(
          activePlans.map((p) => fetch(`/api/funnels/product/${p.id}`).then((r) => r.json()))
        );
        const map: Record<string, Funnel> = {};
        results.forEach((r, i) => {
          map[activePlans[i].id] = r.funnel;
        });
        setFunnels(map);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Banner
        title="Funis por Produto"
        subtitle="Funil independente de cada produto + funil geral consolidado"
        icon="filter_alt"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {plans.map((plan, i) => {
              const f = funnels[plan.id];
              if (!f) return null;
              const steps = [
                { label: "Leads", value: f.leads },
                { label: "Qualif.", value: f.qualificados },
                { label: "Agend.", value: f.agendamentos },
                { label: "Compar.", value: f.comparecimentos },
                { label: "Vendas", value: f.vendas },
              ];
              return (
                <div key={plan.id} className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length], display: "inline-block" }} />
                    <div style={{ fontWeight: 700 }}>{plan.name}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {steps.map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 60, fontSize: 11, color: "var(--text-faint)" }}>{s.label}</div>
                        <div style={{ flex: 1, background: "var(--surface-muted)", borderRadius: 6, height: 22 }}>
                          <div
                            style={{
                              width: `${Math.max(6, (s.value / Math.max(1, f.leads)) * 100)}%`,
                              height: "100%",
                              borderRadius: 6,
                              background: COLORS[i % COLORS.length],
                              display: "flex",
                              alignItems: "center",
                              paddingLeft: 8,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {s.value}
                          </div>
                        </div>
                        <div style={{ width: 36, fontSize: 11, color: "var(--text-faint)" }}>{pct(s.value, f.leads)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
