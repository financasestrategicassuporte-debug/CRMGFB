"use client";

import { useState } from "react";
import {
  computeQualification,
  buildQualificationNote,
  buildEncerrarNote,
  shouldEncerrar,
  type SdrQualificationInput,
  type SdrQualificationResult,
} from "@/lib/sdrQualification";

type Props = {
  dealId: string;
  personName: string;
  sdrNome: string;
  onClose: () => void;
  onSaved: () => void;
};

type Answers = Partial<SdrQualificationInput>;

const FATURAMENTO_OPTIONS = [
  { value: 10000, label: "Até R$ 10.000" },
  { value: 20000, label: "R$ 10.001 a R$ 20.000" },
  { value: 30000, label: "R$ 20.001 a R$ 30.000" },
  { value: 50000, label: "R$ 30.001 a R$ 50.000" },
  { value: 80000, label: "R$ 50.001 a R$ 80.000" },
  { value: 120000, label: "R$ 80.001 a R$ 120.000" },
  { value: 200000, label: "R$ 120.001 a R$ 200.000" },
  { value: 300000, label: "Acima de R$ 200.000" },
];

const MARGEM_OPTIONS = [
  { value: 5, label: "Abaixo de 10% (margem muito baixa)" },
  { value: 15, label: "10% a 20%" },
  { value: 25, label: "20% a 30%" },
  { value: 35, label: "30% a 40%" },
  { value: 50, label: "Acima de 40% (margem excelente)" },
];

const FAT_ESPERADO_OPTIONS = [
  { value: 30000, label: "Até R$ 30.000" },
  { value: 50000, label: "R$ 30.001 a R$ 50.000" },
  { value: 80000, label: "R$ 50.001 a R$ 80.000" },
  { value: 120000, label: "R$ 80.001 a R$ 120.000" },
  { value: 200000, label: "R$ 120.001 a R$ 200.000" },
  { value: 300000, label: "Acima de R$ 200.000" },
];

const MARGEM_ESPERADA_OPTIONS = [
  { value: 10, label: "Até 10%" },
  { value: 20, label: "10% a 20%" },
  { value: 30, label: "20% a 30%" },
  { value: 40, label: "30% a 40%" },
  { value: 50, label: "Acima de 40%" },
];

function getSteps(a: Answers): string[] {
  const steps = ["origem", "negocio", "faturamento", "margem", "divida"];
  if (a.divida === "sim") {
    steps.push("fluxo");
    if (a.fluxo === "neg") {
      steps.push("fundo");
      if (a.fundo === "nao") return steps; // encerra aqui — resto não se aplica
    }
  }
  steps.push("desafio", "ancoragem", "dor", "decisor");
  if (a.decisor === "unico") {
    steps.push("casado");
    if (a.casado === "sim") steps.push("conjuge");
  } else if (a.decisor === "outro") {
    steps.push("decisor2");
  }
  steps.push("urgencia");
  return steps;
}

function isComplete(key: string, a: Answers): boolean {
  switch (key) {
    case "origem":
      return !!a.origem;
    case "negocio":
      return !!a.negocio?.trim();
    case "faturamento":
      return !!a.faturamento;
    case "margem":
      return !!a.margem;
    case "divida":
      return !!a.divida;
    case "fluxo":
      return !!a.fluxo;
    case "fundo":
      return !!a.fundo;
    case "desafio":
      return !!a.desafio?.trim();
    case "ancoragem":
      return true; // opcional
    case "dor":
      return !!a.dor?.trim();
    case "decisor":
      return !!a.decisor;
    case "casado":
      return !!a.casado;
    case "conjuge":
      return !!a.conjugeConfirmado;
    case "decisor2":
      return !!a.decisor2Confirmado;
    case "urgencia":
      return !!a.urgencia;
    default:
      return true;
  }
}

const cardStyle: React.CSSProperties = { width: 480, background: "#fff", maxHeight: "88vh", overflowY: "auto" };
const choiceBtnStyle = (selected: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
  background: selected ? "var(--status-ok-bg)" : "#fff",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
});
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  marginBottom: 6,
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6, marginTop: 10 };
const hintStyle: React.CSSProperties = { fontSize: 12, color: "var(--text-faint)", marginBottom: 14, lineHeight: 1.4 };

