"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit" });
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
  const [newDeal, setNewDeal] = useState({ person_name: "", phone: "", value: "" });

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

  async function moveStage(deal: Deal, delta: number, e: React.MouseEvent) {
    e.stopPropagation();
    const nextStage = Math.min(6, Math.max(0, deal.stage + delta));
    if (nextStage === deal.stage) return;
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
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
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              background: pipeline === "quente" ? "var(--bg-dark)" : "#fff",
              color: pipeline === "quente" ? "#fff" : "var(--text)",
              fontSize: 13,
            }}
          >
            <span className="msym" style={{ fontSize: 15, color: pipeline === "quente" ? "#f97316" : "var(--text-faint)" }}>local_fire_department</span>
            Funil Quente
          </button>
          <button
            onClick={() => setPipeline("frio")}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              background: pipeline === "frio" ? "var(--bg-dark)" : "#fff",
              color: pipeline === "frio" ? "#fff" : "var(--text)",
              fontSize: 13,
            }}
          >
            <span className="msym" style={{ fontSize: 15, color: pipeline === "frio" ? "#38bdf8" : "var(--text-faint)" }}>ac_unit</span>
            Funil Frio
          </button>
        </div>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>filter_alt</span>
            {role === "admin" && (
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={selectStyle}>
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

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10, overflowX: "auto" }}>
            {columns.map((col) => (
              <div key={col.stage} style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={col.label}>
                  {col.label} <span style={{ color: "var(--text-faint)" }}>({col.deals.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {col.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="card"
                      style={{ cursor: "pointer", padding: 10 }}
                      onClick={() => router.push(`/crm/${deal.id}`)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, lineHeight: 1.3 }}>{deal.person_name}</div>
                        {deal.qualification ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 1, color: "#f59e0b", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            <span className="msym" style={{ fontSize: 13 }}>star</span>
                            {deal.qualification}
                          </span>
                        ) : null}
                      </div>
                      {deal.value ? <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700 }}>{fmtBRL(deal.value)}</div> : null}
                      {deal.task_desc && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, marginTop: 6, color: "var(--text-faint)" }}>
                          <span className="msym" style={{ fontSize: 13 }}>{TASK_ICON[deal.task_type ?? ""] ?? "task_alt"}</span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deal.task_desc}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        {deal.assignee ? (
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: deal.assignee.color ?? "var(--accent)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 7,
                              fontWeight: 700,
                              color: "#fff",
                              flexShrink: 0,
                            }}
                            title={deal.assignee.name}
                          >
                            {deal.assignee.initials ?? deal.assignee.name.slice(0, 2).toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--text-faint)" }}>Sem dono</span>
                        )}
                        <span style={{ fontSize: 9, color: "var(--text-faint)" }}>{fmtDate(deal.task_date)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        <button onClick={(e) => moveStage(deal, -1, e)} style={miniBtn}>◀</button>
                        <button onClick={(e) => moveStage(deal, 1, e)} style={miniBtn}>▶</button>
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

const miniBtn: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "#fff",
  fontSize: 11,
  padding: "2px 6px",
  flex: 1,
};
