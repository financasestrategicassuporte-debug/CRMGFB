"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Banner } from "../../banner";

type Deal = {
  id: string;
  person_name: string;
  phone: string | null;
  email: string | null;
  pipeline: "quente" | "frio";
  stage: number;
  lost: boolean;
  value: number | null;
  revenue: number | null;
  ticket: number | null;
  qualification: number | null;
  forecast: string | null;
  source: string | null;
  campaign: string | null;
  objective: string | null;
  students_count: number | null;
  preferred_time: string | null;
  created_at: string;
  assignee?: { id: string; name: string; initials: string | null } | null;
};

type Note = { id: string; body: string; created_at: string; is_ai_generated: boolean };
type Task = { id: string; title: string; description: string | null; done: boolean; task_type: string; due_date: string | null; assignee?: { name: string } | null };
type TeamMember = { id: string; name: string };

const STAGES = [
  "Sem Contato / Leads",
  "Contato Feito",
  "Reunião Agendada",
  "Remarcar Reunião",
  "Entrar em Contato",
  "Em Negociação / Proposta",
  "Acompanhamento",
];

const EDIT_FIELDS: { key: keyof Deal; label: string; type?: string }[] = [
  { key: "qualification", label: "Qualificação", type: "number" },
  { key: "forecast", label: "Previsão de fechamento" },
  { key: "source", label: "Fonte" },
  { key: "campaign", label: "Campanha" },
  { key: "value", label: "Valor total", type: "number" },
  { key: "objective", label: "Objetivo" },
  { key: "students_count", label: "Nº de Alunos", type: "number" },
  { key: "ticket", label: "Ticket Médio", type: "number" },
  { key: "revenue", label: "Faturamento", type: "number" },
  { key: "preferred_time", label: "Horário da reunião" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
];

const HISTORY_TABS = ["Histórico", "Tarefas", "E-mail", "Questionários", "Produtos", "Arquivos", "Propostas"];

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState("admin");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [historyTab, setHistoryTab] = useState("Histórico");
  const [noteText, setNoteText] = useState("");
  const [showQualify, setShowQualify] = useState(false);
  const [qualifyForm, setQualifyForm] = useState({ students_count: "", revenue: "", pain_level: 3, urgency: 3, uses_software: false });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigned_to: "", task_type: "tarefa" });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [dealRes, tasksRes] = await Promise.all([fetch(`/api/deals/${id}`), fetch(`/api/deals/${id}/tasks`)]);
    const dealData = await dealRes.json();
    const tasksData = await tasksRes.json();
    setDeal(dealData.deal);
    setNotes(dealData.deal?.notes ?? []);
    setTasks(tasksData.tasks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setRole(d.profile?.role ?? "admin"));
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(d.team ?? []));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function moveToStage(stage: number) {
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    load();
  }

  function startEdit() {
    if (!deal) return;
    const values: Record<string, string> = {};
    for (const f of EDIT_FIELDS) values[f.key] = deal[f.key] != null ? String(deal[f.key]) : "";
    setEditValues(values);
    setEditing(true);
  }

  async function saveEdit() {
    const payload: Record<string, unknown> = {};
    for (const f of EDIT_FIELDS) {
      const raw = editValues[f.key];
      payload[f.key] = f.type === "number" ? (raw ? Number(raw) : null) : raw || null;
    }
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEditing(false);
    load();
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await fetch(`/api/deals/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setNoteText("");
    load();
  }

  async function submitQualify(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/deals/${id}/qualify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        students_count: Number(qualifyForm.students_count) || 0,
        revenue: Number(qualifyForm.revenue) || 0,
        pain_level: qualifyForm.pain_level,
        urgency: qualifyForm.urgency,
        uses_software: qualifyForm.uses_software,
      }),
    });
    setShowQualify(false);
    setQualifyForm({ students_count: "", revenue: "", pain_level: 3, urgency: 3, uses_software: false });
    load();
  }

  async function markLost() {
    if (!confirm("Marcar esta negociação como perdida?")) return;
    setBusy(true);
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lost: true }),
    });
    setBusy(false);
    router.push("/crm");
  }

  async function markWon() {
    setBusy(true);
    const res = await fetch(`/api/deals/${id}/close`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(body.error ?? "Não foi possível fechar a negociação.");
      return;
    }
    setMessage(`Venda registrada! Cliente "${body.client.name}" criado.`);
    load();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/deals/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskForm.title,
        description: taskForm.description || undefined,
        assigned_to: taskForm.assigned_to || undefined,
        task_type: taskForm.task_type,
      }),
    });
    setTaskForm({ title: "", description: "", assigned_to: "", task_type: "tarefa" });
    setShowTaskForm(false);
    load();
  }

  async function toggleTask(task: Task) {
    await fetch(`/api/deals/${id}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    load();
  }

  if (loading || !deal) {
    return (
      <div>
        <Banner title="Meu CRM" subtitle="Carregando negociação…" icon="contacts" role={role} />
        <div style={{ padding: 32 }}>Carregando…</div>
      </div>
    );
  }

  const checklist = [
    { label: "Lead contatado", done: deal.stage >= 1 },
    { label: "Qualificação preenchida", done: deal.qualification != null },
    { label: "Reunião agendada", done: deal.stage >= 2 },
    { label: "Proposta enviada", done: deal.stage >= 5 },
    { label: "Decisão do lead registrada", done: deal.stage === 6 || deal.lost },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;

  return (
    <div>
      <Banner title="Meu CRM" subtitle="Seus leads distribuídos, do primeiro contato ao agendamento" icon="contacts" role={role} />
      <div style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/crm")} style={{ border: "1px solid var(--border)", borderRadius: 8, background: "#fff", width: 34, height: 34 }}>
              ←
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{deal.person_name}</h1>
              {deal.lost && <span className="badge badge-late">Perdida</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowQualify(true)} style={btnDark}>
              <span className="msym" style={{ fontSize: 16 }}>bolt</span> Qualificar SDR IA
            </button>
            {!deal.lost && deal.stage !== 6 && (
              <button onClick={markLost} disabled={busy} style={btnOutlineDanger}>
                <span className="msym" style={{ fontSize: 16 }}>thumb_down</span> Marcar perda
              </button>
            )}
            {deal.stage !== 6 && (
              <button onClick={markWon} disabled={busy} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 16 }}>paid</span> Marcar venda
              </button>
            )}
          </div>
        </div>

        {message && <p style={{ color: "var(--accent-darker)", fontSize: 13, marginBottom: 12 }}>{message}</p>}

        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {STAGES.map((label, i) => (
            <button
              key={label}
              onClick={() => moveToStage(i)}
              style={{
                flex: "0 0 auto",
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                fontSize: 12,
                fontWeight: 700,
                background: i === deal.stage ? "var(--accent)" : "#fff",
                color: i === deal.stage ? "#06140d" : "var(--text-faint)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Negociação</h2>
              {editing ? (
                <button onClick={saveEdit} style={{ border: "none", background: "none", color: "var(--accent-darker)", fontWeight: 700, fontSize: 13 }}>
                  Salvar
                </button>
              ) : (
                <button onClick={startEdit} style={{ border: "none", background: "none", color: "var(--accent-darker)", fontWeight: 700, fontSize: 13 }}>
                  ✎ Editar
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EDIT_FIELDS.map((f) => (
                <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, gap: 8 }}>
                  <span style={{ color: "var(--text-faint)" }}>{f.label}</span>
                  {editing ? (
                    <input
                      type={f.type ?? "text"}
                      value={editValues[f.key] ?? ""}
                      onChange={(e) => setEditValues({ ...editValues, [f.key]: e.target.value })}
                      style={{ width: 130, border: "1px solid var(--border)", borderRadius: 6, padding: "4px 6px", fontSize: 12 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, textAlign: "right" }}>{deal[f.key] != null ? String(deal[f.key]) : "—"}</span>
                  )}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-faint)" }}>Criada em</span>
                <span style={{ fontWeight: 600 }}>{fmtDateTime(deal.created_at)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Próximas tarefas</h2>
                <button onClick={() => setShowTaskForm(true)} className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
                  + Criar tarefa
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {tasks.filter((t) => !t.done).map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{t.description}</div>}
                      </div>
                    </div>
                    {t.assignee && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{t.assignee.name}</span>}
                  </div>
                ))}
                {tasks.filter((t) => !t.done).length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nenhuma tarefa pendente.</p>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}>Checklist da negociação</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{checklistDone}/{checklist.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {checklist.map((c) => (
                  <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span className="msym" style={{ fontSize: 18, color: c.done ? "var(--accent)" : "var(--border)" }}>
                      {c.done ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ display: "flex", gap: 14, borderBottom: "1px solid var(--border)", marginBottom: 12, overflowX: "auto" }}>
                {HISTORY_TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setHistoryTab(t)}
                    style={{
                      border: "none",
                      background: "none",
                      padding: "0 0 10px",
                      fontSize: 13,
                      fontWeight: 700,
                      color: historyTab === t ? "var(--accent-darker)" : "var(--text-faint)",
                      borderBottom: historyTab === t ? "2px solid var(--accent)" : "2px solid transparent",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {historyTab === "Histórico" && (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Criar anotação…"
                      style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 13 }}
                    />
                    <button onClick={addNote} className="btn-primary" style={{ padding: "6px 14px" }}>
                      + Criar anotação
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {notes.map((n) => (
                      <div key={n.id} style={{ fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        {n.is_ai_generated && <span className="badge badge-ok" style={{ marginRight: 6 }}>IA</span>}
                        {n.body}
                        <div style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 2 }}>{fmtDateTime(n.created_at)}</div>
                      </div>
                    ))}
                    {notes.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nenhum evento ainda.</p>}
                  </div>
                </>
              )}

              {historyTab === "Tarefas" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tasks.map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} />
                        <span style={{ fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-faint)" : "var(--text)" }}>
                          {t.title}
                        </span>
                      </div>
                      <span className="badge badge-ok">{t.task_type}</span>
                    </div>
                  ))}
                  {tasks.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nenhuma tarefa criada ainda.</p>}
                </div>
              )}

              {!["Histórico", "Tarefas"].includes(historyTab) && (
                <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Em breve.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showQualify && (
        <div style={overlayStyle}>
          <form onSubmit={submitQualify} className="card" style={{ width: 380, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Qualificar — {deal.person_name}</h2>
            <label style={labelStyle}>Quantidade de alunos</label>
            <input required type="number" value={qualifyForm.students_count} onChange={(e) => setQualifyForm({ ...qualifyForm, students_count: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Faturamento mensal (R$)</label>
            <input required type="number" value={qualifyForm.revenue} onChange={(e) => setQualifyForm({ ...qualifyForm, revenue: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Dor (1-5)</label>
            <input type="range" min={1} max={5} value={qualifyForm.pain_level} onChange={(e) => setQualifyForm({ ...qualifyForm, pain_level: Number(e.target.value) })} style={{ width: "100%" }} />
            <label style={labelStyle}>Urgência (1-5)</label>
            <input type="range" min={1} max={5} value={qualifyForm.urgency} onChange={(e) => setQualifyForm({ ...qualifyForm, urgency: Number(e.target.value) })} style={{ width: "100%" }} />
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={qualifyForm.uses_software} onChange={(e) => setQualifyForm({ ...qualifyForm, uses_software: e.target.checked })} />
              Já usa CRM/ferramenta hoje
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button type="button" onClick={() => setShowQualify(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
                Voltar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Gerar diagnóstico
              </button>
            </div>
          </form>
        </div>
      )}

      {showTaskForm && (
        <div style={overlayStyle}>
          <form onSubmit={createTask} className="card" style={{ width: 380, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Criar Tarefa</h2>
              <button type="button" onClick={() => setShowTaskForm(false)} style={{ border: "none", background: "none" }}>✕</button>
            </div>
            <label style={labelStyle}>Negociação</label>
            <input value={deal.person_name} disabled style={{ ...inputStyle, background: "var(--surface-muted)" }} />
            <label style={labelStyle}>Assunto da tarefa</label>
            <input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Descrição da tarefa</label>
            <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            <label style={labelStyle}>Responsável</label>
            <select value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })} style={inputStyle}>
              <option value="">Selecione…</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <label style={labelStyle}>Tipo de tarefa</label>
            <select value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })} style={{ ...inputStyle, marginBottom: 18 }}>
              <option value="tarefa">Tarefa</option>
              <option value="ligacao">Ligação</option>
              <option value="reuniao">Reunião</option>
              <option value="proposta">Proposta</option>
              <option value="followup">Follow-up</option>
            </select>
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>Criar tarefa</button>
          </form>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
};

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6, marginTop: 10 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  marginBottom: 6,
};

const btnDark: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--bg-dark)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
};

const btnOutlineDanger: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#fff",
  color: "var(--status-late-fg)",
  border: "1px solid var(--status-late-fg)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 700,
};
