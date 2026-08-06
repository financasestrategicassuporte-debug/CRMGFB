"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Banner } from "../../banner";
import { QualifyWizard } from "./qualify-wizard";

type Deal = {
  id: string;
  person_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  pipeline: "quente" | "frio";
  stage: number;
  lost: boolean;
  lost_reason: string | null;
  paused: boolean;
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
type Task = {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  task_type: string;
  due_date: string | null;
  assignee?: { id: string; name: string } | null;
};
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
  { key: "company_name", label: "Nome da academia" },
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

const STAGE_NEGOCIACAO = 5;

const LOST_REASONS = [
  "Lead desqualificado",
  "Optou por não fechar o projeto",
  "Fechou com a concorrência",
  "Não consegui mais contato, pois sumiu",
];

const FIRST_SALE_PHRASE = "Parabéns pela venda, é só o começo!";

const SALE_PHRASES = [
  "VENDAAA! TROPA DE ELITE!",
  "VOCÊ É FODA, ORGULHO DE TER VOCÊ NA TROPA DE ELITE!",
  "É AQUELA COISA NÉ? SE NÃO TEM CÃO, CAÇA COM GATO! #PRACIMA VOCÊ É FODA.",
  "VENDAAA, TÁ DIFÍCIL? LIGA MAIS! VIU QUE DEU CERTO, TROPA DE ELITE!",
  "PARABÉNS PELA VENDA, OS SENHORES ESTÃO FAZENDO SEU COMANDANTE MUITO FELIZ!!",
  "SE CONTINUAR VENDENDO ASSIM, VAI MUDAR DE VIDA EM BREVE! VENDAAA",
  "ME DIZ, VAI COMPRAR PRIMEIRO UMA PORSCHE OU UMA BMW? #VAMOPRACIMA NESSA PORRA! VENDAA",
  "HOJE VOCÊ PROVOU PARA SI MESMO QUE TEM MAIS FOME DO QUE ONTEM, #PRACIMA! PARABÉNS.",
];

function pickCelebrationPhrase(saleNumber: number) {
  if (saleNumber <= 1) return FIRST_SALE_PHRASE;
  return SALE_PHRASES[Math.floor(Math.random() * SALE_PHRASES.length)];
}

function playSaleSound() {
  if (typeof window === "undefined") return;
  const url = window.localStorage.getItem("gymplus_sale_sound");
  if (!url) return;
  new Audio(url).play().catch(() => {});
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function taskStatusBadge(t: Task) {
  if (!t.due_date) return null;
  const late = new Date(t.due_date) < new Date();
  return late ? (
    <span className="badge badge-late">ATRASADA</span>
  ) : (
    <span className="badge" style={{ background: "#dbeafe", color: "#1d4ed8" }}>ABERTA EM DIA</span>
  );
}

const TASK_TYPE_ICON: Record<string, string> = {
  tarefa: "task_alt",
  ligacao: "call",
  reuniao: "groups",
  proposta: "description",
  followup: "person",
  whatsapp: "chat",
};

const TASK_TYPE_LABEL: Record<string, string> = {
  tarefa: "Tarefa",
  ligacao: "Ligação",
  reuniao: "Reunião",
  proposta: "Proposta",
  followup: "Follow-up",
  whatsapp: "Mensagem WhatsApp",
};

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [role, setRole] = useState("admin");
  const [profileName, setProfileName] = useState("");
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
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigned_to: "", task_type: "tarefa", due_date: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [showWonCelebration, setShowWonCelebration] = useState(false);
  const [celebration, setCelebration] = useState<{ phrase: string; saleNumber: number; monthRevenue: number; clientName: string } | null>(null);

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
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setRole(d.profile?.role ?? "admin");
      setProfileName(d.profile?.name ?? "");
    });
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

  async function confirmMarkLost(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lost: true, lost_reason: lostReason }),
    });
    setBusy(false);
    setShowLostForm(false);
    router.push("/crm");
  }

  async function resumeNegotiation() {
    if (!confirm("Retomar esta negociação? Ela volta para a etapa de Negociação/Proposta.")) return;
    setBusy(true);
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lost: false, lost_reason: null, stage: STAGE_NEGOCIACAO }),
    });
    setBusy(false);
    setShowWonCelebration(false);
    load();
  }

  async function togglePaused() {
    setBusy(true);
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: !deal?.paused }),
    });
    setBusy(false);
    load();
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
    const saleNumber = body.saleNumber ?? 1;
    setCelebration({
      phrase: pickCelebrationPhrase(saleNumber),
      saleNumber,
      monthRevenue: body.monthRevenue ?? 0,
      clientName: body.client?.name ?? deal?.person_name ?? "",
    });
    setShowWonCelebration(true);
    playSaleSound();
    load();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: taskForm.title,
      description: taskForm.description || undefined,
      assigned_to: taskForm.assigned_to || undefined,
      task_type: taskForm.task_type,
      due_date: taskForm.due_date || undefined,
    };
    if (editingTaskId) {
      await fetch(`/api/deals/${id}/tasks/${editingTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/deals/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setTaskForm({ title: "", description: "", assigned_to: "", task_type: "tarefa", due_date: "" });
    setEditingTaskId(null);
    setShowTaskForm(false);
    load();
  }

  function openEditTask(t: Task) {
    setEditingTaskId(t.id);
    setTaskForm({
      title: t.title,
      description: t.description ?? "",
      assigned_to: t.assignee?.id ?? "",
      task_type: t.task_type,
      due_date: toDatetimeLocal(t.due_date),
    });
    setShowTaskForm(true);
  }

  function openCreateTask() {
    setEditingTaskId(null);
    setTaskForm({ title: "", description: "", assigned_to: "", task_type: "tarefa", due_date: "" });
    setShowTaskForm(true);
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
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                {deal.company_name ? `${deal.company_name} – ${deal.person_name}` : deal.person_name}
              </h1>
              {deal.lost && <span className="badge badge-late">Perdida</span>}
              {!deal.lost && deal.paused && <span className="badge" style={{ background: "#fef3c7", color: "#b45309" }}>Pausada</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowQualify(true)} style={btnDark}>
              <span className="msym" style={{ fontSize: 16 }}>bolt</span> Qualificar SDR IA
            </button>
            {!deal.lost && deal.stage !== 6 && (
              <button onClick={togglePaused} disabled={busy} style={{ ...btnDark, background: deal.paused ? "var(--accent-darker)" : "var(--bg-dark)" }}>
                <span className="msym" style={{ fontSize: 16 }}>{deal.paused ? "play_circle" : "pause_circle"}</span>
                {deal.paused ? "Retomar" : "Pausar"}
              </button>
            )}
            {!deal.lost && deal.stage !== 6 && (
              <button onClick={() => setShowLostForm(true)} disabled={busy} style={btnOutlineDanger}>
                <span className="msym" style={{ fontSize: 16 }}>thumb_down</span> Marcar perda
              </button>
            )}
            {deal.stage !== 6 && (
              <button onClick={markWon} disabled={busy} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 16 }}>paid</span> Marcar venda
              </button>
            )}
            {(deal.lost || deal.stage === 6) && (
              <button onClick={resumeNegotiation} disabled={busy} style={btnDark}>
                <span className="msym" style={{ fontSize: 16 }}>undo</span> Retomar Negociação
              </button>
            )}
          </div>
        </div>

        {deal.lost && deal.lost_reason && (
          <p style={{ color: "var(--status-late-fg)", fontSize: 13, marginTop: -8, marginBottom: 12 }}>Motivo da perda: {deal.lost_reason}</p>
        )}

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
                <button onClick={openCreateTask} className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
                  + Criar tarefa
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {tasks.filter((t) => !t.done).map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: 10, gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span className="msym" style={{ fontSize: 18, color: "var(--text-faint)" }}>
                        {TASK_TYPE_ICON[t.task_type] ?? "task_alt"}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{TASK_TYPE_LABEL[t.task_type] ?? t.task_type}</div>
                        <div style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                        {t.assignee && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{t.assignee.name}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
                      <div style={{ textAlign: "right" }}>
                        {taskStatusBadge(t)}
                        {t.due_date && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>{fmtDateTime(t.due_date)}</div>}
                      </div>
                      <button onClick={() => openEditTask(t)} title="Editar" style={iconBtnStyle}>
                        <span className="msym" style={{ fontSize: 16 }}>edit</span>
                      </button>
                      <button onClick={() => openEditTask(t)} title="Reagendar" style={iconBtnStyle}>
                        <span className="msym" style={{ fontSize: 16 }}>schedule</span>
                      </button>
                      <button onClick={() => toggleTask(t)} title="Marcar como concluída" style={{ ...iconBtnStyle, background: "#dbeafe", color: "#1d4ed8" }}>
                        <span className="msym" style={{ fontSize: 16 }}>check</span>
                      </button>
                    </div>
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
                        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, marginTop: n.is_ai_generated ? 6 : 0 }}>{n.body}</div>
                        <div style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 4 }}>{fmtDateTime(n.created_at)}</div>
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
        <QualifyWizard
          dealId={id}
          personName={deal.person_name}
          sdrNome={deal.assignee?.name ?? profileName}
          pipeline={deal.pipeline}
          onClose={() => setShowQualify(false)}
          onSaved={load}
        />
      )}

      {showLostForm && (
        <div style={overlayStyle}>
          <form onSubmit={confirmMarkLost} className="card" style={{ width: 380, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Marcar negociação como perdida</h2>
              <button type="button" onClick={() => setShowLostForm(false)} style={{ border: "none", background: "none" }}>✕</button>
            </div>
            <label style={labelStyle}>Motivo da perda</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {LOST_REASONS.map((reason) => (
                <label key={reason} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                  <input type="radio" name="lost_reason" checked={lostReason === reason} onChange={() => setLostReason(reason)} />
                  {reason}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowLostForm(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
                Cancelar
              </button>
              <button type="submit" disabled={busy} style={{ flex: 1, ...btnOutlineDanger, justifyContent: "center" }}>
                Confirmar perda
              </button>
            </div>
          </form>
        </div>
      )}

      {showWonCelebration && celebration && (
        <div style={overlayStyle}>
          <div className="card" style={{ width: 420, background: "#fff", textAlign: "center", padding: 0, overflow: "hidden" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                padding: "32px 24px 20px",
                fontSize: 56,
                lineHeight: 1,
              }}
            >
              🏖️🌴🎉
            </div>
            <div style={{ padding: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginTop: 0, marginBottom: 10 }}>{celebration.phrase}</h2>
              <p style={{ fontSize: 13.5, color: "var(--text-faint)", marginBottom: 20 }}>
                Parabéns! Essa é a {celebration.saleNumber}ª venda no mês. Até agora vocês já venderam{" "}
                <strong style={{ color: "var(--text)" }}>{fmtBRL(celebration.monthRevenue)}</strong> nesse período.
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => router.push("/produtos")}
                  style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11, fontSize: 13, fontWeight: 700 }}
                >
                  Abrir relatório de painel
                </button>
                <button
                  onClick={() => router.push("/crm")}
                  className="btn-primary"
                  style={{ flex: 1, fontSize: 13 }}
                >
                  Ir para negociações
                </button>
              </div>
              <button
                onClick={resumeNegotiation}
                disabled={busy}
                style={{ width: "100%", border: "none", background: "none", color: "var(--text-faint)", fontSize: 12.5, fontWeight: 700, padding: 6 }}
              >
                <span className="msym" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4 }}>undo</span>
                Retomar Negociação (caso a venda tenha sido pedida)
              </button>
              <label style={{ display: "block", marginTop: 10, fontSize: 11, color: "var(--text-faint)", cursor: "pointer" }}>
                🔊 Configurar som da comemoração
                <input
                  type="file"
                  accept="audio/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") window.localStorage.setItem("gymplus_sale_sound", reader.result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {showTaskForm && (
        <div style={overlayStyle}>
          <form onSubmit={createTask} className="card" style={{ width: 380, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>{editingTaskId ? "Editar Tarefa" : "Criar Tarefa"}</h2>
              <button type="button" onClick={() => { setShowTaskForm(false); setEditingTaskId(null); }} style={{ border: "none", background: "none" }}>✕</button>
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
            <select value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })} style={inputStyle}>
              <option value="tarefa">Tarefa</option>
              <option value="ligacao">Ligação</option>
              <option value="reuniao">Reunião</option>
              <option value="proposta">Proposta</option>
              <option value="followup">Follow-up</option>
            </select>
            <label style={labelStyle}>Data/hora de vencimento</label>
            <input
              type="datetime-local"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              style={{ ...inputStyle, marginBottom: 18 }}
            />
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>{editingTaskId ? "Salvar tarefa" : "Criar tarefa"}</button>
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

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "#fff",
  color: "var(--text-faint)",
  padding: 0,
};

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
