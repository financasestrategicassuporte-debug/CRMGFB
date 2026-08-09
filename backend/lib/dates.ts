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
