"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCall, type CallResult } from "./call-context";

const RESULT_OPTIONS: { value: CallResult; icon: string }[] = [
  { value: "Atendeu", icon: "check_circle" },
  { value: "Não atendeu", icon: "cancel" },
  { value: "Agendou", icon: "event_available" },
  { value: "Desqualificado", icon: "block" },
];

const NAO_TEM_INTERESSE_REASON = "Não tem interesse";

function fmtTimer(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function CallWidget() {
  const call = useCall();
  const router = useRouter();

  // Script guiado (workshop) só entra em cena quando o SDR clica
  // "Atendeu" — antes disso é o card padrão de discagem/transcrição.
  // Reseta sempre que troca de negociação (nova ligação ou avanço da
  // fila no modo massivo).
  const [scriptPhase, setScriptPhase] = useState<"pergunta1" | "pergunta2" | "agendar" | null>(null);
  const [agendarDateTime, setAgendarDateTime] = useState("");
  const [savingAgendamento, setSavingAgendamento] = useState(false);

  useEffect(() => {
    setScriptPhase(null);
    setAgendarDateTime("");
    setSavingAgendamento(false);
  }, [call.deal?.id]);

  if (!call.open || !call.deal) return null;

  const deal = call.deal;
  const title = deal.company_name ? `${deal.company_name} – ${deal.person_name}` : deal.person_name;
  const queuePosition = call.massMode ? `${call.queueIndex + 1}/${call.queue.length}` : null;

  function handleResultClick(value: CallResult) {
    if (value === "Atendeu") {
      call.setResult(value);
      setScriptPhase("pergunta1");
      return;
    }
    if (value === "Não atendeu") {
      // Sem conversa pra analisar — encerra e já disca a próxima, sem
      // esperar o countdown de 8s do wrap-up normal.
      call.endCall("Não atendeu");
      if (call.massMode) call.skipQueueItem();
      return;
    }
    call.setResult(value);
  }

  async function handleNaoTemInteresse() {
    const dealId = deal.id;
    call.endCall("Desqualificado");
    call.hideWidget();
    router.push(`/crm/${dealId}?lost=1&reason=${encodeURIComponent(NAO_TEM_INTERESSE_REASON)}`);
  }

  // "Sim" (tem interesse) vai direto pro Qualificar SDR IA — a data de
  // retorno é só pra quem pediu "Me liga depois", não pra quem já quer
  // agendar a consultoria de verdade. Fecha o widget na hora (em vez de
  // deixar o card de wrap-up flutuando por cima do wizard) — a análise
  // de IA e a anotação continuam salvando em background.
  function handleSimQualificar() {
    const dealId = deal.id;
    call.endCall("Agendou");
    call.hideWidget();
    router.push(`/crm/${dealId}?qualify=1`);
  }

  async function handleConfirmarAgendamento() {
    if (!agendarDateTime) return;
    setSavingAgendamento(true);
    await fetch(`/api/deals/${deal.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Retorno agendado (script workshop)",
        task_type: "ligacao",
        due_date: new Date(agendarDateTime).toISOString(),
      }),
    });
    call.endCall("Agendou");
    setSavingAgendamento(false);
  }

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(13,42,32,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const cardStyle: React.CSSProperties = {
    width: 380,
    background: "#fff",
    border: "1.5px solid var(--accent)",
    borderRadius: 14,
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
    fontSize: 13,
    overflow: "hidden",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
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

              {call.result === "Atendeu" && scriptPhase ? (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 6 }}>
                    🎙 Script
                  </div>

                  {scriptPhase === "pergunta1" && (
                    <>
                      <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12, background: "var(--surface-muted)", borderRadius: 8, padding: 10 }}>
                        Olá, {call.sdrName || "—"} aqui do workshop para donos de academia que você se inscreveu e está no grupo, passando somente para saber se você conseguiu assistir.
                      </p>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>Conseguiu assistir?</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setScriptPhase("pergunta2")} style={outlineBtnStyle}>Sim</button>
                        <button onClick={() => setScriptPhase("pergunta2")} style={outlineBtnStyle}>Não</button>
                      </div>
                    </>
                  )}

                  {scriptPhase === "pergunta2" && (
                    <>
                      <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12, background: "var(--surface-muted)", borderRadius: 8, padding: 10 }}>
                        Entendo, a correria do dia a dia é grande, inclusive nós liberamos 1 hora de consultoria 100% gratuita, temos 3 vagas disponíveis. Tem interesse em agendar?
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button onClick={handleSimQualificar} className="btn-primary" style={{ padding: 10, fontSize: 13 }}>
                          Sim
                        </button>
                        <button onClick={() => setScriptPhase("agendar")} style={outlineBtnStyle}>
                          Me liga depois
                        </button>
                        <button onClick={handleNaoTemInteresse} style={{ ...outlineBtnStyle, color: "var(--status-late-fg)" }}>
                          Não
                        </button>
                      </div>
                    </>
                  )}

                  {scriptPhase === "agendar" && (
                    <>
                      <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10, background: "var(--surface-muted)", borderRadius: 8, padding: 10 }}>
                        Qual o melhor horário para te ligar?
                      </p>
                      <input
                        type="datetime-local"
                        value={agendarDateTime}
                        onChange={(e) => setAgendarDateTime(e.target.value)}
                        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 10 }}
                      />
                      <button
                        onClick={handleConfirmarAgendamento}
                        disabled={!agendarDateTime || savingAgendamento}
                        className="btn-primary"
                        style={{ width: "100%", padding: 10, fontSize: 13, opacity: !agendarDateTime || savingAgendamento ? 0.5 : 1 }}
                      >
                        {savingAgendamento ? "Salvando…" : "Confirmar agendamento"}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
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
                        onClick={() => handleResultClick(opt.value)}
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

                  <button onClick={() => call.endCall()} style={{ width: "100%", background: "var(--status-late-fg)", color: "#fff", border: "none", padding: 10, borderRadius: 9, fontWeight: 800, fontSize: 13 }}>
                    <span className="msym" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>call_end</span>
                    Encerrar Ligação
                  </button>
                </>
              )}
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
