"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  current_week: number;
  progress: number;
  atividade_status: "no_prazo" | "atrasado" | "prazo_encerrado";
  financeiro_status: "em_dia" | "inadimplente" | "sem_contato";
  valor: number | null;
  plan: { id: string; name: string; total_weeks: number } | null;
};

type Plan = { id: string; name: string };

const ATIVIDADE_LABEL: Record<string, { label: string; cls: string }> = {
  no_prazo: { label: "No prazo", cls: "badge-ok" },
  atrasado: { label: "Atrasado", cls: "badge-late" },
  prazo_encerrado: { label: "Prazo encerrado", cls: "badge-late" },
};

const FINANCEIRO_LABEL: Record<string, { label: string; cls: string }> = {
  em_dia: { label: "Em dia", cls: "badge-ok" },
  inadimplente: { label: "Inadimplente", cls: "badge-late" },
  sem_contato: { label: "Sem contato", cls: "badge-late" },
};

function fmtBRL(v: number | null) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", plan_id: "", valor: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [clientsRes, plansRes] = await Promise.all([fetch("/api/clients"), fetch("/api/plans")]);
    const clientsData = await clientsRes.json();
    const plansData = await plansRes.json();
    setClients(clientsData.clients ?? []);
    setPlans(plansData.plans ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        plan_id: form.plan_id || null,
        valor: form.valor ? Number(form.valor) : null,
      }),
    });
    setForm({ name: "", plan_id: "", valor: "" });
    setShowForm(false);
    load();
  }

  async function deleteClient(id: string) {
    setDeletingId(id);
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmDeleteId(null);
    load();
  }

  return (
    <div style={{ padding: 32 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Clientes</h1>
          <p style={{ color: "var(--text-faint)", margin: "4px 0 0" }}>{clients.length} em playbook ativo</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Novo cliente
        </button>
      </header>

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {clients.map((client) => {
            const atividade = ATIVIDADE_LABEL[client.atividade_status];
            const financeiro = FINANCEIRO_LABEL[client.financeiro_status];
            return (
              <div key={client.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{client.name}</div>
                  {confirmDeleteId === client.id ? (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{ border: "1px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 10.5, padding: "3px 7px", fontWeight: 700 }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        disabled={deletingId === client.id}
                        style={{ border: "none", borderRadius: 6, background: "var(--status-late-fg)", color: "#fff", fontSize: 10.5, padding: "3px 7px", fontWeight: 700, opacity: deletingId === client.id ? 0.6 : 1 }}
                      >
                        {deletingId === client.id ? "Excluindo…" : "Excluir"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(client.id)}
                      title="Excluir cliente"
                      style={{ border: "none", background: "none", color: "var(--text-faint)", flexShrink: 0, display: "flex" }}
                    >
                      <span className="msym" style={{ fontSize: 17 }}>delete</span>
                    </button>
                  )}
                </div>
                <div style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 2 }}>
                  {client.plan?.name ?? "Sem plano"} · Semana {client.current_week}/{client.plan?.total_weeks ?? 12}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <span className={`badge ${atividade.cls}`}>{atividade.label}</span>
                  <span className={`badge ${financeiro.cls}`}>{financeiro.label}</span>
                </div>
                <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: "var(--surface-muted)" }}>
                  <div
                    style={{
                      width: `${client.progress}%`,
                      height: "100%",
                      borderRadius: 3,
                      background: "var(--accent)",
                    }}
                  />
                </div>
                {client.valor ? (
                  <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-faint)" }}>{fmtBRL(client.valor)}/mês</div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div style={overlayStyle}>
          <form onSubmit={createClient} className="card" style={{ width: 360, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Novo cliente</h2>
            <label style={labelStyle}>Nome (academia)</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Plano</label>
            <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} style={inputStyle}>
              <option value="">Selecione…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <label style={labelStyle}>Valor mensal</label>
            <input
              type="number"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
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
