"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none",
        color: active ? "#fff" : "var(--text-faint)",
        background: active ? "rgba(34,197,94,0.18)" : "transparent",
      }}
    >
      <span className="msym" style={{ fontSize: 20 }}>{icon}</span>
      {label}
    </Link>
  );
}
