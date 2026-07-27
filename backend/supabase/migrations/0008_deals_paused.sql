-- Status "Pausado" pro filtro de negociações do CRM (dropdown "Status da
-- negociação": Em andamento / Vendido / Perdido / Pausado / Não pausado)
-- — independente da etapa/stage, uma negociação pode ser colocada em
-- espera (ex: lead pediu pra retomar contato depois) sem perder o lugar
-- dela no funil.
alter table public.deals
  add column if not exists paused boolean not null default false;
