"use client";

import { useEffect, useState } from "react";
import { Banner } from "../banner";

type Profile = { id: string; name: string; email: string; role: string; initials: string | null; color: string | null };

const ROLE_LABEL: Record<string, string> = { admin: "Admin", sdr: "SDR", closer: "Closer" };

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile ?? null);
        setName(d.profile?.name ?? "");
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setSaved(true);
    }
  }

  return (
    <div>
      <Banner title="Meu Perfil" subtitle="Seus dados de acesso à plataforma" icon="account_circle" role={profile?.role ?? "admin"} />
      <div style={{ padding: 32 }}>
        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div className="card" style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: profile?.color ?? "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {profile?.initials ?? profile?.name?.slice(0, 2).toUpperCase() ?? "??"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{profile?.name}</div>
                <span className="badge badge-ok">{ROLE_LABEL[profile?.role ?? ""] ?? profile?.role}</span>
              </div>
            </div>

            <form onSubmit={save}>
              <label style={labelStyle}>Nome</label>
              <input required value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} style={inputStyle} />

              <label style={labelStyle}>E-mail</label>
              <input value={profile?.email ?? ""} disabled style={{ ...inputStyle, background: "var(--surface-muted)" }} />
              <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: -2, marginBottom: 18 }}>
                Papel e e-mail só podem ser alterados por um admin, em Time.
              </p>

              <button type="submit" disabled={saving || !name.trim()} className="btn-primary" style={{ width: "100%", opacity: saving || !name.trim() ? 0.6 : 1 }}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </button>
              {saved && (
                <p style={{ fontSize: 12.5, color: "var(--accent-darker)", fontWeight: 700, marginTop: 10, marginBottom: 0, textAlign: "center" }}>
                  ✓ Nome atualizado — já aparece assim em todo o sistema.
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6, marginTop: 10 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  marginBottom: 6,
};
