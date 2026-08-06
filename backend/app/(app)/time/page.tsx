"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "sdr" | "closer";
  phone: string | null;
  initials: string | null;
  active: boolean;
};

type BreakLog = {
  id: string;
  tipo: "banheiro" | "almoco" | "outro";
  started_at: string;
  ended_at: string | null;
  profile: { id: string; name: string } | null;
};

const ROLE_LABEL: Record<string, string> = { admin: "Admin", sdr: "SDR", closer: "Closer" };
const BREAK_TIPO_LABEL: Record<string, string> = { banheiro: "Banheiro", almoco: "Almoço", outro: "Outro" };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDuracao(startedAt: string, endedAt: string | null) {
  if (!endedAt) return "Em andamento";
  const minutos = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

export default function TimePage() {
  const [role, setRole] = useState("admin");
  const [team, setTeam] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sdr" as Member["role"], phone: "" });
  const [breaks, setBreaks] = useState<BreakLog[]>([]);
  const [breaksLoading, setBreaksLoading] = useState(true);
  const [breaksDate, setBreaksDate] = useState(todayISO());

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.profile?.role ?? "admin"));
  }, []);

  async function loadTeam() {
    setLoading(true);
    const res = await fetch("/api/team");
    const data = await res.json();
    setTeam(data.team ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    setBreaksLoading(true);
    fetch(`/api/breaks?from=${breaksDate}&to=${breaksDate}`)
      .then((r) => r.json())
      .then((d) => setBreaks(d.breaks ?? []))
      .finally(() => setBreaksLoading(false));
  }, [breaksDate]);

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Não foi possível cadastrar o membro");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "sdr", phone: "" });
    setShowForm(false);
    loadTeam();
  }

  async function removeMember(id: string) {
    if (!confirm("Remover este membro do time?")) return;
    await fetch(`/api/team/${id}`, { method: "DELETE" });
    loadTeam();
  }

  const sdrs = team.filter((t) => t.role === "sdr").length;
  const closers = team.filter((t) => t.role === "closer").length;

  return (
    <div>
      <Banner
        title="Time"
        subtitle="Cadastre e gerencie os SDRs e Closers da operação"
        icon="badge"
        role={role}
      />
    <div style={{ padding: 32 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px" }}>
            <span className="msym" style={{ color: "var(--accent-darker)" }}>call</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{sdrs}</div>
              <div style={{ color: "var(--text-faint)", fontSize: 11 }}>SDRs</div>
            </div>
          </div>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px" }}>
            <span className="msym" style={{ color: "var(--accent-darker)" }}>handshake</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{closers}</div>
              <div style={{ color: "var(--text-faint)", fontSize: 11 }}>Closers</div>
            </div>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Cadastrar membro
        </button>
      </header>

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                <th style={thStyle}>Membro</th>
                <th style={thStyle}>Função</th>
                <th style={thStyle}>E-mail</th>
                <th style={thStyle}>Telefone</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={tdStyle}>{member.name}</td>
                  <td style={tdStyle}>{ROLE_LABEL[member.role]}</td>
                  <td style={tdStyle}>{member.email}</td>
                  <td style={tdStyle}>{member.phone}</td>
                  <td style={tdStyle}>
                    <button onClick={() => removeMember(member.id)} style={{ border: "none", background: "none", color: "var(--status-late-fg)" }}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="card" style={{ padding: 0, overflow: "hidden", marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 0" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>schedule</span>
            Folha de ponto · pausas registradas
          </h2>
          <input
            type="date"
            value={breaksDate}
            onChange={(e) => setBreaksDate(e.target.value)}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}
          />
        </div>
        <p style={{ color: "var(--text-faint)", fontSize: 12.5, padding: "0 16px", marginTop: 6 }}>
          Registro voluntário — o colaborador clica quando sai pro banheiro/almoço, sem nenhum bloqueio associado.
        </p>
        {breaksLoading ? (
          <p style={{ padding: 16 }}>Carregando…</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)", textAlign: "left" }}>
                <th style={thStyle}>Colaborador</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Início</th>
                <th style={thStyle}>Fim</th>
                <th style={thStyle}>Duração</th>
              </tr>
            </thead>
            <tbody>
              {breaks.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={tdStyle}>{b.profile?.name ?? "—"}</td>
                  <td style={tdStyle}>{BREAK_TIPO_LABEL[b.tipo]}</td>
                  <td style={tdStyle}>{fmtHora(b.started_at)}</td>
                  <td style={tdStyle}>{fmtHora(b.ended_at)}</td>
                  <td style={{ ...tdStyle, fontWeight: b.ended_at ? undefined : 700, color: b.ended_at ? undefined : "#b45309" }}>
                    {fmtDuracao(b.started_at, b.ended_at)}
                  </td>
                </tr>
              ))}
              {breaks.length === 0 && (
                <tr>
                  <td style={tdStyle} colSpan={5}>Nenhuma pausa registrada nesse dia.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      {showForm && (
        <div style={overlayStyle}>
          <form onSubmit={createMember} className="card" style={{ width: 380, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Cadastrar membro</h2>
            <label style={labelStyle}>Nome</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>E-mail</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Senha inicial</label>
            <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Função</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Member["role"] })} style={inputStyle}>
              <option value="sdr">SDR</option>
              <option value="closer">Closer</option>
              <option value="admin">Admin</option>
            </select>
            <label style={labelStyle}>Telefone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ ...inputStyle, marginBottom: 18 }} />
            {error && <p style={{ color: "var(--status-late-fg)", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 12, color: "var(--text-faint)", fontWeight: 700 };
const tdStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 14 };

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
