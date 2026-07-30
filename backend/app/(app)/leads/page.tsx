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

export default function LeadsRecebidosPage() {
  const router = useRouter();
  const [role, setRole] = useState("admin");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"quente" | "frio">("quente");
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
        ? `Importação ${source}: ${data.imported?.length ?? 0} novo(s) lead(s), ${data.skipped ?? 0} já existente(s).`
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

  async function convertAndDistribute() {
    if (selected.size === 0) return;
    setProcessing(true);
    setMessage(null);
    const dealIds: string[] = [];
    for (const id of selected) {
      const res = await fetch(`/api/leads/${id}/convert`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        dealIds.push(data.deal.id);
      }
    }
    if (dealIds.length > 0) {
      await fetch("/api/leads/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: dealIds, strategy: "peso" }),
      });
    }
    setProcessing(false);
    setMessage(`${dealIds.length} negociação(ões) criada(s) e distribuída(s) para os SDRs.`);
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

        <div className="card" style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={selected.size > 0 && selected.size === allIds.length} onChange={() => toggleAll(allIds)} />
            {selected.size > 0 ? `${selected.size} selecionado(s)` : "Selecionar todos"}
          </label>
          <button className="btn-primary" onClick={convertAndDistribute} disabled={selected.size === 0 || processing} style={{ fontSize: 13 }}>
            {processing ? "Processando…" : "Converter e Distribuir para SDRs"}
          </button>
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
