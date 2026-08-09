/** `Date#toISOString()` converte pro fuso UTC — em qualquer horário da
 * noite no Brasil (UTC-3) isso já vira o dia seguinte, fazendo os
 * atalhos de período (Hoje/Ontem/7 dias/...) calcularem a data errada.
 * Usa os componentes locais do `Date` (fuso do navegador) pra sempre
 * bater com o calendário que o usuário está vendo. */
export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Atalhos do filtro "Período" — usados em Dashboard, CRM, Execução e
 * Leads Recebidos, centralizados aqui pra não dessincronizar entre
 * telas (cada uma tinha sua própria cópia até então). */
export function datePresets(): { label: string; from: string; to: string }[] {
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  return [
    { label: "Hoje", from: toISODate(today), to: toISODate(today) },
    { label: "Ontem", from: toISODate(daysAgo(1)), to: toISODate(daysAgo(1)) },
    { label: "7 dias", from: toISODate(daysAgo(6)), to: toISODate(today) },
    { label: "14 dias", from: toISODate(daysAgo(13)), to: toISODate(today) },
    { label: "30 dias", from: toISODate(daysAgo(29)), to: toISODate(today) },
    { label: "Esse mês", from: toISODate(thisMonthStart), to: toISODate(today) },
    { label: "Mês passado", from: toISODate(lastMonthStart), to: toISODate(lastMonthEnd) },
  ];
}
