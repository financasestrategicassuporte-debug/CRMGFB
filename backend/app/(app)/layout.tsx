import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { NavLink } from "./nav-link";
import { SairButton } from "./sair-button";
import { CallMount } from "./call/call-mount";
import { BreakWidget } from "./breaks/break-widget";

// Grupos e itens seguem exatamente a sidebar do mockup original
// (GESTÃO / SISTEMA OPERACIONAL / INTELIGÊNCIA DE CLIENTES / EQUIPE) —
// só entram aqui os itens cuja tela já existe de verdade; o resto
// (Automações, Gargalos, Funis, Performance, Chats, Comissões, Matriz
// RFV) some da lista até ser construído, pra não virar link morto.
const NAV_GROUPS_ADMIN = [
  {
    label: "GESTÃO",
    items: [
      { href: "/dashboard", icon: "grid_view", label: "Dashboard" },
      { href: "/crm", icon: "contacts", label: "CRM · Todos" },
      { href: "/leads", icon: "inbox", label: "Leads Recebidos" },
      { href: "/automacoes", icon: "bolt", label: "Automações" },
      { href: "/execucao", icon: "speed", label: "Relatório de Execução" },
    ],
  },
  {
    label: "SISTEMA OPERACIONAL",
    items: [
      { href: "/gargalos", icon: "troubleshoot", label: "Gargalos & Decisão" },
      { href: "/funis", icon: "filter_alt", label: "Funis por Produto" },
      { href: "/performance/sdr", icon: "call", label: "Performance SDR" },
      { href: "/performance/closer", icon: "handshake", label: "Performance Closer" },
      { href: "/produtos", icon: "category", label: "Dashboard Produtos" },
      { href: "/chats", icon: "forum", label: "Chats · IA" },
      { href: "/comissoes", icon: "savings", label: "Comissões" },
    ],
  },
  {
    label: "INTELIGÊNCIA DE CLIENTES",
    items: [{ href: "/rfv", icon: "insights", label: "Matriz RFV" }],
  },
  {
    label: "EQUIPE",
    items: [{ href: "/time", icon: "badge", label: "Time" }],
  },
];

// SDR/Closer só veem o próprio CRM e as próprias comissões por enquanto
// (Performance/Chats específicos deles entram numa próxima fase).
const NAV_GROUPS_TEAM = [
  {
    label: "GESTÃO",
    items: [
      { href: "/painel", icon: "local_fire_department", label: "Dashboard" },
      { href: "/crm", icon: "contacts", label: "Meu CRM" },
      { href: "/agenda", icon: "calendar_month", label: "Agenda" },
      { href: "/comissoes", icon: "savings", label: "Minhas Comissões" },
    ],
  },
];

/** Sidebar comum às páginas logadas — mesmo visual do mockup original
 * (logo, grupos de navegação, rodapé com o usuário). Redireciona pra
 * /login se não houver sessão, mesma regra que o middleware já aplica
 * em /api/*. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile();
  if (!user) redirect("/login");

  const groups = profile?.role === "admin" ? NAV_GROUPS_ADMIN : NAV_GROUPS_TEAM;

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
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span className="msym" style={{ color: "#06140d", fontSize: 20 }}>open_in_full</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.1 }}>
              CRM<span style={{ color: "var(--accent)" }}>GFB</span>
            </div>
            <div style={{ color: "var(--text-faint)", fontSize: 10 }}>Gestão Fitness Brasil</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          {groups.map((group) => (
            <div key={group.label}>
              <div
                style={{
                  color: "var(--text-faint)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "0 12px 6px",
                }}
              >
                {group.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {group.items.map((item) => (
                  <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/perfil" title="Meu Perfil">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: profile?.color ?? "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {profile?.initials ?? profile?.name?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
          </Link>
          <div style={{ minWidth: 0 }}>
            <Link href="/perfil" title="Meu Perfil" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.name ?? user.email}</div>
            </Link>
            <div style={{ color: "var(--text-faint)", textTransform: "capitalize", fontSize: 12 }}>{profile?.role}</div>
            <SairButton />
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, background: "var(--surface-muted)" }}>
        <CallMount>{children}</CallMount>
        <BreakWidget />
      </main>
    </div>
  );
}
