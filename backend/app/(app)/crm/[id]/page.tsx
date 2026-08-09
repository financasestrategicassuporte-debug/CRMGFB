"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Banner } from "../../banner";
import { QualifyWizard } from "./qualify-wizard";
import { useCall } from "../../call/call-context";
import { LOST_REASONS } from "@/lib/lostReasons";

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
type TeamMember = { id: string; name: string; role?: string };
type Plan = { id: string; name: string; active: boolean };

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

/** Atrasada e "pra hoje" primeiro — sem due_date vai pro final, já que
 * não tem urgência definida pra comparar. */
function sortByUrgency(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
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
  const searchParams = useSearchParams();
  const call = useCall();
  const [role, setRole] = useState("admin");
  const [profileName, setProfileName] = useState("");
  const [deal, setDeal] = useState<Deal | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [historyTab, setHistoryTab] = useState("Histórico");
  const [noteText, setNoteText] = useState("");
  const [showQualify, setShowQualify] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigned_to: "", task_type: "tarefa", due_date: "" });
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostReason, setLostReason] = useState(LOST_REASONS[0]);
  const [showWonCelebration, setShowWonCelebration] = useState(false);
  const [celebration, setCelebration] = useState<{ phrase: string; saleNumber: number; monthRevenue: number; clientName: string } | null>(null);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [saleProductId, setSaleProductId] = useState("");
  const [saleValor, setSaleValor] = useState("");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const [dealRes, tasksRes] = await Promise.all([fetch(`/api/deals/${id}`), fetch(`/api/deals/${id}/tasks`)]);
    const dealData = await dealRes.json();
    const tasksData = await tasksRes.json();
    setDeal(dealData.deal);
    setNotes([...(dealData.deal?.notes ?? [])].sort((a: Note, b: Note) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setTasks(tasksData.tasks ?? []);
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setRole(d.profile?.role ?? "admin");
      setProfileName(d.profile?.name ?? "");
    });
    fetch("/api/team").then((r) => r.json()).then((d) => setTeam(d.team ?? []));
    fetch("/api/plans").then((r) => r.json()).then((d) => setPlans((d.plans ?? []).filter((p: Plan) => p.active)));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // O widget de Ligação Massiva manda o SDR direto pra cá depois do
  // script ("Sim"/"Me liga depois" → ?qualify=1, "Não" → ?lost=1&reason=…)
  // — abre a tela certa sozinho em vez de deixar o SDR procurar o botão.
  useEffect(() => {
    if (loading || !deal) return;
    if (searchParams.get("qualify") === "1") {
      setShowQualify(true);
      router.replace(`/crm/${id}`);
    } else if (searchParams.get("lost") === "1") {
      const reason = searchParams.get("reason");
      if (reason && LOST_REASONS.includes(reason)) setLostReason(reason);
      setShowLostForm(true);
      router.replace(`/crm/${id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, deal, searchParams]);

  // Rascunho de tarefa nova salvo local — se a aba fechar sozinha, a
  // internet cair no meio do "Criar tarefa" ou o SDR sair sem querer, o
  // que foi digitado não se perde: reabrindo "Criar tarefa" pra essa
  // mesma negociação, os campos voltam preenchidos. Edição de tarefa
  // existente não usa isso (já é dado real salvo no banco).
  useEffect(() => {
    if (!showTaskForm || editingTaskId) return;
    try {
      window.localStorage.setItem(`gymplus_task_draft_${id}`, JSON.stringify(taskForm));
    } catch {
      // localStorage indisponível (modo privado etc.) — sem rascunho, sem quebrar o form
    }
  }, [taskForm, showTaskForm, editingTaskId, id]);

  async function moveToStage(stage: number) {
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    load(true);
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
    load(true);
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await fetch(`/api/deals/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setNoteText("");
    load(true);
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
    load(true);
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
    load(true);
  }

  function openSaleForm() {
    setSaleProductId("");
    setSaleValor("");
    setShowSaleForm(true);
  }

  async function confirmSale(e: React.FormEvent) {
    e.preventDefault();
    const valorNumber = Number(saleValor);
    if (!saleProductId || !valorNumber || valorNumber <= 0) return;
    setBusy(true);
    await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: saleProductId, revenue: valorNumber }),
    });
    setShowSaleForm(false);
    await markWon();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (taskForm.task_type === "reuniao" && !taskForm.assigned_to) {
      setTaskFormError("Selecione o closer responsável pela reunião antes de salvar.");
      return;
    }
    const payload = {
      title: taskForm.title,
      description: taskForm.description || undefined,
      assigned_to: taskForm.assigned_to || undefined,
      task_type: taskForm.task_type,
      due_date: taskForm.due_date || undefined,
    };
    const res = editingTaskId
      ? await fetch(`/api/deals/${id}/tasks/${editingTaskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/deals/${id}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      // Não fecha nem limpa o form — os dados digitados continuam ali
      // (e o rascunho continua salvo local) pro SDR tentar de novo.
      setTaskFormError("Não foi possível salvar a tarefa agora. Seus dados continuam aqui — tente de novo.");
      return;
    }
    try {
      window.localStorage.removeItem(`gymplus_task_draft_${id}`);
    } catch {
      // localStorage indisponível — sem problema, já salvou no banco
    }
    setTaskForm({ title: "", description: "", assigned_to: "", task_type: "tarefa", due_date: "" });
    setTaskFormError(null);
    setEditingTaskId(null);
    setShowTaskForm(false);
    load(true);
  }

  function handleCloseTaskForm() {
    // Reunião sem closer definido não pode ser fechada sem querer — o
    // agendamento fica sem dono. Qualquer outro tipo de tarefa fecha
    // normal (o rascunho continua salvo local se quiser retomar).
    if (taskForm.task_type === "reuniao" && !taskForm.assigned_to) {
      setTaskFormError("Selecione o closer responsável pela reunião antes de sair.");
      return;
    }
    setShowTaskForm(false);
    setEditingTaskId(null);
    setTaskFormError(null);
  }

  function openEditTask(t: Task) {
    setEditingTaskId(t.id);
    setTaskFormError(null);
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
    setTaskFormError(null);
    let draft = { title: "", description: "", assigned_to: "", task_type: "tarefa", due_date: "" };
    try {
      const saved = window.localStorage.getItem(`gymplus_task_draft_${id}`);
      if (saved) draft = { ...draft, ...JSON.parse(saved) };
    } catch {
      // sem rascunho recuperável — segue com o form em branco
    }
    setTaskForm(draft);
    setShowTaskForm(true);
  }

  async function toggleTask(task: Task) {
    const done = !task.done;
    await fetch(`/api/deals/${id}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (done) {
      const descricao = task.description ? `\n${task.description}` : "";
      await fetch(`/api/deals/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: `✅ Atividade concluída: ${task.title}${descricao}` }),
      });
    }
    load(true);
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
  const pendingTasks = sortByUrgency(tasks.filter((t) => !t.done));

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
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                if (!deal.phone) return;
                call.startCall({ id: deal.id, person_name: deal.person_name, company_name: deal.company_name, phone: deal.phone });
              }}
              disabled={!deal.phone}
              title={deal.phone ? `Ligar para ${deal.phone}` : "Sem telefone cadastrado"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: "none",
                background: deal.phone ? "#b45309" : "var(--border)",
                color: "#fff",
                padding: 0,
                cursor: deal.phone ? "pointer" : "not-allowed",
                opacity: deal.phone ? 1 : 0.5,
              }}
            >
              <span className="msym" style={{ fontSize: 18 }}>call</span>
            </button>
            <button onClick={() => setShowQualify(true)} style={btnDark}>
              <span className="msym" style={{ fontSize: 16 }}>bolt</span> Qualificar SDR IA
            </button>
            {!deal.lost && deal.stage !== 6 && (
              <button onClick={() => setShowLostForm(true)} disabled={busy} style={btnOutlineDanger}>
                <span className="msym" style={{ fontSize: 16 }}>thumb_down</span> Marcar perda
              </button>
            )}
            {deal.stage !== 6 && (
              <button onClick={openSaleForm} disabled={busy} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                  Próximas tarefas
                  {pendingTasks.length > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "var(--text-faint)" }}>({pendingTasks.length})</span>
                  )}
                </h2>
                <button onClick={openCreateTask} className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
                  + Criar tarefa
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: tasksExpanded ? 8 : 14, maxHeight: tasksExpanded ? 340 : undefined, overflowY: tasksExpanded ? "auto" : undefined }}>
                {(tasksExpanded ? pendingTasks : pendingTasks.slice(0, 2)).map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span className="msym" style={{ fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                        {TASK_TYPE_ICON[t.task_type] ?? "task_alt"}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#2563eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                          {TASK_TYPE_LABEL[t.task_type] ?? t.task_type}
                          {t.assignee && ` · ${t.assignee.name}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
                      <div style={{ textAlign: "right" }}>
                        {taskStatusBadge(t)}
                        {t.due_date && <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>{fmtDateTime(t.due_date)}</div>}
                      </div>
                      <button onClick={() => openEditTask(t)} title="Editar / Reagendar" style={{ ...iconBtnStyle, width: 26, height: 26 }}>
                        <span className="msym" style={{ fontSize: 14 }}>edit</span>
                      </button>
                      <button onClick={() => toggleTask(t)} title="Marcar como concluída" style={{ ...iconBtnStyle, width: 26, height: 26, background: "#dbeafe", color: "#1d4ed8" }}>
                        <span className="msym" style={{ fontSize: 14 }}>check</span>
                      </button>
                    </div>
                  </div>
                ))}
                {pendingTasks.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nenhuma tarefa pendente.</p>}
              </div>
              {pendingTasks.length > 2 && (
                <button
                  onClick={() => setTasksExpanded((v) => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", border: "none", background: "none", color: "var(--accent-darker)", fontSize: 12, fontWeight: 700, padding: "2px 0 12px", cursor: "pointer" }}
                >
                  {tasksExpanded ? "Mostrar menos" : `Ver todas (${pendingTasks.length})`}
                  <span className="msym" style={{ fontSize: 16 }}>{tasksExpanded ? "expand_less" : "expand_more"}</span>
                </button>
              )}

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

      {showSaleForm && (
        <div style={overlayStyle}>
          <form onSubmit={confirmSale} className="card" style={{ width: 380, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Marcar negociação como vendida</h2>
              <button type="button" onClick={() => setShowSaleForm(false)} style={{ border: "none", background: "none" }}>✕</button>
            </div>
            <label style={labelStyle}>Produto</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {plans.map((plan) => (
                <label key={plan.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                  <input type="radio" name="sale_product" checked={saleProductId === plan.id} onChange={() => setSaleProductId(plan.id)} />
                  {plan.name}
                </label>
              ))}
              {plans.length === 0 && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Nenhum produto ativo cadastrado.</div>}
            </div>
            <label style={labelStyle}>Valor da venda</label>
            <div style={{ position: "relative", marginBottom: 18 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 600, color: "var(--text-faint)", pointerEvents: "none" }}>
                R$
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={saleValor}
                onChange={(e) => setSaleValor(e.target.value)}
                placeholder="0,00"
                style={{ ...inputStyle, marginBottom: 0, paddingLeft: 36 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowSaleForm(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !saleProductId || !Number(saleValor) || Number(saleValor) <= 0}
                className="btn-primary"
                style={{ flex: 1, opacity: !saleProductId || !Number(saleValor) || Number(saleValor) <= 0 ? 0.5 : 1 }}
              >
                Confirmar venda
              </button>
            </div>
          </form>
        </div>
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
              <button type="button" onClick={handleCloseTaskForm} style={{ border: "none", background: "none" }}>✕</button>
            </div>
            <label style={labelStyle}>Negociação</label>
            <input value={deal.person_name} disabled style={{ ...inputStyle, background: "var(--surface-muted)" }} />
            <label style={labelStyle}>Assunto da tarefa</label>
            <input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Descrição da tarefa</label>
            <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            {taskForm.task_type !== "reuniao" && (
              <>
                <label style={labelStyle}>Responsável</label>
                <select value={taskForm.assigned_to} onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </>
            )}
            <label style={labelStyle}>Tipo de tarefa</label>
            <select
              value={taskForm.task_type}
              onChange={(e) => {
                const nextType = e.target.value;
                // Só zera o responsável ao entrar/sair de "Reunião" — o
                // campo de closer usa uma lista filtrada (só role=closer),
                // então um id de SDR/admin ficaria inválido ali sem isso.
                const clearsAssignee = nextType === "reuniao" || taskForm.task_type === "reuniao";
                setTaskForm({ ...taskForm, task_type: nextType, assigned_to: clearsAssignee ? "" : taskForm.assigned_to });
                setTaskFormError(null);
              }}
              style={inputStyle}
            >
              <option value="tarefa">Tarefa</option>
              <option value="ligacao">Ligação</option>
              <option value="reuniao">Reunião</option>
              <option value="proposta">Proposta</option>
              <option value="followup">Follow-up</option>
            </select>
            <label style={labelStyle}>Data/hora de vencimento</label>
            <input
              required={taskForm.task_type === "reuniao"}
              type="datetime-local"
              value={taskForm.due_date}
              onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
              style={{ ...inputStyle, marginBottom: taskForm.task_type === "reuniao" ? 6 : 18 }}
            />
            {taskForm.task_type === "reuniao" && (
              <>
                <label style={labelStyle}>Closer responsável pela reunião</label>
                <select
                  required
                  value={taskForm.assigned_to}
                  onChange={(e) => { setTaskForm({ ...taskForm, assigned_to: e.target.value }); setTaskFormError(null); }}
                  style={{ ...inputStyle, marginBottom: 18, borderColor: taskFormError ? "var(--status-late-fg)" : "var(--border)" }}
                >
                  <option value="">Selecione um closer…</option>
                  {team.filter((t) => t.role === "closer").map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {team.filter((t) => t.role === "closer").length === 0 && (
                  <p style={{ fontSize: 11.5, color: "var(--status-late-fg)", marginTop: -12, marginBottom: 14 }}>
                    Nenhum closer cadastrado em Time ainda.
                  </p>
                )}
              </>
            )}
            {taskFormError && (
              <p style={{ fontSize: 12.5, color: "var(--status-late-fg)", marginTop: -8, marginBottom: 14 }}>{taskFormError}</p>
            )}
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