export function QualifyWizard({ dealId, personName, sdrNome, onClose, onSaved }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [encerrado, setEncerrado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const steps = getSteps(answers);
  const currentKey = steps[stepIndex];

  function update(patch: Answers) {
    setAnswers((a) => ({ ...a, ...patch }));
  }

  function next() {
    if (currentKey === "fundo" && answers.fundo === "nao") {
      setEncerrado(true);
      setShowResult(true);
      return;
    }
    if (stepIndex >= steps.length - 1) {
      setShowResult(true);
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function back() {
    if (showResult) {
      setShowResult(false);
      setEncerrado(false);
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  }

  let result: SdrQualificationResult | null = null;
  if (showResult && !encerrado) {
    result = computeQualification(answers as SdrQualificationInput);
  }

  async function save() {
    setSaving(true);
    const noteBody = encerrado
      ? buildEncerrarNote({ negocio: answers.negocio ?? "" }, sdrNome)
      : buildQualificationNote(answers as SdrQualificationInput, sdrNome, result!);

    await fetch(`/api/deals/${dealId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody, is_ai_generated: true }),
    });

    if (!encerrado && result) {
      const stars = Math.max(1, Math.min(5, Math.ceil(result.score / 20)));
      await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualification: stars,
          score: result.score,
          pipeline: result.resultado === "nao_agendar" ? "frio" : "quente",
        }),
      });
    }

    setSaving(false);
    setSaved(true);
    onSaved();
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
  };

  if (saved) {
    return (
      <div style={overlayStyle}>
        <div className="card" style={{ ...cardStyle, textAlign: "center", padding: 32 }}>
          <span className="msym" style={{ fontSize: 40, color: "var(--accent)" }}>check_circle</span>
          <h2 style={{ fontSize: 16 }}>Diagnóstico salvo nas anotações</h2>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginBottom: 20 }}>
            O resultado completo da qualificação foi registrado no histórico de {personName}.
          </p>
          <button className="btn-primary" style={{ width: "100%" }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div style={overlayStyle}>
        <div className="card" style={cardStyle}>
          {encerrado ? (
            <>
              <h2 style={{ fontSize: 16, color: "var(--status-late-fg)" }}>❌ Entrevista encerrada</h2>
              <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                Fluxo de caixa negativo e sem fundo de reserva — situação financeira crítica. O programa não
                consegue ajudar {personName} neste momento.
              </p>
              <p style={{ fontSize: 12.5, color: "var(--text-faint)", background: "var(--surface-muted)", padding: 10, borderRadius: 8 }}>
                &ldquo;Pelo que você me disse, você está em uma situação muito delicada na sua empresa. Na minha
                opinião, o mais importante agora é segurar o caixa. Vou te enviar 1 hora de consultoria 100%
                gratuita e um PDF de bônus.&rdquo;
              </p>
            </>
          ) : (
            result && (
              <>
                <h2 style={{ fontSize: 16 }}>{result.tituloText}</h2>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: "var(--surface-muted)", borderRadius: 10, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Chance de Compra</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: result.score >= 60 ? "var(--accent-darker)" : result.score >= 35 ? "#b45309" : "var(--status-late-fg)" }}>
                      {result.score}%
                    </div>
                  </div>
                  <div style={{ flex: 2, background: "var(--surface-muted)", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>Produto Recomendado</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{result.produto}</div>
                  </div>
                </div>

                {result.resultado !== "nao_agendar" && (
                  <p style={{ fontSize: 12.5, marginBottom: 10 }}>{result.negociacao}</p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {(["B", "A", "N", "T"] as const).map((k) => {
                    const item = result!.bant[k];
                    const labels = { B: "Budget", A: "Authority", N: "Need", T: "Timeline" };
                    const color = item.status === "ok" ? "var(--accent-darker)" : item.status === "warn" ? "#b45309" : "var(--status-late-fg)";
                    return (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px" }}>
                        <span style={{ fontWeight: 700, color }}>{k} · {labels[k]}</span>
                        <span style={{ color: "var(--text-faint)" }}>{item.desc}</span>
                      </div>
                    );
                  })}
                </div>

                {result.alertas.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🚨 Alertas de Inconsistência</div>
                    {result.alertas.map((a, i) => (
                      <div key={i} style={{ fontSize: 12, color: a.sev === "critico" ? "var(--status-late-fg)" : "#b45309", marginBottom: 4 }}>
                        [{a.sev === "critico" ? "CRÍTICO" : "SUSPEITO"}] {a.msg}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>🎯 O que fazer agora</div>
                  <ol style={{ paddingLeft: 18, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 4 }}>
                    {result.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ol>
                </div>

                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>📊 Breakdown da Fórmula de Chance</div>
                  {result.breakdown.map((d) => (
                    <div key={d.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                      <span>{d.label}</span>
                      <span style={{ fontWeight: 700 }}>{d.max > 0 ? `${d.pts}/${d.max}` : `${d.pts} pts`}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button onClick={back} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
              ← Voltar
            </button>
            <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? "Salvando…" : "💾 Salvar nas anotações"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canAdvance = isComplete(currentKey, answers);

  return (
    <div style={overlayStyle}>
      <div className="card" style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ marginTop: 0, fontSize: 15 }}>Qualificar SDR IA — {personName}</h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none" }}>✕</button>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 18, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((stepIndex + 1) / steps.length) * 100}%`, background: "var(--accent)" }} />
        </div>

        {currentKey === "origem" && (
          <>
            <label style={labelStyle}>Como o lead chegou até vocês?</label>
            <select value={answers.origem ?? ""} onChange={(e) => update({ origem: e.target.value as Answers["origem"] })} style={inputStyle}>
              <option value="">Selecione…</option>
              <option value="quente">Funil Webinário Quente — Preencheram Aplicação</option>
              <option value="frio_ate40k">Funil Webinário Frio — Até 40K</option>
              <option value="frio_mais40k">Funil Webinário Frio — +40K</option>
            </select>
          </>
        )}

        {currentKey === "negocio" && (
          <>
            <label style={labelStyle}>Me fala um pouco do seu negócio</label>
            <p style={hintStyle}>💡 Pergunta aberta de situação — anote os pontos que puder (nº de alunos, funcionários, unidades) para o diagnóstico ficar mais preciso.</p>
            <textarea
              value={answers.negocio ?? ""}
              onChange={(e) => update({ negocio: e.target.value })}
              placeholder="Ex: Academia de 5 anos, 400 alunos, foco em musculação, ticket médio R$120, 3 funcionários…"
              style={{ ...inputStyle, minHeight: 80 }}
            />
          </>
        )}

        {currentKey === "faturamento" && (
          <>
            <label style={labelStyle}>Qual o faturamento médio mensal da empresa?</label>
            <p style={hintStyle}>💡 O faturamento é a base para calcular se o lead tem capacidade real de pagamento (Budget do BANT).</p>
            <select value={answers.faturamento ?? ""} onChange={(e) => update({ faturamento: Number(e.target.value) })} style={inputStyle}>
              <option value="">Selecione a faixa…</option>
              {FATURAMENTO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </>
        )}

        {currentKey === "margem" && (
          <>
            <label style={labelStyle}>Qual tem sido sua margem de lucro?</label>
            <p style={hintStyle}>💡 Faturamento sem margem não paga nada — o lucro mensal dividido pelo valor do programa define a real capacidade de pagamento.</p>
            <select value={answers.margem ?? ""} onChange={(e) => update({ margem: Number(e.target.value) })} style={inputStyle}>
              <option value="">Selecione a faixa…</option>
              {MARGEM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </>
        )}

        {currentKey === "divida" && (
          <>
            <label style={labelStyle}>Sobra isso mesmo no fim do mês ou tem endividamento?</label>
            <button style={choiceBtnStyle(answers.divida === "nao")} onClick={() => update({ divida: "nao" })}>✅ Sobra / Sem dívidas</button>
            <button style={choiceBtnStyle(answers.divida === "sim")} onClick={() => update({ divida: "sim" })}>⚠️ Tem endividamento</button>
          </>
        )}

        {currentKey === "fluxo" && (
          <>
            <label style={labelStyle}>Seu fluxo de caixa está positivo ou negativo?</label>
            <button style={choiceBtnStyle(answers.fluxo === "pos")} onClick={() => update({ fluxo: "pos" })}>📈 Positivo (lucro)</button>
            <button style={choiceBtnStyle(answers.fluxo === "neg")} onClick={() => update({ fluxo: "neg" })}>📉 Negativo (prejuízo)</button>
          </>
        )}

        {currentKey === "fundo" && (
          <>
            <label style={labelStyle}>Quanto você tem no seu fundo de reserva?</label>
            <p style={hintStyle}>Isso é preocupante — se não tiver fundo de reserva, o lead está a 1-2 meses ruins da falência.</p>
            <button style={choiceBtnStyle(answers.fundo === "sim")} onClick={() => update({ fundo: "sim" })}>✅ Sim, tem reserva</button>
            <button style={choiceBtnStyle(answers.fundo === "nao")} onClick={() => update({ fundo: "nao" })}>🚨 Não tem reserva</button>
          </>
        )}

        {currentKey === "desafio" && (
          <>
            <label style={labelStyle}>Qual o maior desafio em vendas e crescimento de alunos?</label>
            <p style={hintStyle}>💡 A necessidade é o coração da qualificação (Need do BANT).</p>
            <textarea
              value={answers.desafio ?? ""}
              onChange={(e) => update({ desafio: e.target.value })}
              placeholder="Ex: Muita evasão, pouca captação de novos alunos, não sabe precificar, equipe sem processo de vendas…"
              style={{ ...inputStyle, minHeight: 80 }}
            />
          </>
        )}

        {currentKey === "ancoragem" && (
          <>
            <label style={labelStyle}>Se eliminasse esse desafio, para quanto conseguiria aumentar? (opcional)</label>
            <select value={answers.fatEsperado ?? ""} onChange={(e) => update({ fatEsperado: Number(e.target.value) })} style={inputStyle}>
              <option value="">Faturamento esperado…</option>
              {FAT_ESPERADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select value={answers.margemEsperada ?? ""} onChange={(e) => update({ margemEsperada: Number(e.target.value) })} style={inputStyle}>
              <option value="">Margem esperada…</option>
              {MARGEM_ESPERADA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </>
        )}

        {currentKey === "dor" && (
          <>
            <label style={labelStyle}>Por que realmente quer sair dessa situação e crescer a empresa?</label>
            <p style={hintStyle}>💡 O verdadeiro &ldquo;porquê&rdquo; — descubra o motivo real por trás do objetivo.</p>
            <textarea
              value={answers.dor ?? ""}
              onChange={(e) => update({ dor: e.target.value })}
              placeholder="Ex: Quer provar para a família que conseguiu, quer viajar mais com os filhos…"
              style={{ ...inputStyle, minHeight: 80 }}
            />
          </>
        )}

        {currentKey === "decisor" && (
          <>
            <label style={labelStyle}>Quem toma a decisão de fechar?</label>
            <button style={choiceBtnStyle(answers.decisor === "unico")} onClick={() => update({ decisor: "unico" })}>✅ É o único decisor</button>
            <button style={choiceBtnStyle(answers.decisor === "outro")} onClick={() => update({ decisor: "outro" })}>👥 Precisa consultar alguém</button>
          </>
        )}

        {currentKey === "casado" && (
          <>
            <label style={labelStyle}>É casado?</label>
            <button style={choiceBtnStyle(answers.casado === "sim")} onClick={() => update({ casado: "sim" })}>💑 Sim, casado</button>
            <button style={choiceBtnStyle(answers.casado === "nao")} onClick={() => update({ casado: "nao" })}>🙋 Não / Solteiro</button>
          </>
        )}

        {currentKey === "conjuge" && (
          <>
            <label style={labelStyle}>O cônjuge vai participar da reunião?</label>
            <button style={choiceBtnStyle(answers.conjugeConfirmado === "sim")} onClick={() => update({ conjugeConfirmado: "sim" })}>✅ Cônjuge virá junto</button>
            <button style={choiceBtnStyle(answers.conjugeConfirmado === "nao")} onClick={() => update({ conjugeConfirmado: "nao" })}>⚠️ Cônjuge não virá</button>
          </>
        )}

        {currentKey === "decisor2" && (
          <>
            <label style={labelStyle}>O outro decisor confirmou presença na reunião?</label>
            <button style={choiceBtnStyle(answers.decisor2Confirmado === "sim")} onClick={() => update({ decisor2Confirmado: "sim" })}>✅ Confirmou que virá</button>
            <button style={choiceBtnStyle(answers.decisor2Confirmado === "nao")} onClick={() => update({ decisor2Confirmado: "nao" })}>⚠️ Não confirmou / &ldquo;Vejo depois&rdquo;</button>
          </>
        )}

        {currentKey === "urgencia" && (
          <>
            <label style={labelStyle}>Qual a urgência em resolver esse desafio?</label>
            <p style={hintStyle}>⚠️ Pergunta obrigatória — leads sem urgência declarada têm altíssima taxa de no-show.</p>
            <button style={choiceBtnStyle(answers.urgencia === "urgente")} onClick={() => update({ urgencia: "urgente" })}>🔥 Urgente — agora</button>
            <button style={choiceBtnStyle(answers.urgencia === "6meses")} onClick={() => update({ urgencia: "6meses" })}>📅 Próximos 6 meses</button>
            <button style={choiceBtnStyle(answers.urgencia === "1ano")} onClick={() => update({ urgencia: "1ano" })}>🕐 1 ano ou mais</button>
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            onClick={stepIndex === 0 ? onClose : back}
            style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}
          >
            {stepIndex === 0 ? "Cancelar" : "← Voltar"}
          </button>
          <button onClick={next} disabled={!canAdvance} className="btn-primary" style={{ flex: 1 }}>
            {stepIndex >= steps.length - 1 ? "Ver Diagnóstico Final →" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
