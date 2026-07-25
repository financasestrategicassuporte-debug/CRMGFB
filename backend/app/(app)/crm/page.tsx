"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Deal = {
  id: string;
  person_name: string;
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
  assigned_to: string | null;
  assignee?: { id: string; name: string; initials: string | null; color: string | null } | null;
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

const TASK_ICON: Record<string, string> = {
  ligacao: "call",
  reuniao: "groups",
  proposta: "task_alt",
  followup: "person",
};

function fmtBRL(v: number | null) {
  if (!v) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CrmPage() {
  const [role, setRole] = useState("admin");
  const [pipeline, setPipeline] = useState<"quente" | "frio">("quente");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Deal | null>(null);
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string; is_ai_generated: boolean }[]>([]);
  const [noteText, setNoteText] = useState("");
  const [showQualify, setShowQualify] = useState(false);
  const [qualifyForm, setQualifyForm] = useState({ students_count: "", revenue: "", pain_level: 3, urgency: 3, uses_software: false });
  const [newDeal, setNewDeal] = useState({ person_name: "", phone: "", value: "" });
  const [closing, setClosing] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);

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
        phone: newDeal.phone || undefined,
        pipeline,
        value: newDeal.value ? Number(newDeal.value) : undefined,
      }),
    });
    setNewDeal({ person_name: "", phone: "", value: "" });
    setShowForm(false);
    loadDeals();
  }

  async function moveStage(deal: Deal, delta: number) {
    const nextStage = Math.min(6, Math.max(0, deal.stage + delta));
    if (nextStage === deal.stage) return;
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
    });
    loadDeals();
  }

  async function openDeal(deal: Deal) {
    setSelected(deal);
    setCloseMessage(null);
    const res = await fetch(`/api/deals/${deal.id}/notes`);
    const data = await res.json();
    setNotes(data.notes ?? []);
  }

  async function addNote() {
    if (!selected || !noteText.trim()) return;
    await fetch(`/api/deals/${selected.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteText }),
    });
    setNoteText("");
    const res = await fetch(`/api/deals/${selected.id}/notes`);
    const data = await res.json();
    setNotes(data.notes ?? []);
  }

  async function submitQualify(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await fetch(`/api/deals/${selected.id}/qualify`, {
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
    loadDeals();
    const res = await fetch(`/api/deals/${selected.id}/notes`);
    const data = await res.json();
    setNotes(data.notes ?? []);
  }

  async function closeDeal() {
    if (!selected) return;
    setClosing(true);
    setCloseMessage(null);
    const res = await fetch(`/api/deals/${selected.id}/close`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCloseMessage(body.error ?? "Não foi possível fechar a negociação.");
      setClosing(false);
      return;
    }
    setCloseMessage(`Negócio fechado! Cliente "${body.client.name}" criado e onboarding iniciado.`);
    setClosing(false);
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
      <div style={{ padding: 32 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setPipeline("quente")}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: pipeline === "quente" ? "var(--bg-dark)" : "#fff",
              color: pipeline === "quente" ? "#fff" : "var(--text)",
            }}
          >
            <span className="msym" style={{ fontSize: 16, color: pipeline === "quente" ? "#f97316" : "var(--text-faint)" }}>local_fire_department</span>
            Funil Quente
          </button>
          <button
            onClick={() => setPipeline("frio")}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: pipeline === "frio" ? "var(--bg-dark)" : "#fff",
              color: pipeline === "frio" ? "#fff" : "var(--text)",
            }}
          >
            <span className="msym" style={{ fontSize: 16, color: pipeline === "frio" ? "#38bdf8" : "var(--text-faint)" }}>ac_unit</span>
            Funil Frio
          </button>
        </div>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="msym" style={{ color: "var(--accent-darker)" }}>filter_alt</span>
            {role === "admin" && (
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={{ ...selectStyle }}>
                <option value="all">Todos os SDRs e Closers</option>
                {team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {role === "admin" && (
              <button className="btn-primary" onClick={distribute} disabled={distributing} style={{ background: "var(--bg-dark)" }}>
                <span className="msym" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>hub</span>
                {distributing ? "Distribuindo…" : "Distribuir por Performance"}
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Criar
            </button>
          </div>
        </header>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12 }}>
            {columns.map((col) => (
              <div key={col.stage} style={{ minWidth: 260, flex: "0 0 auto" }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  {col.label} <span style={{ color: "var(--text-faint)" }}>({col.deals.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.deals.map((deal) => (
                    <div key={deal.id} className="card" style={{ cursor: "pointer" }} onClick={() => openDeal(deal)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{deal.person_name}</div>
                        {deal.qualification ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 2, color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>
                            <span className="msym" style={{ fontSize: 14 }}>star</span>
                            {deal.qualification}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color: "var(--text-faint)", fontSize: 12 }}>{deal.phone}</div>
                      {deal.value ? <div style={{ fontSize: 13, marginTop: 4, fontWeight: 700 }}>{fmtBRL(deal.value)}</div> : null}
                      {deal.task_desc && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, marginTop: 6, color: "var(--text-faint)" }}>
                          <span className="msym" style={{ fontSize: 15 }}>{TASK_ICON[deal.task_type ?? ""] ?? "task_alt"}</span>
                          {deal.task_desc}
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        {deal.assignee ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: deal.assignee.color ?? "var(--accent)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 8,
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            >
                              {deal.assignee.initials ?? deal.assignee.name.slice(0, 2).toUpperCase()}
                            </span>
                            {deal.assignee.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Sem dono</span>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{fmtDate(deal.task_date)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => moveStage(deal, -1)} style={{ border: "1px solid var(--border)", borderRadius: 6, background: "#fff" }}>
                          ◀
                        </button>
                        <button onClick={() => moveStage(deal, 1)} style={{ border: "1px solid var(--border)", borderRadius: 6, background: "#fff" }}>
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div style={overlayStyle}>
          <form onSubmit={createDeal} className="card" style={{ width: 360, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Nova negociação · Funil {pipeline === "quente" ? "Quente" : "Frio"}</h2>
            <label style={labelStyle}>Nome</label>
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

      {selected && !showQualify && (
        <div style={overlayStyle}>
          <div className="card" style={{ width: 420, background: "#fff", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>{selected.person_name}</h2>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", fontSize: 16 }}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
              {STAGES[selected.stage]} · {selected.pipeline}
              {selected.qualification ? ` · ${selected.qualification}★` : ""}
            </p>

            <button
              className="btn-primary"
              style={{ width: "100%", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onClick={() => setShowQualify(true)}
            >
              <span className="msym" style={{ fontSize: 16 }}>bolt</span>
              IA para Negociações · Qualificar
            </button>

            {selected.stage !== 6 && (
              <button
                onClick={closeDeal}
                disabled={closing}
                style={{
                  width: "100%",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "var(--bg-dark)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: 11,
                  fontWeight: 700,
                }}
              >
                <span className="msym" style={{ fontSize: 16, color: "var(--accent)" }}>task_alt</span>
                {closing ? "Fechando…" : "Fechar negócio · Criar cliente"}
              </button>
            )}
            {closeMessage && (
              <p style={{ fontSize: 13, color: "var(--accent-darker)", marginTop: -8, marginBottom: 14 }}>{closeMessage}</p>
            )}

            <h3 style={{ fontSize: 13 }}>Anotações</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
                  {n.is_ai_generated && <span className="badge badge-ok" style={{ marginRight: 6 }}>IA</span>}
                  {n.body}
                </div>
              ))}
              {notes.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nenhuma anotação ainda.</p>}
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Adicionar anotação…"
              style={{ ...inputStyle, minHeight: 60 }}
            />
            <button className="btn-primary" style={{ width: "100%" }} onClick={addNote}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {selected && showQualify && (
        <div style={overlayStyle}>
          <form onSubmit={submitQualify} className="card" style={{ width: 380, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Qualificar — {selected.person_name}</h2>
            <label style={labelStyle}>Quantidade de alunos</label>
            <input
              required
              type="number"
              value={qualifyForm.students_count}
              onChange={(e) => setQualifyForm({ ...qualifyForm, students_count: e.target.value })}
              style={inputStyle}
            />
            <label style={labelStyle}>Faturamento mensal (R$)</label>
            <input
              required
              type="number"
              value={qualifyForm.revenue}
              onChange={(e) => setQualifyForm({ ...qualifyForm, revenue: e.target.value })}
              style={inputStyle}
            />
            <label style={labelStyle}>Dor (1-5)</label>
            <input
              type="range"
              min={1}
              max={5}
              value={qualifyForm.pain_level}
              onChange={(e) => setQualifyForm({ ...qualifyForm, pain_level: Number(e.target.value) })}
              style={{ width: "100%" }}
            />
            <label style={labelStyle}>Urgência (1-5)</label>
            <input
              type="range"
              min={1}
              max={5}
              value={qualifyForm.urgency}
              onChange={(e) => setQualifyForm({ ...qualifyForm, urgency: Number(e.target.value) })}
              style={{ width: "100%" }}
            />
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={qualifyForm.uses_software}
                onChange={(e) => setQualifyForm({ ...qualifyForm, uses_software: e.target.checked })}
              />
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
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
};
