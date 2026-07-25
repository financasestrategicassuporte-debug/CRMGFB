const ROLE_PILLS = [
  { id: "admin", icon: "admin_panel_settings", label: "Admin" },
  { id: "sdr", icon: "shield_person", label: "SDR" },
  { id: "closer", icon: "handshake", label: "Closer" },
] as const;

/** Banner superior de toda página logada — título, subtítulo, os 3 pills
 * de papel (mostram o papel atual do usuário, sem trocar sessão — quem
 * decide o papel de verdade é o login) e o botão "Agendar Sessão". */
export function Banner({
  title,
  subtitle,
  icon,
  role,
}: {
  title: string;
  subtitle: string;
  icon: string;
  role: string;
}) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 32px",
        background: "#fff",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {title}
          <span className="msym" style={{ fontSize: 18, color: "var(--accent)" }}>{icon}</span>
        </h1>
        <p style={{ color: "var(--text-faint)", fontSize: 13, margin: "4px 0 0" }}>{subtitle}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", background: "var(--surface-muted)", borderRadius: 10, padding: 4, gap: 2 }}>
          {ROLE_PILLS.map((pill) => {
            const active = pill.id === role;
            return (
              <div
                key={pill.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: active ? "#fff" : "transparent",
                  color: active ? "var(--accent-darker)" : "var(--text-faint)",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <span className="msym" style={{ fontSize: 16 }}>{pill.icon}</span>
                {pill.label}
              </div>
            );
          })}
        </div>

        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="msym" style={{ fontSize: 16 }}>event_available</span>
          Agendar Sessão
        </button>
      </div>
    </header>
  );
}
