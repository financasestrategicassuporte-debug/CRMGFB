"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "../banner";

type RankingRow = {
  id: string;
  name: string;
  initials: string | null;
  color: string | null;
  reunioes: number;
  vendas: number;
  receita: number;
};

type DealLite = {
  id: string;
  person_name: string;
  company_name: string | null;
  score: number | null;
  stage: number;
  diasParado?: number;
};

type DailySummary = {
  leadsParaAtacar: DealLite[];
  pendentes: DealLite[];
  tarefasHoje: number;
  reunioesHoje: number;
  totalAtivas: number;
  coachMessage: string;
};

const TABS = ["Resumo do dia", "Ranking"] as const;
type Tab = (typeof TABS)[number];

const MEDAL = ["🥇", "🥈", "🥉"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function monthLabel() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function dealLabel(d: DealLite) {
  return d.company_name ? `${d.company_name} — ${d.person_name}` : d.person_name;
}

function RankingList({ rows, meId }: { rows: RankingRow[]; meId: string }) {
  if (rows.length === 0) {
    return <p style={{ color: "var(--text-faint)" }}>Ninguém nesse papel ainda.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((row, i) => {
        const isMe = row.id === meId;
        return (
          <div
            key={row.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: `1.5px solid ${isMe ? "var(--accent)" : "var(--border)"}`,
              background: isMe ? "var(--status-ok-bg)" : "#fff",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <div style={{ width: 30, textAlign: "center", fontSize: i < 3 ? 22 : 15, fontWeight: 800, color: "var(--text-faint)" }}>
              {i < 3 ? MEDAL[i] : `${i + 1}º`}
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: row.color ?? "var(--accent)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {row.initials ?? row.name.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.name} {isMe && <span style={{ color: "var(--accent-darker)", fontWeight: 800 }}>· você</span>}
              </div>
              <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
                {row.reunioes} reunião(ões) comparecida(s) · {fmtBRL(row.receita)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-darker)" }}>{row.vendas}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-faint)", textTransform: "uppercase" }}>vendas</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PainelPage() {
  const router = useRouter();
  const [role, setRole] = useState("sdr");
  const [tab, setTab] = useState<Tab>("Resumo do dia");
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [sdrRanking, setSdrRanking] = useState<RankingRow[]>([]);
  const [closerRanking, setCloserRanking] = useState<RankingRow[]>([]);
  const [meId, setMeId] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.profile?.role ?? "sdr"));
    fetch("/api/daily-summary")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d);
        setLoadingSummary(false);
      });
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((d) => {
        setSdrRanking(d.sdrRanking ?? []);
        setCloserRanking(d.closerRanking ?? []);
        setMeId(d.meId ?? "");
        setLoadingRanking(false);
      });
  }, []);

  const showBoth = role === "admin";
  const myRanking = role === "closer" ? closerRanking : sdrRanking;

  return (
    <div>
      <Banner title="Dashboard" subtitle="Resumo do dia e ranking da equipe" icon="local_fire_department" role={role} />
      <div style={{ padding: 32 }}>
        <div style={{ display: "flex", gap: 14, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                border: "none",
                background: "none",
                padding: "0 0 10px",
                fontSize: 14,
                fontWeight: 700,
                color: tab === t ? "var(--accent-darker)" : "var(--text-faint)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Resumo do dia" ? (
          loadingSummary || !summary ? (
            <p>Carregando…</p>
          ) : (
            <>
              <div className="card" style={{ background: "var(--bg-dark)", color: "#fff", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span className="msym" style={{ fontSize: 24, color: "var(--accent)" }}>tips_and_updates</span>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Resumo de hoje</div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{summary.coachMessage}</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{summary.totalAtivas}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Negociações ativas</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{summary.tarefasHoje}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Tarefas de hoje</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{summary.reunioesHoje}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>Reuniões hoje</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
                <section className="card">
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>bolt</span>
                    Leads pra atacar — maior chance de fechar
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {summary.leadsParaAtacar.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => router.push(`/crm/${d.id}`)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff", textAlign: "left" }}
                      >
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{dealLabel(d)}</span>
                        <span className="badge badge-ok">{d.score}%</span>
                      </button>
                    ))}
                    {summary.leadsParaAtacar.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nenhuma negociação qualificada ainda.</p>}
                  </div>
                </section>

                <section className="card">
                  <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="msym" style={{ fontSize: 18, color: "var(--status-late-fg)" }}>schedule</span>
                    Pendentes — precisam de contato
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {summary.pendentes.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => router.push(`/crm/${d.id}`)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "#fff", textAlign: "left" }}
                      >
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{dealLabel(d)}</span>
                        <span className="badge badge-late">{d.diasParado}d parado</span>
                      </button>
                    ))}
                    {summary.pendentes.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nada parado — tudo em dia!</p>}
                  </div>
                </section>
              </div>
            </>
          )
        ) : loadingRanking ? (
          <p>Carregando…</p>
        ) : showBoth ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
            <section className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>🏆 Ranking SDR</h2>
              <RankingList rows={sdrRanking} meId={meId} />
            </section>
            <section className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>🏆 Ranking Closer</h2>
              <RankingList rows={closerRanking} meId={meId} />
            </section>
          </div>
        ) : (
          <section className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>
              🏆 Ranking {role === "closer" ? "Closer" : "SDR"} · <span style={{ textTransform: "capitalize", fontWeight: 600, color: "var(--text-faint)" }}>{monthLabel()}</span>
            </h2>
            <RankingList rows={myRanking} meId={meId} />
          </section>
        )}
      </div>
    </div>
  );
}
