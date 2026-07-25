"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "E-mail ou senha inválidos");
        return;
      }
      router.push("/dashboard");
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
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ width: 360, background: "#fff" }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
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
          {loading ? "Entrando…" : "Entrar"}
        </button>

        <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 11, marginTop: 18, marginBottom: 0 }}>
          Ambiente restrito · todos os acessos são registrados
        </p>
      </form>
    </main>
  );
}
