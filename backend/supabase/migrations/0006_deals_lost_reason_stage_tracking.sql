-- Motivo de perda (selecionado ao marcar negociação como perdida) e
-- timestamp de quando o deal entrou no estágio atual — necessário pro
-- motor de automações por etapa (0007) calcular "N dias depois de entrar
-- nesta etapa" sem precisar de uma tabela de histórico separada.
alter table public.deals
  add column if not exists lost_reason text,
  add column if not exists stage_changed_at timestamptz not null default now();
