"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "../banner";

type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gym_name: string | null;
  students_count: number | null;
  revenue: number | null;
  pain_points: string | null;
  source: string;
  campaign: string | null;
  converted_deal_id: string | null;
  created_at: string;
};

const MARKETING_DASHBOARD_URL = "https://novodashoperamktetrf.vercel.app/";

function isQuente(lead: Lead) {
  return lead.source.includes("quente");
}

function fmtBRL(v: number | null) {
  if (!v) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const SOURCE_LABEL: Record<string, string> = {
  sheets_quente: "Planilha · Aplicação Webinário",
  sheets_frio: "Planilha · Meta Lead Ads",
  landing_page: "Landing Page",
};

const STRATEGY_OPTIONS: { value: string; icon: string; label: string; desc: string }[] = [
  { value: "round_robin", icon: "swap_horiz", label: "Round Robin", desc: "Distribui em círculo, um lead para cada SDR." },
  { value: "balanceamento", icon: "balance", label: "Balanceamento", desc: "Equaliza pela carga atual de cada SDR." },
  { value: "peso", icon: "lock", label: "Peso", desc: "Mais leads para SDRs de maior conversão." },
  { value: "prioridade", icon: "priority_high", label: "Prioridade", desc: "Leads quentes vão para os melhores." },
  { value: "manual", icon: "back_hand", label: "Manual", desc: "Gestor distribui caso a caso." },
];

export default function LeadsRecebidosPage() {
  const router = useRouter();
  const [role, setRole] = useState("admin");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"quente" | "frio">("quente");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [strategy, setStrategy] = useState("round_robin");
  const [importing, setImporting] = useState<"quente" | "frio" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads((data.leads ?? []).filter((l: Lead) => !l.converted_deal_id));
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setRole(d.profile?.role ?? "admin"));
    load();
    // Sincroniza as duas planilhas sozinho ao abrir a página — o usuário
    // não precisa clicar em "Importar" pra ver os leads mais recentes.
    // Isso roda em paralelo com um sync diário automático (ver
    // /api/cron/automations), que mantém a base em dia mesmo com a
    // página fechada.
    Promise.all([fetch("/api/leads/import?source=quente"), fetch("/api/leads/import?source=frio")]).then(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelected(new Set());
  }, [tab]);

  async function importFrom(source: "quente" | "frio") {
    setImporting(source);
    setMessage(null);
    const res = await fetch(`/api/leads/import?source=${source}`);
    const data = await res.json().catch(() => ({}));
    setImporting(null);
    setMessage(
      res.ok
        ? `Importação ${source}: ${data.imported ?? 0} novo(s) lead(s), ${data.skipped ?? 0} já existente(s).`
        : "Não foi possível importar agora."
    );
    load();
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelected((s) => (s.size === ids.length ? new Set() : new Set(ids)));
  }

  async function convertAndDistribute(ids: string[]) {
    if (ids.length === 0) return;
    setProcessing(true);
    setMessage(null);
    const dealIds: string[] = [];
    for (const id of ids) {
      const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        dealIds.push(data.deal.id);
      }
    }
    if (dealIds.length > 0 && strategy !== "manual") {
      await fetch("/api/leads/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: dealIds, strategy }),
      });
    }
    setProcessing(false);
    setMessage(
      strategy === "manual"
        ? `${dealIds.length} negociação(ões) criada(s). Atribua o dono manualmente em cada uma.`
        : `${dealIds.length} negociação(ões) criada(s) e distribuída(s) para os SDRs.`
    );
    setSelected(new Set());
    load();
  }

  async function convertOnly(id: string) {
    setProcessing(true);
    const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
    setProcessing(false);
    if (res.ok) {
      const data = await res.json();
      load();
      router.push(`/crm/${data.deal.id}`);
    }
  }

  const filtered = leads.filter((l) => (tab === "quente" ? isQuente(l) : !isQuente(l)));
  const allIds = filtered.map((l) => l.id);

  return (
    <div>
      <Banner
        title="Leads Recebidos"
        subtitle="Leads gerados pelo marketing, prontos para triagem e distribuição aos SDRs"
        icon="inbox"
        role={role}
      />
      <div style={{ padding: 32 }}>
        <div className="card" style={{ background: "var(--bg-dark)", color: "#fff", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="msym" style={{ fontSize: 24, color: "var(--accent)" }}>hub</span>
            <div>
              <div style={{ fontWeight: 700 }}>Fontes de leads</div>
              <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
                Quentes: planilha de aplicação do webinário. Frios: planilha de exportação do Meta Lead Ads.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={MARKETING_DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "9px 12px" }}
            >
              <span className="msym" style={{ fontSize: 15 }}>bar_chart</span>
              Ver Dashboard de Marketing
            </a>
            <button className="btn-primary" onClick={() => importFrom("quente")} disabled={importing === "quente"} style={{ fontSize: 13, padding: "9px 12px" }}>
              {importing === "quente" ? "Importando…" : "↻ Importar quentes"}
            </button>
            <button className="btn-primary" onClick={() => importFrom("frio")} disabled={importing === "frio"} style={{ fontSize: 13, padding: "9px 12px" }}>
              {importing === "frio" ? "Importando…" : "↻ Importar frios"}
            </button>
          </div>
        </div>

        {message && <p style={{ color: "var(--accent-darker)", fontSize: 13, marginBottom: 14 }}>{message}</p>}

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setTab("quente")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 10,
              border: `1px solid ${tab === "quente" ? "var(--accent)" : "var(--border)"}`,
              background: "#fff",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span className="msym" style={{ fontSize: 15, color: "#f97316" }}>local_fire_department</span>
            Leads Quentes ({leads.filter(isQuente).length})
          </button>
          <button
            onClick={() => setTab("frio")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 10,
              border: `1px solid ${tab === "frio" ? "var(--accent)" : "var(--border)"}`,
              background: "#fff",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span className="msym" style={{ fontSize: 15, color: "#38bdf8" }}>ac_unit</span>
            Leads Frios ({leads.filter((l) => !isQuente(l)).length})
          </button>
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            <span className="msym" style={{ fontSize: 20, color: "var(--accent-darker)" }}>sync_alt</span>
            Motor de distribuição de leads
          </div>
          <p style={{ color: "var(--text-faint)", fontSize: 12.5, marginBottom: 14 }}>
            Leads do Marketing entram na plataforma e são distribuídos automaticamente aos SDRs. Escolha a estratégia.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
            {STRATEGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStrategy(opt.value)}
                style={{
                  textAlign: "left",
                  border: `1px solid ${strategy === opt.value ? "var(--accent)" : "var(--border)"}`,
                  background: strategy === opt.value ? "var(--status-ok-bg)" : "#fff",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <span className="msym" style={{ fontSize: 18, color: strategy === opt.value ? "var(--accent-darker)" : "var(--text-faint)", display: "block", marginBottom: 6 }}>
                  {opt.icon}
                </span>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.3 }}>{opt.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
              <input type="checkbox" checked={selected.size > 0 && selected.size === allIds.length} onChange={() => toggleAll(allIds)} />
              {selected.size > 0 ? `${selected.size} selecionado(s)` : `Nenhum selecionado — distribui os ${allIds.length} da aba`}
            </label>
            <button
              className="btn-primary"
              onClick={() => convertAndDistribute(selected.size > 0 ? [...selected] : allIds)}
              disabled={allIds.length === 0 || processing}
              style={{ fontSize: 13 }}
            >
              {processing ? "Processando…" : "Distribuir por Performance"}
            </button>
          </div>
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((lead) => (
              <div key={lead.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
                <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{lead.name}</span>
                    {lead.gym_name && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>· {lead.gym_name}</span>}
                    <span className="badge badge-ok">{SOURCE_LABEL[lead.source] ?? lead.source}</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
                    {lead.phone && <span><span className="msym" style={{ fontSize: 13, verticalAlign: "middle" }}>call</span> {lead.phone}</span>}
                    {lead.email && <span><span className="msym" style={{ fontSize: 13, verticalAlign: "middle" }}>mail</span> {lead.email}</span>}
                    {lead.revenue != null && <span>Faturamento ~{fmtBRL(lead.revenue)}</span>}
                    {lead.students_count != null && <span>{lead.students_count} alunos</span>}
                    {lead.campaign && <span title={lead.campaign} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Campanha: {lead.campaign}</span>}
                    <span>{fmtDate(lead.created_at)}</span>
                  </div>
                  {lead.pain_points && (
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, fontStyle: "italic" }}>&ldquo;{lead.pain_points}&rdquo;</div>
                  )}
                </div>
                <button
                  onClick={() => convertOnly(lead.id)}
                  disabled={processing}
                  style={{ border: "1px solid var(--border)", borderRadius: 8, background: "#fff", padding: "8px 12px", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}
                >
                  Converter →
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ color: "var(--text-faint)", textAlign: "center", padding: 20 }}>
                Nenhum lead {tab === "quente" ? "quente" : "frio"} pendente. Clique em &ldquo;Importar&rdquo; pra buscar novos.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
