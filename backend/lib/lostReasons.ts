import { LOST_REASON_REVOKES_SDR_COMMISSION } from "./commissionRules";
import { MEETING_HAPPENED_LOST_REASON } from "./funnels";

/** Lista canônica dos motivos de perda — usada tanto no formulário de
 * marcar como perdido (crm/[id]) quanto na categorização de
 * "Motivos de perda" em Funis por Produto, pra nunca ficarem
 * dessincronizados. */
export const LOST_REASONS = [
  "Lead desqualificado",
  MEETING_HAPPENED_LOST_REASON,
  "Fechou com a concorrência",
  "Não consegui mais contato, pois sumiu",
  "Lead duplicado",
  "Não tem interesse",
  LOST_REASON_REVOKES_SDR_COMMISSION,
];
