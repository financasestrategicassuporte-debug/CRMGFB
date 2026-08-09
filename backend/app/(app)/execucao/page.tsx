"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "../banner";
import { toISODate } from "@/lib/dates";

const STAGES = [
  "Sem Contato / Leads",
  "Contato Feito",
  "Reunião Agendada",
  "Remarcar Reunião",
  "Entrar em Contato",
  "Em Negociação / Proposta",
  "Acompanhamento",
];

type Geral = { avgMinutos: number; respondidos: number; semContato: number };
type OverdueTask = { taskId: string; title: string; dealId: string; dealName: string; ownerName: string; dueDate: string | null; diasAtraso: number };
type StalledDeal = { dealId: string; dealName: string; ownerName: string; stage: number; diasParada: number };
type RankingRow = {
  id: string;
  name: string;
  initials: string | null;
  color: string | null;
  role: string;
  tempoRespostaMedioMin: number | null;
  semContato: number | null;
  tarefasVencidas: number;
  negociacoesParadas: number;
};

function fmtMinutos(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ""}`;
}

function fmtDateShort(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Mesmos atalhos de "Período" do CRM e do Dashboard — Hoje/Ontem/7
 * dias/14 dias/30 dias/Mês passado, além do intervalo manual. */
function datePresets(): { label: string; from: string; to: string }[] {
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  return [
    { label: "Hoje", from: toISODate(today), to: toISODate(today) },
    { label: "Ontem", from: toISODate(daysAgo(1)), to: toISODate(daysAgo(1)) },
    { label: "7 dias", from: toISODate(daysAgo(6)), to: toISODate(today) },
    { label: "Mês passado", from: toISODate(lastMonthStart), to: toISODate(lastMonthEnd) },
  ];
}

export default function ExecucaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [geral, setGeral] = useState<Geral>({ avgMinutos: 0, respondidos: 0, semContato: 0 });
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [stalledDeals, setStalledDeals] = useState<StalledDeal[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateMenu, setShowDateMenu] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    fetch(`/api/execution?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setGeral(d.geral ?? { avgMinutos: 0, respondidos: 0, semContato: 0 });
        setOverdueTasks(d.overdueTasks ?? []);
        setStalledDeals(d.stalledDeals ?? []);
        setRanking(d.ranking ?? []);
        setLoading(false);
      });
  }, [dateFrom, dateTo]);

  const totalPendencias = overdueTasks.length + stalledDeals.length;

  return (
    <div>
      <Banner
        title="Relatório de Execução"
        subtitle="Tempo de resposta, tarefas vencidas e negociações paradas — o que o sistema já sabe sem precisar perguntar"
        icon="speed"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            {showDateMenu && <div onClick={() => setShowDateMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 15 }} />}
            <button
              onClick={() => setShowDateMenu((v) => !v)}
              style={{
                position: "relative",
                zIndex: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "#fff",
                color: "var(--text)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span className="msym" style={{ fontSize: 15, color: "var(--accent-darker)" }}>calendar_month</span>
              {dateFrom || dateTo ? `${dateFrom ? fmtDateShort(dateFrom) : "…"} – ${dateTo ? fmtDateShort(dateTo) : "hoje"}` : "Período"}
              <span className="msym" style={{ fontSize: 15, color: "var(--text-faint)" }}>expand_more</span>
            </button>
            {showDateMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 4px)",
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 20,
                  minWidth: 230,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", marginBottom: 8, textTransform: "uppercase" }}>
                  Filtrar por data de criação
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                  {datePresets().map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setDateFrom(p.from);
                        setDateTo(p.to);
                        setShowDateMenu(false);
                      }}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        background: dateFrom === p.from && dateTo === p.to ? "var(--status-ok-bg)" : "#fff",
                        color: dateFrom === p.from && dateTo === p.to ? "var(--accent-darker)" : "var(--text)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 9px",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>
                  Personalizado
                </div>
                <label style={{ fontSize: 11, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>De</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", fontSize: 12.5, marginBottom: 8 }}
                />
                <label style={{ fontSize: 11, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>Até</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", fontSize: 12.5, marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, background: "#fff", padding: "6px 0", fontSize: 12 }}
                  >
                    Ver tudo
                  </button>
                  <button onClick={() => setShowDateMenu(false)} className="btn-primary" style={{ flex: 1, padding: "6px 0", fontSize: 12 }}>
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-faint)", fontSize: 12 }}>
                  <span className="msym" style={{ fontSize: 18, color: "#3b82f6" }}>bolt</span> Tempo médio até 1º contato
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{geral.respondidos > 0 ? fmtMinutos(geral.avgMinutos) : "—"}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{geral.respondidos} negociações já contatadas</div>
              </div>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-faint)", fontSize: 12 }}>
                  <span className="msym" style={{ fontSize: 18, color: "#f59e0b" }}>hourglass_empty</span> Leads sem nenhum contato
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: geral.semContato > 0 ? "#dc2626" : undefined }}>{geral.semContato}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Ainda parados em &quot;Sem Contato&quot;</div>
              </div>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-faint)", fontSize: 12 }}>
                  <span className="msym" style={{ fontSize: 18, color: "#dc2626" }}>schedule</span> Tarefas vencidas
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: overdueTasks.length > 0 ? "#dc2626" : undefined }}>{overdueTasks.length}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Prazo já passou, ninguém marcou como feita</div>
              </div>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-faint)", fontSize: 12 }}>
                  <span className="msym" style={{ fontSize: 18, color: "#dc2626" }}>pan_tool</span> Negociações paradas
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: stalledDeals.length > 0 ? "#dc2626" : undefined }}>{stalledDeals.length}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>3+ dias sem trocar de etapa</div>
              </div>
            </div>

            <section className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>leaderboard</span>
                Ranking de execução · SDR &amp; Closer
              </h2>
              <p style={{ color: "var(--text-faint)", fontSize: 12.5, padding: "0 16px", marginTop: 4 }}>
                Ordenado por quem tem mais pendência acumulada (tarefas vencidas + negociações paradas).
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
                <thead>
                  <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                    <th style={thStyle}>Colaborador</th>
                    <th style={thStyle}>Função</th>
                    <th style={thStyle}>Tempo até 1º contato</th>
                    <th style={thStyle}>Tarefas vencidas</th>
                    <th style={thStyle}>Negociações paradas</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => {
                    const alerta = r.tarefasVencidas > 0 || r.negociacoesParadas > 0;
                    return (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--border)", background: alerta ? "#fef2f2" : undefined }}>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={{ ...tdStyle, textTransform: "capitalize" }}>{r.role}</td>
                        <td style={tdStyle}>{r.tempoRespostaMedioMin != null ? fmtMinutos(r.tempoRespostaMedioMin) : "—"}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: r.tarefasVencidas > 0 ? "#dc2626" : undefined }}>{r.tarefasVencidas}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: r.negociacoesParadas > 0 ? "#dc2626" : undefined }}>{r.negociacoesParadas}</td>
                      </tr>
                    );
                  })}
                  {ranking.length === 0 && (
                    <tr>
                      <td style={tdStyle} colSpan={5}>Nenhum SDR/Closer ativo cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <section className="card" style={{ padding: 0, overflow: "hidden" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="msym" style={{ fontSize: 18, color: "#dc2626" }}>schedule</span>
                  Tarefas vencidas ({overdueTasks.length})
                </h2>
                <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                        <th style={thStyle}>Tarefa</th>
                        <th style={thStyle}>Negociação</th>
                        <th style={thStyle}>Responsável</th>
                        <th style={thStyle}>Atraso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueTasks.map((t) => (
                        <tr key={t.taskId} style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }} onClick={() => router.push(`/crm/${t.dealId}`)}>
                          <td style={tdStyle}>{t.title}</td>
                          <td style={tdStyle}>{t.dealName}</td>
                          <td style={tdStyle}>{t.ownerName}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: "#dc2626" }}>{t.diasAtraso}d</td>
                        </tr>
                      ))}
                      {overdueTasks.length === 0 && (
                        <tr>
                          <td style={tdStyle} colSpan={4}>Nenhuma tarefa vencida agora.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card" style={{ padding: 0, overflow: "hidden" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="msym" style={{ fontSize: 18, color: "#dc2626" }}>pan_tool</span>
                  Negociações paradas ({stalledDeals.length})
                </h2>
                <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                        <th style={thStyle}>Negociação</th>
                        <th style={thStyle}>Etapa atual</th>
                        <th style={thStyle}>Responsável</th>
                        <th style={thStyle}>Parada há</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stalledDeals.map((d) => (
                        <tr key={d.dealId} style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }} onClick={() => router.push(`/crm/${d.dealId}`)}>
                          <td style={tdStyle}>{d.dealName}</td>
                          <td style={tdStyle}>{STAGES[d.stage] ?? d.stage}</td>
                          <td style={tdStyle}>{d.ownerName}</td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: "#dc2626" }}>{d.diasParada}d</td>
                        </tr>
                      ))}
                      {stalledDeals.length === 0 && (
                        <tr>
                          <td style={tdStyle} colSpan={4}>Nenhuma negociação parada agora.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {totalPendencias === 0 && (
              <p style={{ textAlign: "center", color: "var(--accent-darker)", fontWeight: 700, marginTop: 20 }}>
                Nenhuma pendência de execução agora — time em dia.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 12, color: "var(--text-faint)", fontWeight: 700 };
const tdStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 13 };
