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

type DealAutomation = {
  id: string;
  title: string;
  trigger_stage: number;
  action_type: "email" | "whatsapp" | "task";
  task_type: "ligacao" | "whatsapp" | null;
  run_time: string | null;
  skip_weekends: boolean;
  delay_days: number;
  template_subject: string | null;
  template_body: string | null;
  active: boolean;
  run_count: number;
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

const ACTION_LABEL: Record<string, string> = {
  email: "Disparar e-mail (template)",
  whatsapp: "Enviar mensagem automática no WhatsApp",
  task: "Criar nova atividade",
};

const dealAutomationDefaults = {
  title: "",
  trigger_stage: 5,
  action_type: "email" as "email" | "whatsapp" | "task",
  task_type: "ligacao" as "ligacao" | "whatsapp",
  run_time: "09:00",
  skip_weekends: false,
  delay_days: 1,
  template_subject: "",
  template_body: "",
};

export default function AutomacoesPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", trigger_event: "", condition: "", channels: [] as string[] });

  const [dealAutomations, setDealAutomations] = useState<DealAutomation[]>([]);
  const [dealLoading, setDealLoading] = useState(true);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealForm, setDealForm] = useState(dealAutomationDefaults);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/automations");
    const data = await res.json();
    setAutomations(data.automations ?? []);
    setLoading(false);
  }

  async function loadDealAutomations() {
    setDealLoading(true);
    const res = await fetch("/api/deal-automations");
    const data = await res.json();
    setDealAutomations(data.automations ?? []);
    setDealLoading(false);
  }

  useEffect(() => {
    load();
    loadDealAutomations();
  }, []);

  async function toggleActive(automation: Automation) {
    await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !automation.active }),
    });
    load();
  }

  async function toggleDealActive(automation: DealAutomation) {
    await fetch(`/api/deal-automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !automation.active }),
    });
    loadDealAutomations();
  }

  async function deleteDealAutomation(automation: DealAutomation) {
    if (!confirm(`Excluir a automação "${automation.title}"?`)) return;
    await fetch(`/api/deal-automations/${automation.id}`, { method: "DELETE" });
    loadDealAutomations();
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

  async function createDealAutomation(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/deal-automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: dealForm.title,
        trigger_stage: dealForm.trigger_stage,
        action_type: dealForm.action_type,
        task_type: dealForm.action_type === "task" ? dealForm.task_type : undefined,
        run_time: dealForm.run_time || undefined,
        skip_weekends: dealForm.skip_weekends,
        delay_days: dealForm.delay_days,
        template_subject: dealForm.template_subject || undefined,
        template_body: dealForm.template_body || undefined,
      }),
    });
    setDealForm(dealAutomationDefaults);
    setShowDealForm(false);
    loadDealAutomations();
  }

  function scheduleSummary(a: DealAutomation) {
    const parts = [
      a.delay_days === 0 ? "no mesmo dia" : `${a.delay_days} dia${a.delay_days > 1 ? "s" : ""} depois`,
      a.skip_weekends ? "(dias úteis)" : null,
      a.run_time ? `às ${a.run_time.slice(0, 5)}` : null,
    ].filter(Boolean);
    return parts.join(" ");
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 28 }}>
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

        <div className="card" style={{ background: "var(--surface-muted)", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="msym" style={{ fontSize: 24, color: "var(--accent-darker)" }}>hub</span>
            <div>
              <div style={{ fontWeight: 700 }}>Automações do CRM por etapa</div>
              <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
                Ao mover um negócio para uma etapa, dispara e-mail, WhatsApp ou cria uma nova atividade automaticamente.
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowDealForm(true)}>
            + Nova automação de CRM
          </button>
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>hub</span>
          Automações de etapa ativas
        </h2>

        {dealLoading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {dealAutomations.map((a) => (
              <div key={a.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="msym" style={{ color: "var(--accent-darker)" }}>
                      {a.action_type === "email" ? "mail" : a.action_type === "whatsapp" ? "chat" : "task_alt"}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                      <input type="checkbox" checked={a.active} onChange={() => toggleDealActive(a)} />
                    </label>
                    <button onClick={() => deleteDealAutomation(a)} style={{ border: "none", background: "none", color: "var(--text-faint)" }} title="Excluir">
                      <span className="msym" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>
                  Quando entrar em: <strong>{STAGES[a.trigger_stage]}</strong>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{ACTION_LABEL[a.action_type]}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <span className="badge badge-ok">{scheduleSummary(a)}</span>
                  {a.action_type === "task" && <span className="badge badge-ok">{a.task_type === "whatsapp" ? "Mensagem WhatsApp" : "Ligação"}</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>{a.run_count} disparos</div>
              </div>
            ))}
            {dealAutomations.length === 0 && <p style={{ color: "var(--text-faint)" }}>Nenhuma automação de etapa cadastrada ainda.</p>}
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

      {showDealForm && (
        <div style={overlayStyle}>
          <form onSubmit={createDealAutomation} className="card" style={{ width: 440, background: "#fff", maxHeight: "88vh", overflowY: "auto" }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Criar automação de CRM</h2>
            <label style={labelStyle}>Nome da automação</label>
            <input required value={dealForm.title} onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Gatilho: ao mover o negócio para</label>
            <select
              value={dealForm.trigger_stage}
              onChange={(e) => setDealForm({ ...dealForm, trigger_stage: Number(e.target.value) })}
              style={inputStyle}
            >
              {STAGES.map((label, i) => (
                <option key={label} value={i}>{label}</option>
              ))}
            </select>

            <label style={labelStyle}>Ação</label>
            <select
              value={dealForm.action_type}
              onChange={(e) => setDealForm({ ...dealForm, action_type: e.target.value as typeof dealForm.action_type })}
              style={inputStyle}
            >
              <option value="email">Disparar e-mail (template)</option>
              <option value="whatsapp">Enviar mensagem automática no WhatsApp</option>
              <option value="task">Criar nova atividade</option>
            </select>

            {dealForm.action_type === "task" && (
              <>
                <label style={labelStyle}>Tipo de atividade</label>
                <select
                  value={dealForm.task_type}
                  onChange={(e) => setDealForm({ ...dealForm, task_type: e.target.value as typeof dealForm.task_type })}
                  style={inputStyle}
                >
                  <option value="ligacao">Ligação</option>
                  <option value="whatsapp">Mensagem no WhatsApp</option>
                </select>
              </>
            )}

            {dealForm.action_type === "email" && (
              <>
                <label style={labelStyle}>Assunto do e-mail</label>
                <input
                  value={dealForm.template_subject}
                  onChange={(e) => setDealForm({ ...dealForm, template_subject: e.target.value })}
                  style={inputStyle}
                  placeholder="Ex: {{academia}}, vamos fechar sua proposta?"
                />
              </>
            )}

            <label style={labelStyle}>
              {dealForm.action_type === "task" ? "Descrição da atividade" : "Mensagem / corpo do template"}
            </label>
            <textarea
              value={dealForm.template_body}
              onChange={(e) => setDealForm({ ...dealForm, template_body: e.target.value })}
              style={{ ...inputStyle, minHeight: 80 }}
              placeholder="Use {{nome}}, {{academia}}, {{valor}}, {{telefone}} e {{email}} como variáveis"
            />

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Dias depois</label>
                <input
                  type="number"
                  min={0}
                  value={dealForm.delay_days}
                  onChange={(e) => setDealForm({ ...dealForm, delay_days: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Horário do disparo</label>
                <input
                  type="time"
                  value={dealForm.run_time}
                  onChange={(e) => setDealForm({ ...dealForm, run_time: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 10, marginBottom: 18 }}>
              <input
                type="checkbox"
                checked={dealForm.skip_weekends}
                onChange={(e) => setDealForm({ ...dealForm, skip_weekends: e.target.checked })}
              />
              Não contabilizar sábado e domingo
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowDealForm(false)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 10, background: "#fff", padding: 11 }}>
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
