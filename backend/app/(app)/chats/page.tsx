"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Message = { id: string; direction: "in" | "out"; content: string; created_at: string };
type Conversation = {
  id: string;
  channel: string;
  ia_resumo: string | null;
  ia_intencao: string | null;
  ia_objecoes: string[] | null;
  sdr: { name: string } | null;
  deal: { person_name: string; product: string | null } | null;
  messages: { content: string; direction: string; created_at: string }[];
};

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadConversations() {
    const res = await fetch("/api/chats");
    const data = await res.json();
    setConversations(data.conversations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function openConversation(id: string) {
    setSelectedId(id);
    const res = await fetch(`/api/chats/${id}/messages`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  async function sendMessage() {
    if (!selectedId || !text.trim()) return;
    await fetch(`/api/chats/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: "out", content: text }),
    });
    setText("");
    openConversation(selectedId);
    loadConversations();
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div>
      <Banner
        title="Chats · IA"
        subtitle="Monitoramento de todas as conversas da operação"
        icon="forum"
        role="admin"
      />
      <div style={{ padding: 32, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, padding: 16, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent-darker)" }}>forum</span>
            Inbox · WhatsApp · Instagram · Messenger
          </h2>
          {loading ? (
            <p style={{ padding: 16 }}>Carregando…</p>
          ) : conversations.length === 0 ? (
            <p style={{ padding: 16, color: "var(--text-faint)" }}>
              Nenhuma conversa ainda — assim que o WhatsApp Cloud API estiver conectado, as mensagens chegam aqui automaticamente.
            </p>
          ) : (
            <div>
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid var(--border)",
                    cursor: "pointer",
                    background: selectedId === c.id ? "var(--surface-muted)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.deal?.person_name ?? "Lead"}</div>
                    {c.ia_intencao && <span className="badge badge-ok">{c.ia_intencao}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {c.messages?.[c.messages.length - 1]?.content ?? "Sem mensagens"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{c.sdr?.name} · {c.deal?.product}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card" style={{ background: "var(--bg-dark)", color: "#fff" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="msym" style={{ fontSize: 18, color: "var(--accent)" }}>smart_toy</span>
            IA da conversa
          </h2>
          {!selected ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Selecione uma conversa para ver o resumo da IA.</p>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>RESUMO</div>
                <div style={{ fontSize: 13 }}>{selected.ia_resumo ?? "Ainda sem resumo."}</div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>OBJEÇÕES</div>
                <div style={{ fontSize: 13 }}>{selected.ia_objecoes?.join(", ") || "Nenhuma detectada."}</div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 10, maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ textAlign: m.direction === "out" ? "right" : "left", marginBottom: 6 }}>
                    <span
                      style={{
                        display: "inline-block",
                        background: m.direction === "out" ? "var(--accent)" : "rgba(255,255,255,0.15)",
                        color: m.direction === "out" ? "#06140d" : "#fff",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 13,
                      }}
                    >
                      {m.content}
                    </span>
                  </div>
                ))}
                {messages.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Sem mensagens ainda.</p>}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Responder…"
                  style={{ flex: 1, borderRadius: 8, border: "none", padding: "8px 10px", fontSize: 13 }}
                />
                <button className="btn-primary" onClick={sendMessage}>Enviar</button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
