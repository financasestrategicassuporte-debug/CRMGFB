import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { NavLink } from "./nav-link";

const NAV = [
  { href: "/dashboard", icon: "grid_view", label: "Dashboard" },
  { href: "/crm", icon: "contacts", label: "CRM" },
];

/** Sidebar comum às páginas logadas — mesmo visual do mockup original
 * (logo, grupos de navegação, rodapé com o usuário). Redireciona pra
 * /login se não houver sessão, mesma regra que o middleware já aplica
 * em /api/*. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: "var(--bg-dark)",
          color: "#fff",
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <span className="msym" style={{ color: "var(--accent)" }}>fitness_center</span>
          <span style={{ fontWeight: 800, fontSize: 16 }}>
            GYM<span style={{ color: "var(--accent)" }}>PLUS</span>
          </span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>{profile?.name ?? user.email}</div>
          <div style={{ color: "var(--text-faint)", textTransform: "capitalize" }}>{profile?.role}</div>
        </div>
      </aside>

      <main style={{ flex: 1, background: "var(--surface-muted)" }}>{children}</main>
    </div>
  );
}
