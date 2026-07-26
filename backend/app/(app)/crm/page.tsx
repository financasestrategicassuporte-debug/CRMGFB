"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "../banner";

type Deal = {
  id: string;
  person_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  pipeline: "quente" | "frio";
  stage: number;
  value: number | null;
  revenue: number | null;
  qualification: number | null;
  task_type: string | null;
  task_desc: string | null;
  task_date: string | null;
  created_at: string;
  assigned_to: string | null;
  assignee?: { id: string; name: string; initials: string | null; color: string | null } | null;
  tasks?: { id: string; title: string; done: boolean; due_date: string | null; task_type: string | null }[];
};

type TeamMember = { id: string; name: string; role: string; initials: string | null };

const STAGES = [
  "Sem Contato / Leads",
  "Contato Feito",
  "Reunião Agendada",
  "Remarcar Reunião",
  "Entrar em Contato",
  "Em Negociação / Proposta",
  "Acompanhamento",
];

const STAGE_NEGOCIACAO = 5;

const TASK_ICON: Record<string, string> = {
  ligacao: "call",
  reuniao: "groups",
  proposta: "task_alt",
  followup: "person",
  whatsapp: "chat",
};

function fmtBRL(v: number | null) {
  if (!v) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Tarefa aberta mais próxima do vencimento — prioriza a lista real de
 * tarefas (deal_tasks); se o deal ainda não tem nenhuma, cai pro campo
 * legado (task_desc/task_type/task_date) que os dados de exemplo usam. */
function pendingActivity(deal: Deal) {
  const open = (deal.tasks ?? []).filter((t) => !t.done);
  if (open.length > 0) {
    open.sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    return { title: open[0].title, type: open[0].task_type, date: open[0].due_date };
  }
  if (deal.task_desc) {
    return { title: deal.task_desc, type: deal.task_type, date: deal.task_date };
  }
  return null;
}

/** Alerta "urgente": negociação em Em Negociação/Proposta com alguma
 * tarefa aberta vencendo hoje ou atrasada — some sozinho assim que a
 * tarefa é marcada como feita (o card deixa de ter tarefa aberta vencida). */
function isUrgent(deal: Deal) {
  if (deal.stage !== STAGE_NEGOCIACAO) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return (deal.tasks ?? []).some((t) => !t.done && t.due_date && new Date(t.due_date) <= endOfToday);
}

export default function CrmPage() {
  const router = useRouter();
  const [role, setRole] = useState("admin");
  const [pipeline, setPipeline] = useState<"quente" | "frio">("quente");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newDeal, setNewDeal] = useState({ company_name: "", person_name: "", phone: "", value: "" });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.profile?.role ?? "admin"));
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setTeam((d.team ?? []).filter((t: TeamMember) => t.role !== "admin")));
  }, []);

  async function loadDeals() {
    setLoading(true);
    const params = new URLSearchParams({ pipeline });
    if (ownerFilter !== "all") params.set("assigned_to", ownerFilter);
    const res = await fetch(`/api/deals?${params}`);
    const data = await res.json();
    setDeals(data.deals ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline, ownerFilter]);

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_name: newDeal.person_name,
        company_name: newDeal.company_name || undefined,
        phone: newDeal.phone || undefined,
        pipeline,
        value: newDeal.value ? Number(newDeal.value) : undefined,
      }),
    });
    setNewDeal({ company_name: "", person_name: "", phone: "", value: "" });
    setShowForm(false);
    loadDeals();
  }

  async function moveStage(deal: Deal, delta: number) {
    const next = deal.stage + delta;
    if (next < 0 || next > 6) return;
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    loadDeals();
  }

  async function distribute() {
    setDistributing(true);
    const unassigned = deals.filter((d) => !d.assigned_to).map((d) => d.id);
    if (unassigned.length === 0) {
      setDistributing(false);
      return;
    }
    await fetch("/api/leads/distribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_ids: unassigned, strategy: "peso" }),
    });
    setDistributing(false);
    loadDeals();
  }

  const columns = STAGES.map((label, stage) => ({
    stage,
    label,
    deals: deals.filter((d) => d.stage === stage),
  }));

  return (
    <div>
      <Banner
        title="Meu CRM"
        subtitle="Seus leads distribuídos, do primeiro contato ao agendamento"
        icon="contacts"
        role={role}
      />
      <div style={{ padding: "20px 20px 32px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setPipeline("quente")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 10,
              border: `1px solid ${pipeline === "quente" ? "var(--accent)" : "var(--border)"}`,
              background: "#fff",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span className="msym" style={{ fontSize: 15, color: "#f97316" }}>local_fire_department</span>
            Funil Quente
          </button>
          <button
            onClick={() => setPipeline("frio")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 10,
              border: `1px solid ${pipeline === "frio" ? "var(--accent)" : "var(--border)"}`,
              background: "#fff",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span className="msym" style={{ fontSize: 15, color: "#38bdf8" }}>ac_unit</span>
            Funil Frio
          </button>
        </div>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Funil {pipeline === "quente" ? "Quente" : "Frio"} · {pipeline === "quente" ? "Formulário de Consultoria" : "Prospecção Ativa"}
            </div>
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
              {pipeline === "quente"
                ? "Leads que preencheram o formulário com dados da academia"
                : "Leads buscados ativamente pelo time de SDRs"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {role === "admin" && (
              <button className="btn-primary" onClick={distribute} disabled={distributing} style={{ background: "var(--bg-dark)", fontSize: 13, padding: "9px 12px" }}>
                <span className="msym" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4 }}>hub</span>
                {distributing ? "Distribuindo…" : "Distribuir por Performance"}
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowForm(true)} style={{ fontSize: 13, padding: "9px 14px" }}>
              + Criar
            </button>
          </div>
        </header>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700, color: "var(--accent-darker)" }}>
              <span className="msym" style={{ fontSize: 16 }}>bolt</span>
              IA para Negociações ·
            </span>
            {role === "admin" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 16, color: "var(--text-faint)" }}>filter_alt</span>
                <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={selectStyle}>
                  <option value="all">Todos os SDRs e Closers</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </span>
            ) : (
              <span style={{ color: "var(--text-faint)" }}>Todos os SDRs e Closers</span>
            )}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
            Negociações distribuídas automaticamente · clique para abrir
          </span>
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10, overflowX: "auto" }}>
            {columns.map((col) => {
              const total = col.deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
              return (
              <div key={col.stage} style={{ minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={col.label}>
                    {col.label} <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>({col.deals.length})</span>
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: total > 0 ? "var(--accent-darker)" : "var(--text-faint)", flexShrink: 0 }}>
                    {fmtBRL(total)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {col.deals.map((deal) => {
                    const activity = pendingActivity(deal);
                    const urgent = isUrgent(deal);
                    return (
                    <div
                      key={deal.id}
                      className="card"
                      style={{ cursor: "pointer", padding: 10, borderColor: urgent ? "#dc2626" : undefined }}
                      onClick={() => router.push(`/crm/${deal.id}`)}
                    >
                      {urgent && (
                        <div
                          className="urgent-alert"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: "#dc2626",
                            background: "#fee2e2",
                            borderRadius: 8,
                            padding: "4px 8px",
                            marginBottom: 6,
                          }}
                        >
                          <span className="msym" style={{ fontSize: 14 }}>warning</span>
                          Urgente — Pegar resposta
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#0ea5e9", fontWeight: 700 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0ea5e9", display: "inline-block" }} />
                          Em andamento
                        </span>
                        <span className="msym" style={{ fontSize: 14, color: "var(--text-faint)" }}>info</span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, marginBottom: 6 }}>
                        {deal.company_name ? `${deal.company_name} – ${deal.person_name}` : deal.person_name}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        {deal.qualification ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 1, color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>
                            <span className="msym" style={{ fontSize: 13 }}>star</span>
                            {deal.qualification}
                          </span>
                        ) : null}
                        <span className="msym" style={{ fontSize: 14, color: "var(--text-faint)" }}>person</span>
                        {deal.value ? <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtBRL(deal.value)}</span> : null}
                      </div>

                      {activity && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            marginBottom: 6,
                            padding: "5px 8px",
                            borderRadius: 8,
                            background: "var(--surface-muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <span className="msym" style={{ fontSize: 13, color: "var(--accent-darker)" }}>{TASK_ICON[activity.type ?? ""] ?? "task_alt"}</span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activity.title}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-faint)" }}>
                        <span className="msym" style={{ fontSize: 13 }}>badge</span>
                        {deal.assignee ? deal.assignee.name : "Sem dono"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>{fmtDate(activity?.date ?? deal.created_at)}</div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={deal.stage === 0}
                          onClick={() => moveStage(deal, -1)}
                          title="Voltar etapa"
                          style={{ ...stageNavBtnStyle, opacity: deal.stage === 0 ? 0.35 : 1 }}
                        >
                          <span className="msym" style={{ fontSize: 16 }}>chevron_left</span>
                        </button>
                        <button
                          disabled={deal.stage === 6}
                          onClick={() => moveStage(deal, 1)}
                          title="Avançar etapa"
                          style={{ ...stageNavBtnStyle, opacity: deal.stage === 6 ? 0.35 : 1 }}
                        >
                          <span className="msym" style={{ fontSize: 16 }}>chevron_right</span>
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div style={overlayStyle}>
          <form onSubmit={createDeal} className="card" style={{ width: 360, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Nova negociação · Funil {pipeline === "quente" ? "Quente" : "Frio"}</h2>
            <label style={labelStyle}>Nome da academia</label>
            <input
              value={newDeal.company_name}
              onChange={(e) => setNewDeal({ ...newDeal, company_name: e.target.value })}
              style={inputStyle}
              placeholder="Ex: ULTRA ACADEMIA"
            />
            <label style={labelStyle}>Nome do contato</label>
            <input
              required
              value={newDeal.person_name}
              onChange={(e) => setNewDeal({ ...newDeal, person_name: e.target.value })}
              style={inputStyle}
            />
            <label style={labelStyle}>Telefone</label>
            <input
              value={newDeal.phone}
              onChange={(e) => setNewDeal({ ...newDeal, phone: e.target.value })}
              style={inputStyle}
            />
            <label style={labelStyle}>Valor estimado</label>
            <input
              type="number"
              value={newDeal.value}
              onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
              style={{ ...inputStyle, marginBottom: 18 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Criar
              </button>
            </div>
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

const selectStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "7px 10px",
  fontSize: 12,
  background: "#fff",
};

const stageNavBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 22,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--surface-muted)",
  color: "var(--text-faint)",
  padding: 0,
};
