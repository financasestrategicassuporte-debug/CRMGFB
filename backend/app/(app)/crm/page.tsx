"use client";

import { useEffect, useState } from "react";

type Deal = {
  id: string;
  person_name: string;
  phone: string | null;
  email: string | null;
  pipeline: "quente" | "frio";
  stage: number;
  value: number | null;
  revenue: number | null;
  assignee?: { name: string } | null;
};

const STAGES = [
  "Sem Contato / Leads",
  "Contato Feito",
  "Reunião Agendada",
  "Remarcar Reunião",
  "Entrar em Contato",
  "Em Negociação / Proposta",
  "Acompanhamento",
];

function fmtBRL(v: number | null) {
  if (!v) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CrmPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Deal | null>(null);
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string }[]>([]);
  const [noteText, setNoteText] = useState("");
  const [newDeal, setNewDeal] = useState({ person_name: "", phone: "", pipeline: "quente" as "quente" | "frio", value: "" });

  async function loadDeals() {
    setLoading(true);
    const res = await fetch("/api/deals");
    const data = await res.json();
    setDeals(data.deals ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDeals();
  }, []);

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_name: newDeal.person_name,
        phone: newDeal.phone || undefined,
        pipeline: newDeal.pipeline,
        value: newDeal.value ? Number(newDeal.value) : undefined,
      }),
    });
    setNewDeal({ person_name: "", phone: "", pipeline: "quente", value: "" });
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

  const columns = STAGES.map((label, stage) => ({
    stage,
    label,
    deals: deals.filter((d) => d.stage === stage),
  }));

  return (
    <div style={{ padding: 32 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>CRM</h1>
          <p style={{ color: "var(--text-faint)", margin: "4px 0 0" }}>
            Negociações do primeiro contato ao fechamento
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nova negociação
        </button>
      </header>

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 12 }}>
          {columns.map((col) => (
            <div key={col.stage} style={{ minWidth: 240, flex: "0 0 auto" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                {col.label} <span style={{ color: "var(--text-faint)" }}>({col.deals.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.deals.map((deal) => (
                  <div key={deal.id} className="card" style={{ cursor: "pointer" }} onClick={() => openDeal(deal)}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{deal.person_name}</div>
                    <div style={{ color: "var(--text-faint)", fontSize: 12 }}>{deal.phone}</div>
                    {deal.value ? <div style={{ fontSize: 13, marginTop: 4 }}>{fmtBRL(deal.value)}</div> : null}
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

      {showForm && (
        <div style={overlayStyle}>
          <form onSubmit={createDeal} className="card" style={{ width: 360, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Nova negociação</h2>
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
            <label style={labelStyle}>Pipeline</label>
            <select
              value={newDeal.pipeline}
              onChange={(e) => setNewDeal({ ...newDeal, pipeline: e.target.value as "quente" | "frio" })}
              style={inputStyle}
            >
              <option value="quente">Quente</option>
              <option value="frio">Frio</option>
            </select>
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

      {selected && (
        <div style={overlayStyle}>
          <div className="card" style={{ width: 400, background: "#fff", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ marginTop: 0, fontSize: 16 }}>{selected.person_name}</h2>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", fontSize: 16 }}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
              {STAGES[selected.stage]} · {selected.pipeline}
            </p>

            <h3 style={{ fontSize: 13 }}>Anotações</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ fontSize: 13, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
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
