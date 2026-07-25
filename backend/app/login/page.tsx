"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { id: "admin", icon: "admin_panel_settings", label: "Admin", desc: "Monitora toda a operação" },
  { id: "sdr", icon: "shield_person", label: "SDR", desc: "Prospecção e agendamento" },
  { id: "closer", icon: "handshake", label: "Closer", desc: "Fechamento e receita" },
] as const;

// Para onde cada papel vai depois do login. SDR/Closer caem no CRM (que já
// filtra pelos próprios deals via RLS); as telas de Performance/Chats/
// Comissões específicas deles ainda não existem — entram numa próxima fase.
const ROLE_HOME: Record<string, string> = { admin: "/dashboard", sdr: "/crm", closer: "/crm" };

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<(typeof ROLES)[number]["id"]>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "E-mail ou senha inválidos");
        return;
      }
      // O papel de verdade vem do perfil autenticado, não do card
      // selecionado visualmente (esse é só um atalho de navegação).
      const actualRole: string = body.profile?.role ?? selectedRole;
      router.push(ROLE_HOME[actualRole] ?? "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark)",
        padding: 24,
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: 400, background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              display: "inline-flex",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--accent)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <span className="msym" style={{ color: "#06140d", fontSize: 30 }}>
              fitness_center
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            GYM<span style={{ color: "var(--accent)" }}>PLUS</span>
          </h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, margin: "4px 0 0" }}>
            Acessar plataforma
          </p>
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Selecione seu perfil de acesso</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {ROLES.map((role) => {
            const active = selectedRole === role.id;
            return (
              <button
                type="button"
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                style={{
                  flex: 1,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "rgba(34,197,94,0.08)" : "#fff",
                  borderRadius: 10,
                  padding: "10px 6px",
                  textAlign: "center",
                }}
              >
                <span className="msym" style={{ display: "block", color: active ? "var(--accent-darker)" : "var(--text-faint)", marginBottom: 4 }}>
                  {role.icon}
                </span>
                <div style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--accent-darker)" : "var(--text)" }}>
                  {role.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{role.desc}</div>
              </button>
            );
          })}
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "11px 13px",
            marginBottom: 14,
            fontSize: 14,
          }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6 }}>
          Senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "11px 13px",
            marginBottom: 20,
            fontSize: 14,
          }}
        />

        {error && (
          <p style={{ color: "var(--status-late-fg)", fontSize: 13, marginTop: -10, marginBottom: 14 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%" }}>
          {loading ? "Entrando…" : `Entrar como ${ROLES.find((r) => r.id === selectedRole)?.label}`}
        </button>

        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 11, marginTop: 18, marginBottom: 0 }}>
          Ambiente restrito · todos os acessos são registrados
        </p>
      </form>
    </main>
  );
}
