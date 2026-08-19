-- Comissão por evento (reunião comparecida / venda fechada) passa a
-- poder variar por produto — produtos diferentes (PAV, Acelerador de
-- Matrículas...) têm ticket e margem diferentes, então faz sentido
-- comissionar diferente. `product_id null` é a regra "Geral" (usada
-- quando o negócio não tem produto definido, ou quando não existe
-- override específico pra aquele produto) — "unique nulls not distinct"
-- garante que só existe UMA linha Geral (mesmo caso do ad_spend:
-- por padrão o Postgres trata NULL como distinto de NULL, o que
-- deixaria criar infinitas linhas "Geral" sem essa cláusula).
create table public.commission_product_rates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.plans(id) on delete cascade,
  sdr_meeting_amount numeric not null default 0,
  sdr_sale_amount numeric not null default 0,
  closer_meeting_amount numeric not null default 0,
  closer_sale_amount numeric not null default 0,
  updated_at timestamptz not null default now(),
  constraint commission_product_rates_product_unique unique nulls not distinct (product_id)
);

-- Migra os valores que já estavam em commission_rules (R$10/R$10 de SDR,
-- que já valiam) pra virarem a regra "Geral" — ninguém perde comissão
-- retroativa nem tem o automático desligado por causa dessa migração.
insert into public.commission_product_rates (product_id, sdr_meeting_amount, sdr_sale_amount, closer_meeting_amount, closer_sale_amount)
select null, sdr_meeting_amount, sdr_sale_amount, closer_meeting_amount, closer_sale_amount
from public.commission_rules
limit 1;

alter table public.commission_rules
  drop column sdr_meeting_amount,
  drop column sdr_sale_amount,
  drop column closer_meeting_amount,
  drop column closer_sale_amount;

alter table public.commission_product_rates enable row level security;

create policy commission_product_rates_select on public.commission_product_rates
  for select using (is_team_member());

create policy commission_product_rates_admin_write on public.commission_product_rates
  for all using (is_admin()) with check (is_admin());
