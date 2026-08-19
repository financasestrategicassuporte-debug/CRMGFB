"use client";

import { useEffect, useState } from "react";
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

const TABS = ["Ranking", "Resumo IA"] as const;
type Tab = (typeof TABS)[number];

const MEDAL = ["🥇", "🥈", "🥉"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function monthLabel() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
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
  const [role, setRole] = useState("sdr");
  const [tab, setTab] = useState<Tab>("Ranking");
  const [sdrRanking, setSdrRanking] = useState<RankingRow[]>([]);
  const [closerRanking, setCloserRanking] = useState<RankingRow[]>([]);
  const [meId, setMeId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.profile?.role ?? "sdr"));
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((d) => {
        setSdrRanking(d.sdrRanking ?? []);
        setCloserRanking(d.closerRanking ?? []);
        setMeId(d.meId ?? "");
        setLoading(false);
      });
  }, []);

  const showBoth = role === "admin";
  const myRanking = role === "closer" ? closerRanking : sdrRanking;
  const myPosition = myRanking.findIndex((r) => r.id === meId);

  return (
    <div>
      <Banner title="Dashboard" subtitle={`Resumo do mês e ranking da equipe`} icon="local_fire_department" role={role} />
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

        {loading ? (
          <p>Carregando…</p>
        ) : tab === "Ranking" ? (
          <>
            {!showBoth && myPosition >= 0 && (
              <div className="card" style={{ background: "var(--bg-dark)", color: "#fff", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 34 }}>{myPosition < 3 ? MEDAL[myPosition] : "🏁"}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                    {myPosition === 0 ? "Você está em 1º lugar esse mês!" : `Você está em ${myPosition + 1}º lugar esse mês`}
                  </div>
                  <div style={{ color: "var(--text-faint)", fontSize: 12.5, textTransform: "capitalize" }}>{monthLabel()}</div>
                </div>
              </div>
            )}

            {showBoth ? (
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
          </>
        ) : (
          <section className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>🤖 Resumo IA</h2>
            <p style={{ color: "var(--text-faint)", fontSize: 13.5 }}>Em breve — análise automática das negociações paradas, priorizando quem é mais fácil de recuperar.</p>
          </section>
        )}
      </div>
    </div>
  );
}
