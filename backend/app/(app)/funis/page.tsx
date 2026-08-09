"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Plan = { id: string; name: string };
type Funnel = { leads: number; qualificados: number; agendamentos: number; comparecimentos: number; vendas: number };
type RegiaoRow = { regiao: string; vendas: number; leads: number };
type HorarioRow = { faixa: string; quantidade: number };
type MotivoRow = { motivo: string; quantidade: number };

const COLORS = ["#f59e0b", "#22c55e", "#a855f7", "#3b82f6", "#ef4444", "#0ea5e9"];

function pct(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";
}

function BarList<T>({ rows, getLabel, getValue, color, maxValue }: { rows: T[]; getLabel: (r: T) => string; getValue: (r: T) => number; color: string; maxValue: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r, i) => {
        const value = getValue(r);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: "38%", flexShrink: 0, fontSize: 12, color: "var(--text-faint)", lineHeight: 1.25 }}>{getLabel(r)}</div>
            <div style={{ flex: 1, background: "var(--surface-muted)", borderRadius: 6, height: 22 }}>
              <div
                style={{
                  width: `${Math.max(6, (value / Math.max(1, maxValue)) * 100)}%`,
                  height: "100%",
                  borderRadius: 6,
                  background: color,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {value}
              </div>
            </div>
          </div>
        );
      })}
      {rows.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Sem dados ainda.</p>}
    </div>
  );
}

export default function FunisPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [funnels, setFunnels] = useState<Record<string, Funnel>>({});
  const [porRegiao, setPorRegiao] = useState<RegiaoRow[]>([]);
  const [porHorario, setPorHorario] = useState<HorarioRow[]>([]);
  const [porMotivoPerda, setPorMotivoPerda] = useState<MotivoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then(async (data) => {
        const activePlans: Plan[] = (data.plans ?? []).filter((p: any) => p.active !== false);
        setPlans(activePlans);
        const [productResults, insights] = await Promise.all([
          Promise.all(activePlans.map((p) => fetch(`/api/funnels/product/${p.id}`).then((r) => r.json()))),
          fetch("/api/funnels/insights").then((r) => r.json()),
        ]);
        const map: Record<string, Funnel> = {};
        productResults.forEach((r, i) => {
          map[activePlans[i].id] = r.funnel;
        });
        setFunnels(map);
        setPorRegiao(insights.porRegiao ?? []);
        setPorHorario(insights.porHorario ?? []);
        setPorMotivoPerda(insights.porMotivoPerda ?? []);
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
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Vendas por região do Brasil</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>A partir do DDD do telefone do lead</div>
                <BarList
                  rows={porRegiao}
                  getLabel={(r: RegiaoRow) => r.regiao}
                  getValue={(r: RegiaoRow) => r.vendas}
                  color="#22c55e"
                  maxValue={Math.max(1, ...porRegiao.map((r) => r.vendas))}
                />
              </div>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Reuniões agendadas por horário</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>A partir do horário marcado na tarefa de Reunião</div>
                <BarList
                  rows={porHorario}
                  getLabel={(r: HorarioRow) => r.faixa}
                  getValue={(r: HorarioRow) => r.quantidade}
                  color="#3b82f6"
                  maxValue={Math.max(1, ...porHorario.map((r) => r.quantidade))}
                />
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Motivos de perda categorizados</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>Negociações perdidas, agrupadas pelo motivo selecionado no CRM</div>
              <BarList
                rows={porMotivoPerda}
                getLabel={(r: MotivoRow) => r.motivo}
                getValue={(r: MotivoRow) => r.quantidade}
                color="#ef4444"
                maxValue={Math.max(1, ...porMotivoPerda.map((r) => r.quantidade))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
