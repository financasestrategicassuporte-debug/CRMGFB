-- Configuração única (singleton) do motor de distribuição automática:
-- quando `auto_enabled` está ligado (e `paused` desligado), todo lead
-- novo que entra pelas planilhas (import manual, cron diário ou webhook
-- em tempo real) já é convertido em negociação e distribuído sozinho,
-- na estratégia escolhida — sem precisar abrir a tela e clicar em nada.
create table public.lead_distribution_settings (
  id uuid primary key default gen_random_uuid(),
  strategy text not null default 'round_robin' check (strategy in ('round_robin', 'balanceamento', 'peso', 'prioridade', 'manual')),
  auto_enabled boolean not null default false,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.lead_distribution_settings (strategy, auto_enabled, paused) values ('round_robin', false, false);

create trigger trg_lead_distribution_settings_updated_at before update on public.lead_distribution_settings
  for each row execute function public.set_updated_at();

alter table public.lead_distribution_settings enable row level security;

create policy lead_distribution_settings_read on public.lead_distribution_settings
  for select to authenticated using (public.is_team_member());
create policy lead_distribution_settings_admin_write on public.lead_distribution_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
