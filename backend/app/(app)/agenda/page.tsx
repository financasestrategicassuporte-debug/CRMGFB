"use client";

import { useEffect, useMemo, useState } from "react";
import { Banner } from "../banner";
import { toISODate } from "@/lib/dates";

type Task = {
  id: string;
  title: string;
  task_type: string;
  due_date: string;
  done: boolean;
  deal: { id: string; person_name: string; company_name: string | null } | null;
  assignee: { id: string; name: string; initials: string | null; color: string | null } | null;
};

type TeamMember = { id: string; name: string; role: string };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  reuniao: { icon: "groups", color: "var(--accent-darker)", bg: "var(--status-ok-bg)" },
  ligacao: { icon: "call", color: "#1d4ed8", bg: "#dbeafe" },
};

function monthLabel(d: Date) {
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildWeeks(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export default function AgendaPage() {
  const [role, setRole] = useState("sdr");
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [userFilter, setUserFilter] = useState("");
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(toISODate(new Date()));

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setRole(d.profile?.role ?? "sdr"));
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setTeam((d.team ?? []).filter((t: TeamMember) => t.role === "sdr" || t.role === "closer")));
  }, []);

  useEffect(() => {
    setLoading(true);
    const from = toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
    const to = toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
    const params = new URLSearchParams({ from, to });
    if (userFilter) params.set("user_id", userFilter);
    fetch(`/api/agenda?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.tasks ?? []);
        setLoading(false);
      });
  }, [monthDate, userFilter]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      const key = toISODate(new Date(t.due_date));
      (map[key] ??= []).push(t);
    }
    return map;
  }, [tasks]);

  const weeks = buildWeeks(monthDate);
  const todayIso = toISODate(new Date());
  const selectedTasks = tasksByDay[selectedDay] ?? [];

  return (
    <div>
      <Banner title="Agenda" subtitle="Reuniões e ligações agendadas, num calendário só" icon="calendar_month" role={role} />
      <div style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={navBtnStyle}>
              <span className="msym" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, minWidth: 170, textAlign: "center" }}>{monthLabel(monthDate)}</div>
            <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={navBtnStyle}>
              <span className="msym" style={{ fontSize: 18 }}>chevron_right</span>
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDay(toISODate(now));
              }}
              style={{ ...navBtnStyle, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 700 }}
            >
              Hoje
            </button>
          </div>
          {role === "admin" && (
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 13 }}>
              <option value="">Todo o time</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.role === "sdr" ? "SDR" : "Closer"})</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p>Carregando…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
                {WEEKDAYS.map((w) => (
                  <div key={w} style={{ padding: "10px 6px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textAlign: "center", textTransform: "uppercase" }}>
                    {w}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < weeks.length - 1 ? "1px solid var(--border)" : "none" }}>
                  {week.map((day) => {
                    const iso = toISODate(day);
                    const inMonth = day.getMonth() === monthDate.getMonth();
                    const dayTasks = tasksByDay[iso] ?? [];
                    const isToday = iso === todayIso;
                    const isSelected = iso === selectedDay;
                    return (
                      <button
                        key={iso}
                        onClick={() => setSelectedDay(iso)}
                        style={{
                          minHeight: 92,
                          border: "none",
                          borderRight: "1px solid var(--border)",
                          background: isSelected ? "var(--status-ok-bg)" : "#fff",
                          padding: 6,
                          textAlign: "left",
                          cursor: "pointer",
                          opacity: inMonth ? 1 : 0.4,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: isToday ? 800 : 600,
                            color: isToday ? "#fff" : "var(--text)",
                            background: isToday ? "var(--accent)" : "transparent",
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 4,
                          }}
                        >
                          {day.getDate()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {dayTasks.slice(0, 3).map((t) => {
                            const style = TYPE_STYLE[t.task_type] ?? TYPE_STYLE.ligacao;
                            return (
                              <div
                                key={t.id}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: style.color,
                                  background: style.bg,
                                  borderRadius: 4,
                                  padding: "1px 4px",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  textDecoration: t.done ? "line-through" : "none",
                                }}
                              >
                                {new Date(t.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {t.deal?.person_name ?? t.title}
                              </div>
                            );
                          })}
                          {dayTasks.length > 3 && (
                            <div style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 700 }}>+{dayTasks.length - 3} mais</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="card">
              <h2 style={{ fontSize: 14, fontWeight: 700, marginTop: 0 }}>
                {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedTasks.map((t) => {
                  const style = TYPE_STYLE[t.task_type] ?? TYPE_STYLE.ligacao;
                  return (
                    <div key={t.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span className="msym" style={{ fontSize: 15, color: style.color }}>{style.icon}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: style.color }}>
                          {new Date(t.due_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {t.done && <span className="badge badge-ok" style={{ marginLeft: "auto" }}>Concluída</span>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{t.deal?.company_name ? `${t.deal.company_name} — ${t.deal.person_name}` : t.deal?.person_name ?? t.title}</div>
                      {role === "admin" && t.assignee && (
                        <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>{t.assignee.name}</div>
                      )}
                    </div>
                  );
                })}
                {selectedTasks.length === 0 && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Nada agendado nesse dia.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "#fff",
  color: "var(--text-faint)",
};
