-- Regra base de comissionamento (fixa mensal automática): 1 valor pra
-- todo SDR ativo, 1 valor pra todo Closer ativo — sem precisar lançar
-- "+ Nova comissão" pessoa por pessoa. Campanha ativa/valores de campanha
-- são um valor alternativo que, enquanto ligado, substitui o valor base
-- na hora de gerar as fixas do período corrente (não retroage sobre
-- fixas já lançadas). Singleton — mesmo padrão de lead_distribution_settings.
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  sdr_base_amount numeric not null default 0,
  closer_base_amount numeric not null default 0,
  campaign_active boolean not null default false,
  campaign_label text,
  campaign_sdr_amount numeric,
  campaign_closer_amount numeric,
  updated_at timestamptz not null default now()
);

insert into public.commission_rules (sdr_base_amount, closer_base_amount) values (0, 0);

alter table public.commission_rules enable row level security;

create policy commission_rules_select on public.commission_rules
  for select using (is_team_member());

create policy commission_rules_admin_write on public.commission_rules
  for all using (is_admin()) with check (is_admin());
