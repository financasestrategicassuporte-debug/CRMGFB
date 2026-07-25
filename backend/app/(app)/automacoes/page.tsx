"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Automation = {
  id: string;
  title: string;
  icon: string | null;
  trigger_event: string;
  condition: string | null;
  channels: string[];
  active: boolean;
  run_count: number;
};

export default function AutomacoesPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", trigger_event: "", condition: "", channels: [] as string[] });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/automations");
    const data = await res.json();
    setAutomations(data.automations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(automation: Automation) {
    await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !automation.active }),
    });
    load();
  }

  function toggleChannel(channel: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(channel) ? f.channels.filter((c) => c !== channel) : [...f.channels, channel],
    }));
  }

  async function createAutomation(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", trigger_event: "", condition: "", channels: [] });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <Banner
        title="Automação de Disparos"
        subtitle="Área do admin · crie os fluxos automáticos de envio das tarefas"
        icon="bolt"
        role="admin"
      />
      <div style={{ padding: 32 }}>
        <div className="card" style={{ background: "var(--bg-dark)", color: "#fff", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="msym" style={{ fontSize: 24, color: "var(--accent)" }}>shield_lock</span>
            <div>
              <div style={{ fontWeight: 700 }}>Construtor de fluxos de disparo</div>
              <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
                Área exclusiva do administrador · define como cada tarefa é enviada automaticamente aos clientes.
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Nova automação
          </button>
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>bolt</span>
          Automações ativas
        </h2>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {automations.map((a) => (
              <div key={a.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="msym" style={{ color: "var(--accent-darker)" }}>{a.icon ?? "bolt"}</span>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  </div>
                  <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                    <input type="checkbox" checked={a.active} onChange={() => toggleActive(a)} />
                  </label>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>{a.trigger_event}</div>
                {a.condition && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{a.condition}</div>}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {a.channels.map((c) => (
                    <span key={c} className="badge badge-ok">{c}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>{a.run_count} disparos</div>
              </div>
            ))}
            {automations.length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhuma automação cadastrada ainda.</p>}
          </div>
        )}
      </div>

      {showForm && (
        <div style={overlayStyle}>
          <form onSubmit={createAutomation} className="card" style={{ width: 380, background: "#fff" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Criar automação</h2>
            <label style={labelStyle}>Nome da automação</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Gatilho</label>
            <select value={form.trigger_event} onChange={(e) => setForm({ ...form, trigger_event: e.target.value })} style={inputStyle}>
              <option value="">Selecione…</option>
              <option value="Toda sexta-feira · 08:00">Toda sexta-feira · 08:00</option>
              <option value="Ao concluir a atividade anterior">Ao concluir a atividade anterior</option>
              <option value="Todo dia 1º do mês">Todo dia 1º do mês</option>
              <option value="Disparo manual">Disparo manual</option>
            </select>
            <label style={labelStyle}>Condição</label>
            <input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} style={inputStyle} placeholder="Ex: semana anterior concluída" />
            <label style={labelStyle}>Canais de envio</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              {["E-mail", "WhatsApp"].map((c) => (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={form.channels.includes(c)} onChange={() => toggleChannel(c)} />
                  {c}
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Salvar automação
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
