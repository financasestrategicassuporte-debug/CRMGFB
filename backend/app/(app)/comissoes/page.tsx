"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Commission = {
  id: string;
  amount: number;
  percent: number | null;
  status: "pending" | "paid";
  period: string;
  tipo: "fixo" | "extra" | "venda" | "reuniao";
  closer: { id: string; name: string; initials: string | null } | null;
  deal: { id: string; person_name: string } | null;
};

type TeamMember = { id: string; name: string; role: string };

const TIPO_LABEL: Record<string, string> = { fixo: "Fixo", extra: "Extra", venda: "Por venda", reuniao: "Reunião comparecida" };

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtK(v: number) {
  return v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : fmtBRL(v);
}

function fmtPeriod(iso: string) {
  const [y, m] = iso.split("-");
  return `${m}/${y}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

const formDefaults = {
  closer_id: "",
  tipo: "fixo" as "fixo" | "extra",
  amount: "",
  period: currentMonth(),
};

export default function ComissoesPage() {
  const [role, setRole] = useState("admin");
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(formDefaults);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/commissions");
    const data = await res.json();
    setCommissions(data.commissions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.profile?.role ?? "admin"));
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setTeam((d.team ?? []).filter((t: TeamMember) => t.role === "sdr" || t.role === "closer")));
    load();
  }, []);

  const isAdmin = role === "admin";
  const total = commissions.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);

  const byTipo = (tipo: Commission["tipo"]) => commissions.filter((c) => c.tipo === tipo);

  async function createCommission(e: React.FormEvent) {
    e.preventDefault();
    if (!form.closer_id || !form.amount) return;
    await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closer_id: form.closer_id,
        tipo: form.tipo,
        amount: Number(form.amount),
        period: `${form.period}-01`,
      }),
    });
    setForm(formDefaults);
    setShowForm(false);
    load();
  }

  async function toggleStatus(c: Commission) {
    await fetch(`/api/commissions/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: c.status === "paid" ? "pending" : "paid" }),
    });
    load();
  }

  async function removeCommission(c: Commission) {
    if (!confirm("Excluir este lançamento de comissão?")) return;
    await fetch(`/api/commissions/${c.id}`, { method: "DELETE" });
    load();
  }

  function CommissionRow({ c }: { c: Commission }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
            {c.closer?.initials ?? c.closer?.name?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{c.closer?.name ?? "—"}</div>
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
              {fmtPeriod(c.period)} {c.deal ? `· ${c.deal.person_name}` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="badge" style={{ background: c.status === "paid" ? "var(--status-ok-bg)" : "#fef3c7", color: c.status === "paid" ? "var(--accent-darker)" : "#b45309" }}>
            {c.status === "paid" ? "Pago" : "Pendente"}
          </span>
          <div style={{ fontWeight: 800, color: "var(--accent-darker)" }}>{fmtK(c.amount)}</div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => toggleStatus(c)} title={c.status === "paid" ? "Marcar como pendente" : "Marcar como pago"} style={{ border: "none", background: "none", color: "var(--text-faint)" }}>
                <span className="msym" style={{ fontSize: 16 }}>{c.status === "paid" ? "undo" : "check_circle"}</span>
              </button>
              <button onClick={() => removeCommission(c)} title="Excluir" style={{ border: "none", background: "none", color: "var(--text-faint)" }}>
                <span className="msym" style={{ fontSize: 16 }}>delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Banner
        title={isAdmin ? "Comissões" : "Minhas Comissões"}
        subtitle={isAdmin ? "Cálculo automático de SDR e Closer em tempo real" : "Suas comissões, com base no que você executou"}
        icon="savings"
        role={role}
      />
      <div style={{ padding: 32 }}>
        <div className="card" style={{ background: "var(--bg-dark)", color: "#fff", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{isAdmin ? "Comissões do período" : "Suas comissões"}</div>
            <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
              {isAdmin ? "Fixo, extra e por venda — tudo num lugar só." : "Fixo, extra e por venda fechada."}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "right" }}>{isAdmin ? "TOTAL A PAGAR (PENDENTE)" : "PENDENTE"}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>{fmtK(totalPending)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textAlign: "right" }}>TOTAL GERAL</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtK(total)}</div>
            </div>
            {isAdmin && (
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                + Nova comissão
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>wallet</span>
                Fixas · base mensal de SDR/Closer
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byTipo("fixo").map((c) => <CommissionRow key={c.id} c={c} />)}
                {byTipo("fixo").length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhuma comissão fixa lançada ainda.</p>}
              </div>
            </section>

            <section className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>add_card</span>
                Extras · pagamento a mais num período específico
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byTipo("extra").map((c) => <CommissionRow key={c.id} c={c} />)}
                {byTipo("extra").length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhum extra lançado ainda.</p>}
              </div>
            </section>

            <section className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>event_available</span>
                Reuniões qualificadas comparecidas · automático (SDR)
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byTipo("reuniao").map((c) => <CommissionRow key={c.id} c={c} />)}
                {byTipo("reuniao").length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhuma reunião comparecida com comissão ainda.</p>}
              </div>
            </section>

            <section className="card">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>handshake</span>
                Por venda fechada · automático (SDR)
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byTipo("venda").map((c) => <CommissionRow key={c.id} c={c} />)}
                {byTipo("venda").length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhuma comissão por venda registrada ainda.</p>}
              </div>
            </section>
          </div>
        )}
      </div>

      {showForm && (
        <div style={overlayStyle}>
          <form onSubmit={createCommission} className="card" style={{ width: 380, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Nova comissão</h2>
            <label style={labelStyle}>Colaborador</label>
            <select required value={form.closer_id} onChange={(e) => setForm({ ...form, closer_id: e.target.value })} style={inputStyle}>
              <option value="">Selecione…</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.role === "sdr" ? "SDR" : "Closer"})</option>
              ))}
            </select>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              {(["fixo", "extra"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm({ ...form, tipo })}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 8,
                    border: `1px solid ${form.tipo === tipo ? "var(--accent)" : "var(--border)"}`,
                    background: form.tipo === tipo ? "var(--status-ok-bg)" : "#fff",
                    color: form.tipo === tipo ? "var(--accent-darker)" : "var(--text)",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {TIPO_LABEL[tipo]}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 0 }}>
              {form.tipo === "fixo" ? "Base mensal fixa do colaborador, independente de venda." : "Pagamento extra pontual — bônus, ajuste, campanha específica."}
            </p>
            <label style={labelStyle}>Valor</label>
            <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} placeholder="R$ 0,00" />
            <label style={labelStyle}>Período</label>
            <input required type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} style={{ ...inputStyle, marginBottom: 18 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Salvar
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
