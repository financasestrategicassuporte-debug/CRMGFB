"use client";

import { useRouter } from "next/navigation";

export function SairButton() {
  const router = useRouter();

  async function handleClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        border: "none",
        background: "none",
        color: "var(--text-faint)",
        fontSize: 13,
        padding: 0,
        marginTop: 8,
      }}
    >
      <span className="msym" style={{ fontSize: 16 }}>logout</span>
      Sair
    </button>
  );
}
