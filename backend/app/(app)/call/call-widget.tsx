"use client";

import { useCall } from "./call-context";

const RESULT_OPTIONS: { value: "Atendeu" | "Não atendeu" | "Agendou" | "Desqualificado"; icon: string }[] = [
  { value: "Atendeu", icon: "check_circle" },
  { value: "Não atendeu", icon: "cancel" },
  { value: "Agendou", icon: "event_available" },
  { value: "Desqualificado", icon: "block" },
];

function fmtTimer(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function CallWidget() {
  const call = useCall();

  if (!call.open || !call.deal) return null;

  const deal = call.deal;
  const title = deal.company_name ? `${deal.company_name} – ${deal.person_name}` : deal.person_name;
  const queuePosition = call.massMode ? `${call.queueIndex + 1}/${call.queue.length}` : null;

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 320,
        background: "#fff",
        border: "1.5px solid var(--accent)",
        borderRadius: 14,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        zIndex: 9999,
        fontSize: 13,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "var(--bg-dark)",
          color: "#fff",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13 }}>
          <span className="msym" style={{ fontSize: 16, color: "var(--accent)" }}>call</span>
          {call.massMode ? "Modo Ligação Massiva" : "Ligação"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {queuePosition && (
            <span style={{ background: "var(--accent)", color: "#06140d", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20 }}>
              {queuePosition}
            </span>
          )}
          <button onClick={call.closeWidget} style={{ border: "none", background: "none", color: "#fff", fontSize: 15, cursor: "pointer", lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ background: "var(--surface-muted)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
          <div style={{ color: "var(--accent-darker)", fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>
            {deal.phone ? `📱 ${deal.phone}` : "⚠️ Sem telefone cadastrado"}
          </div>
        </div>

        {call.phase === "ready" && (
          <>
            <button
              onClick={call.dial}
              disabled={!deal.phone}
              className="btn-primary"
              style={{ width: "100%", padding: 11, fontSize: 13, fontWeight: 800, marginBottom: 8, opacity: deal.phone ? 1 : 0.5 }}
            >
              <span className="msym" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>call</span>
              Ligar agora
            </button>
            {call.massMode && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={call.skipQueueItem} style={outlineBtnStyle}>
                  Pular
                </button>
                <button onClick={call.stopMassQueue} style={{ ...outlineBtnStyle, color: "var(--status-late-fg)" }}>
                  Parar modo massivo
                </button>
              </div>
            )}
          </>
        )}

        {call.phase === "in-call" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#b45309", fontWeight: 800, fontSize: 20, marginBottom: 10 }}>
              <span className="msym" style={{ fontSize: 18 }}>timer</span>
              {fmtTimer(call.elapsedSeconds)}
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>
                🎙 Transcrição ao vivo
              </div>
              <div
                style={{
                  background: "var(--surface-muted)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  color: "var(--text)",
                  maxHeight: 90,
                  minHeight: 38,
                  overflowY: "auto",
                  lineHeight: 1.5,
                }}
              >
                {call.transcript || call.interim || "Aguardando fala…"}
                {call.interim && <span style={{ color: "var(--text-faint)" }}> {call.interim}</span>}
              </div>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>
              Resultado da ligação
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              {RESULT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => call.setResult(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    justifyContent: "center",
                    border: `1.5px solid ${call.result === opt.value ? "var(--accent)" : "var(--border)"}`,
                    background: call.result === opt.value ? "var(--status-ok-bg)" : "#fff",
                    color: call.result === opt.value ? "var(--accent-darker)" : "var(--text-faint)",
                    borderRadius: 8,
                    padding: "7px 4px",
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  <span className="msym" style={{ fontSize: 14 }}>{opt.icon}</span>
                  {opt.value}
                </button>
              ))}
            </div>

            <button onClick={call.endCall} style={{ width: "100%", background: "var(--status-late-fg)", color: "#fff", border: "none", padding: 10, borderRadius: 9, fontWeight: 800, fontSize: 13 }}>
              <span className="msym" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>call_end</span>
              Encerrar Ligação
            </button>
          </>
        )}

        {call.phase === "wrap-up" && (
          <>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid var(--accent)",
                borderRadius: 8,
                padding: 10,
                fontSize: 12,
                color: "var(--text)",
                maxHeight: 160,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                marginBottom: 10,
              }}
            >
              {call.analyzing ? "⏳ Analisando ligação com IA e salvando anotação…" : call.analysis || "Sem análise."}
            </div>

            {!call.analyzing && (
              <button
                onClick={() => navigator.clipboard.writeText(call.analysis ?? "")}
                style={{ width: "100%", border: "1px solid var(--border)", background: "#fff", color: "var(--text-faint)", padding: 8, borderRadius: 8, fontSize: 12, marginBottom: 8 }}
              >
                <span className="msym" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4 }}>content_copy</span>
                Copiar análise
              </button>
            )}

            {!call.analyzing && call.massMode && call.autoAdvanceIn !== null && (
              <>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }}>
                  Próxima ligação em {call.autoAdvanceIn}s…
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={call.skipQueueItem} className="btn-primary" style={{ flex: 1, padding: 9, fontSize: 12.5 }}>
                    Ligar agora
                  </button>
                  <button onClick={call.stopMassQueue} style={{ ...outlineBtnStyle, flex: 1, color: "var(--status-late-fg)" }}>
                    Parar
                  </button>
                </div>
              </>
            )}

            {!call.analyzing && !call.massMode && (
              <button onClick={call.closeWidget} className="btn-primary" style={{ width: "100%", padding: 9, fontSize: 12.5 }}>
                Fechar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const outlineBtnStyle: React.CSSProperties = {
  flex: 1,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "var(--text-faint)",
  padding: 9,
  borderRadius: 9,
  fontSize: 12,
  fontWeight: 700,
};
