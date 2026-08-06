"use client";

import { useEffect, useState } from "react";

type BreakLog = { id: string; tipo: "banheiro" | "almoco" | "outro"; started_at: string };

const TIPO_OPTIONS: { value: BreakLog["tipo"]; label: string; icon: string }[] = [
  { value: "banheiro", label: "Banheiro", icon: "wc" },
  { value: "almoco", label: "Almoço", icon: "restaurant" },
  { value: "outro", label: "Outro", icon: "more_horiz" },
];

const TIPO_LABEL: Record<BreakLog["tipo"], string> = { banheiro: "Banheiro", almoco: "Almoço", outro: "Pausa" };

function fmtElapsed(startedAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Registro de pausa 100% voluntário, só pra folha de ponto — o
 * colaborador clica quando ele quiser, ninguém é obrigado a nada e
 * nenhuma outra função da plataforma trava por causa disso. Fica
 * disponível em toda a área logada, discreto, canto oposto ao widget
 * de ligação. */
export function BreakWidget() {
  const [current, setCurrent] = useState<BreakLog | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);

  useEffect(() => {
    fetch("/api/breaks?current=1")
      .then((r) => r.json())
      .then((d) => setCurrent(d.current ?? null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!current) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [current]);

  async function startBreak(tipo: BreakLog["tipo"]) {
    setMenuOpen(false);
    const res = await fetch("/api/breaks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.break) setCurrent(data.break);
  }

  async function endBreak() {
    if (!current) return;
    const res = await fetch(`/api/breaks/${current.id}`, { method: "PATCH" });
    if (res.ok) setCurrent(null);
  }

  if (loading) return null;

  return (
    <div style={{ position: "fixed", left: 20, bottom: 20, zIndex: 9998 }}>
      {current ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "8px 8px 8px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            fontSize: 12.5,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#b45309" }}>
            <span className="msym" style={{ fontSize: 16 }}>{TIPO_OPTIONS.find((t) => t.value === current.tipo)?.icon ?? "pause_circle"}</span>
            {TIPO_LABEL[current.tipo]} · {fmtElapsed(current.started_at)}
          </span>
          <button
            onClick={endBreak}
            className="btn-primary"
            style={{ padding: "6px 12px", fontSize: 12, borderRadius: 999 }}
          >
            Voltar
          </button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 15 }} />}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: "8px 14px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--text-faint)",
              position: "relative",
              zIndex: 16,
            }}
          >
            <span className="msym" style={{ fontSize: 16 }}>schedule</span>
            Registrar pausa
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: "calc(100% + 6px)",
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                zIndex: 20,
                minWidth: 160,
                overflow: "hidden",
              }}
            >
              {TIPO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => startBreak(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    border: "none",
                    background: "#fff",
                    padding: "10px 14px",
                    fontSize: 12.5,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span className="msym" style={{ fontSize: 16, color: "var(--accent-darker)" }}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
