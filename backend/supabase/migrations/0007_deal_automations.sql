-- Automações de CRM disparadas por etapa do funil (deals), separadas do
-- motor de automações do playbook de clientes (public.automations, que é
-- orientado a `atividade_status`/`financeiro_status`). Aqui o gatilho é
-- "negócio entrou na etapa X" e a ação roda `delay_days` (úteis ou
-- corridos) depois, num horário fixo — ex: 2 dias úteis depois de entrar
-- em "Em Negociação/Proposta", às 09:00, dispara e-mail de follow-up.

create table public.deal_automations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  trigger_stage int not null check (trigger_stage between 0 and 6),
  action_type text not null check (action_type in ('email','whatsapp','task')),
  task_type text check (task_type in ('ligacao','whatsapp')),
  run_time time,
  skip_weekends boolean not null default false,
  delay_days int not null default 0 check (delay_days >= 0),
  template_subject text,
  template_body text,
  active boolean not null default true,
  run_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_deal_automations_updated_at before update on public.deal_automations
  for each row execute function public.set_updated_at();

create table public.deal_automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.deal_automations(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  stage_changed_at timestamptz not null,
  status text not null,
  detail text,
  executed_at timestamptz not null default now(),
  unique (rule_id, deal_id, stage_changed_at)
);
create index idx_deal_automation_runs_rule on public.deal_automation_runs(rule_id);

alter table public.deal_automations enable row level security;
alter table public.deal_automation_runs enable row level security;

create policy deal_automations_rw on public.deal_automations
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy deal_automation_runs_select on public.deal_automation_runs
  for select to authenticated using (public.is_team_member());
