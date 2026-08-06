"use client";

import { useEffect, useState } from "react";
import {
  computeQualification,
  buildQualificationNote,
  buildEncerrarNote,
  type SdrQualificationInput,
  type SdrQualificationResult,
} from "@/lib/sdrQualification";

type Props = {
  dealId: string;
  personName: string;
  sdrNome: string;
  pipeline: "quente" | "frio";
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
  const steps = ["saudacao", "objetivo", "autoridade", "negocio", "faturamento", "margem", "divida"];
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
      return !!a.fatEsperado && !!a.margemEsperada;
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

const scriptBoxStyle: React.CSSProperties = {
  background: "#f0fdf4",
  border: "1px solid var(--accent)",
  borderRadius: 10,
  padding: 12,
  marginBottom: 10,
};

function ScriptBlock({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={scriptBoxStyle}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--accent-darker)", marginBottom: 6, letterSpacing: 0.3 }}>
        🎙 {label ?? "FALE ISSO"}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-line" }}>{children}</div>
    </div>
  );
}

export function QualifyWizard({ dealId, personName, sdrNome, pipeline, onClose, onSaved }: Props) {
  // A origem do lead já é conhecida pelo funil da negociação (Quente/Frio),
  // então não perguntamos de novo aqui — só usamos o mesmo valor que a
  // fórmula de qualificação (computeQualification) sempre esperou.
  const [answers, setAnswers] = useState<Answers>({ origem: pipeline === "quente" ? "quente" : "frio_ate40k" });
  const [conheceGfb, setConheceGfb] = useState<"sim" | "nao" | null>(null);
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
      setSaved(false);
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

  // Salva o diagnóstico sozinho assim que a entrevista termina — sem
  // esperar clique em "Salvar", pra `deal.qualification` já refletir no
  // indicador "Leads qualificados" do dashboard (computeFunnel) mesmo se
  // o SDR só fechar o wizard depois de ler o resultado.
  useEffect(() => {
    if (showResult && !saving && !saved) {
      save();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult]);

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
  };

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

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, fontSize: 12, fontWeight: 700, color: saved ? "var(--accent-darker)" : "var(--text-faint)" }}>
            <span className="msym" style={{ fontSize: 15 }}>{saved ? "check_circle" : "sync"}</span>
            {saved ? "Salvo automaticamente nas anotações" : "Salvando automaticamente nas anotações…"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={back} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
              ← Voltar
            </button>
            <button onClick={onClose} className="btn-primary" style={{ flex: 1 }}>
              Concluir
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

        {currentKey === "saudacao" && (
          <>
            <label style={labelStyle}>Passo 1.1 — Saudação Inicial · ⏱ 30 segundos</label>
            <ScriptBlock>
              {`${personName}?\n\nAqui é o [Seu nome]. Como você está? Tudo bem?\n\nVamos começar a nossa entrevista, então. Será uma conversa bem rápida.`}
            </ScriptBlock>
            <p style={hintStyle}>💡 Início de conversa cordial e objetivo, já dando uma prévia de tempo que a conversa vai demorar. Tom confiante e animado.</p>
          </>
        )}

        {currentKey === "objetivo" && (
          <>
            <label style={labelStyle}>Passo 1.2 — Objetivo da Ligação · ⏱ ~1 minuto</label>
            <ScriptBlock>
              {`O objetivo dessa ligação é entender melhor o seu negócio e o seu desafio e analisarmos juntos se você tem o perfil de empresa que eu estou buscando para receber 1 hora de consultoria gratuita.\n\nSe eu entender que você tem o perfil, eu vou passar você para a próxima fase do nosso processo, que é uma reunião de 1 hora em vídeo-conferência com nosso especialista para te ajudar — e caso seja viável, que não é o foco inicial, apresentaremos uma solução.`}
            </ScriptBlock>
          </>
        )}

        {currentKey === "autoridade" && (
          <>
            <label style={labelStyle}>Passo 1.3 — Gerar Autoridade · ⏱ ~1 minuto</label>
            <ScriptBlock label="PERGUNTA PRIMEIRO">Você já conhece o Eduardo Lustosa, Ultra Academia ou Gestão Fitness Brasil?</ScriptBlock>
            <button style={choiceBtnStyle(conheceGfb === "sim")} onClick={() => setConheceGfb("sim")}>✅ Sim, conhece</button>
            <button style={choiceBtnStyle(conheceGfb === "nao")} onClick={() => setConheceGfb("nao")}>❌ Não conhece</button>
            {conheceGfb === "nao" && (
              <ScriptBlock label="SE NÃO CONHECE — FALE ISSO">
                {`Ok. Deixe eu me apresentar brevemente para você entender o que a gente faz.\n\nEu sou o consultor de relacionamento aqui da Gestão Fitness Brasil do time do Eduardo Lustosa. Nós saímos de 300 para +7.000 alunos e hoje ensinamos academias de todo o Brasil como aplicar exatamente essa metodologia. O próprio Eduardo que fundou é parceiro oficial do Sebrae, possui vários prêmios empresariais, é um dos principais responsáveis pela expansão da Rede Ultra Academia em todo o Brasil. Nós já ajudamos mais de 1.000 empresários nesses últimos anos.\n\nO Eduardo tem bom relacionamento com Conrado Adolpho, Alfredo Soares da G4 e está no grupo da MLS fundado por Flávio Augusto, Joel Jota e Caio Carneiro.`}
              </ScriptBlock>
            )}
            {conheceGfb === "sim" && (
              <ScriptBlock label="SE JÁ CONHECE — FALE ISSO">Que ótimo! Então você já sabe um pouco do que a gente faz. Vamos em frente com a entrevista!</ScriptBlock>
            )}
          </>
        )}

        {currentKey === "negocio" && (
          <>
            <label style={labelStyle}>Passo 1.4 — Qualificação · ⏱ Parte 1 das perguntas de qualificação</label>
            <ScriptBlock>Me fala um pouco do seu negócio.</ScriptBlock>
            <p style={hintStyle}>💡 Pergunta aberta de situação para entender o contexto da empresa. Deixe o lead falar. Anote os pontos que puder (nº de alunos, funcionários, unidades) para o diagnóstico ficar mais preciso.</p>
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
            <label style={labelStyle}>Passo 1.4 — BANT · Budget · ⏱ B de BANT — Orçamento disponível</label>
            <ScriptBlock>Qual o faturamento médio mensal da sua empresa?</ScriptBlock>
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
            <label style={labelStyle}>Passo 1.4 — BANT · Budget · ⏱ Capacidade de pagamento real</label>
            <ScriptBlock>Qual tem sido sua margem de lucro? Em média, quanto sobra de lucro líquido do que você fatura?</ScriptBlock>
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
            <label style={labelStyle}>Passo 1.4 — BANT · Budget · ⏱ Ponto crítico de qualificação</label>
            <ScriptBlock>Sobra isso mesmo no fim do mês ou tem endividamento?</ScriptBlock>
            <button style={choiceBtnStyle(answers.divida === "nao")} onClick={() => update({ divida: "nao" })}>✅ Sobra / Sem dívidas</button>
            <button style={choiceBtnStyle(answers.divida === "sim")} onClick={() => update({ divida: "sim" })}>⚠️ Tem endividamento</button>
          </>
        )}

        {currentKey === "fluxo" && (
          <>
            <ScriptBlock label="SE TEM ENDIVIDAMENTO — FALE ISSO">Mas seu fluxo de caixa está positivo ou negativo? Quer dizer, você está tendo lucro ou prejuízo no mês a mês?</ScriptBlock>
            <button style={choiceBtnStyle(answers.fluxo === "pos")} onClick={() => update({ fluxo: "pos" })}>📈 Positivo (lucro)</button>
            <button style={choiceBtnStyle(answers.fluxo === "neg")} onClick={() => update({ fluxo: "neg" })}>📉 Negativo (prejuízo)</button>
          </>
        )}

        {currentKey === "fundo" && (
          <>
            <ScriptBlock label="SE FLUXO NEGATIVO — FALE ISSO">
              {"Isso é preocupante. Quanto você tem no seu fundo de reserva?\n\n(Se não tiver fundo de reserva:) Você tem consciência de que você está a 1 a 2 meses ruins da falência?"}
            </ScriptBlock>
            <button style={choiceBtnStyle(answers.fundo === "sim")} onClick={() => update({ fundo: "sim" })}>✅ Sim, tem reserva</button>
            <button style={choiceBtnStyle(answers.fundo === "nao")} onClick={() => update({ fundo: "nao" })}>🚨 Não tem reserva</button>
            {answers.fundo === "nao" && (
              <p style={{ ...hintStyle, color: "var(--status-late-fg)", fontWeight: 700 }}>
                Esse candidato não tem perfil para o programa neste momento. Avance para ver o script de encerramento.
              </p>
            )}
          </>
        )}

        {currentKey === "desafio" && (
          <>
            <label style={labelStyle}>Passo 1.4 — BANT · Need · ⏱ N de BANT — Necessidade real</label>
            <ScriptBlock>Hoje, qual você considera que é o seu maior desafio em vendas e crescimento de alunos que está impedindo sua empresa de crescer?</ScriptBlock>
            <p style={hintStyle}>💡 A necessidade é o coração da qualificação. O desafio do lead precisa ser algo que o programa resolve.</p>
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
            <label style={labelStyle}>Passo 1.4 — Qualificação · ⏱ Gera o número que será usado na venda</label>
            <ScriptBlock>Se você eliminasse esse desafio, a quanto você acha que conseguiria aumentar de margem e para qual faturamento?</ScriptBlock>
            <p style={hintStyle}>💡 Esse número define a meta e você poderá usar para ancorar o quão barata sairá a mentoria frente ao resultado.</p>
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
            <label style={labelStyle}>Passo 1.4 — Qualificação · ⏱ O verdadeiro &ldquo;porquê&rdquo;</label>
            <ScriptBlock>Me explica porque realmente que você quer sair da sua situação atual e quer crescer a sua empresa?</ScriptBlock>
            <p style={hintStyle}>💡 O objetivo é descobrir o verdadeiro motivo pelo qual o candidato quer aumentar o resultado.</p>
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
            <label style={labelStyle}>Passo 1.6 — BANT · Authority · ⏱ A de BANT — Autoridade de decisão</label>
            <ScriptBlock>
              Deixa eu te perguntar: caso no final dessa 1 hora de consultoria gratuita nós apresentássemos uma
              solução — e não quer dizer que vamos — você teria condições de tomar a decisão sozinho ou
              precisaria consultar mais alguém?
            </ScriptBlock>
            <p style={hintStyle}>💡 Nosso time só realiza uma única reunião. É fundamental que TODOS os decisores estejam presentes.</p>
            <button style={choiceBtnStyle(answers.decisor === "unico")} onClick={() => update({ decisor: "unico" })}>✅ É o único decisor</button>
            <button style={choiceBtnStyle(answers.decisor === "outro")} onClick={() => update({ decisor: "outro" })}>👥 Precisa consultar alguém</button>
          </>
        )}

        {currentKey === "casado" && (
          <>
            <ScriptBlock label="SE ÚNICO DECISOR — FALE ISSO">
              Você é casado? Será que não seria importante sua esposa participar? Principalmente para ela
              entender as estratégias que serão apresentadas.
            </ScriptBlock>
            <button style={choiceBtnStyle(answers.casado === "sim")} onClick={() => update({ casado: "sim" })}>💑 Sim, casado</button>
            <button style={choiceBtnStyle(answers.casado === "nao")} onClick={() => update({ casado: "nao" })}>🙋 Não / Solteiro</button>
          </>
        )}

        {currentKey === "conjuge" && (
          <>
            <label style={labelStyle}>O cônjuge vai participar da reunião?</label>
            <p style={hintStyle}>Reforce que é importante trazer o cônjuge. Se não for possível, avise o closer para trabalhar isso na reunião — risco de decisão bloqueada.</p>
            <button style={choiceBtnStyle(answers.conjugeConfirmado === "sim")} onClick={() => update({ conjugeConfirmado: "sim" })}>✅ Cônjuge virá junto</button>
            <button style={choiceBtnStyle(answers.conjugeConfirmado === "nao")} onClick={() => update({ conjugeConfirmado: "nao" })}>⚠️ Cônjuge não virá</button>
          </>
        )}

        {currentKey === "decisor2" && (
          <>
            <ScriptBlock label="SE PRECISA CONSULTAR — FALE ISSO">
              Então é muito importante que essa pessoa esteja na nossa reunião, tudo bem? Vou mandar alguns
              horários para vocês combinarem juntos.
            </ScriptBlock>
            <p style={hintStyle}>Uma reunião sem todos os decisores é uma reunião perdida. Insista ou marque para quando puderem vir juntos — NÃO agendar sem confirmar o segundo decisor.</p>
            <button style={choiceBtnStyle(answers.decisor2Confirmado === "sim")} onClick={() => update({ decisor2Confirmado: "sim" })}>✅ Confirmou que virá</button>
            <button style={choiceBtnStyle(answers.decisor2Confirmado === "nao")} onClick={() => update({ decisor2Confirmado: "nao" })}>⚠️ Não confirmou / &ldquo;Vejo depois&rdquo;</button>
          </>
        )}

        {currentKey === "urgencia" && (
          <>
            <label style={labelStyle}>Passo 1.7 — BANT · Timeline · ⏱ T de BANT — Prazo de decisão</label>
            <ScriptBlock>
              Deixa eu te fazer uma última pergunta antes de fecharmos. Qual é a sua urgência em resolver esse
              desafio que você me descreveu? Quer resolver isso agora com urgência, está pensando em fazer isso
              nos próximos 6 meses, ou daqui a 1 ano ou mais?
            </ScriptBlock>
            <p style={hintStyle}>⚠️ Pergunta obrigatória — leads sem urgência declarada têm altíssima taxa de no-show.</p>
            <button style={choiceBtnStyle(answers.urgencia === "urgente")} onClick={() => update({ urgencia: "urgente" })}>🔥 Urgente — agora</button>
            <button style={choiceBtnStyle(answers.urgencia === "6meses")} onClick={() => update({ urgencia: "6meses" })}>📅 Próximos 6 meses</button>
            <button style={choiceBtnStyle(answers.urgencia === "1ano")} onClick={() => update({ urgencia: "1ano" })}>🕐 1 ano ou mais</button>

            {answers.urgencia === "6meses" && (
              <ScriptBlock label="SE 6 MESES — FALE ISSO">
                Entendo. Mas deixa eu te perguntar: o que você acha que vai mudar daqui 6 meses que não está
                acontecendo agora? O que está te impedindo de agir agora?
              </ScriptBlock>
            )}
            {answers.urgencia === "1ano" && (
              <ScriptBlock label="SE 1 ANO OU MAIS — FALE ISSO">
                {`Tudo bem, eu entendo. Mas me diz uma coisa: você me disse que o seu maior desafio é ${
                  answers.desafio ? `"${answers.desafio}"` : "[repita o desafio que ele descreveu]"
                }. Se você não resolver isso, o que acontece daqui um ano?`}
              </ScriptBlock>
            )}
            {answers.urgencia === "urgente" && (
              <ScriptBlock label="SE URGENTE — FALE ISSO">
                Ótimo! Isso é exatamente o perfil que estou buscando — alguém que quer resolver de verdade e não
                fica adiando.
              </ScriptBlock>
            )}
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
