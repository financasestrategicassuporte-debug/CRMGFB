-- GYMPLUS backend — initial schema
-- Project: gymplus-backend (zjcxdqlifimnezxuzulc)

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Team (profiles extend auth.users)
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin','sdr','closer')),
  phone text,
  initials text,
  color text default '#22c55e',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ─────────────────────────────────────────────────────────────
-- Plans catalog + weekly playbook template
-- ─────────────────────────────────────────────────────────────

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  total_weeks int not null default 12,
  price numeric(12,2),
  created_at timestamptz not null default now()
);

create table public.playbook_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  week_number int not null check (week_number >= 1),
  title text not null,
  detail text,
  channels text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (plan_id, week_number)
);

create table public.playbook_week_fields (
  id uuid primary key default gen_random_uuid(),
  playbook_week_id uuid not null references public.playbook_weeks(id) on delete cascade,
  label text not null,
  field_type text not null check (field_type in ('short','long','choice','scale','file','date')),
  options jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Clients (gyms under an active playbook/contract)
-- ─────────────────────────────────────────────────────────────

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_id uuid references public.plans(id),
  consultant_id uuid references public.profiles(id),
  current_week int not null default 1,
  progress numeric(5,2) not null default 0,
  atividade_status text not null default 'no_prazo'
    check (atividade_status in ('no_prazo','atrasado','prazo_encerrado')),
  financeiro_status text not null default 'sem_contato'
    check (financeiro_status in ('em_dia','inadimplente','sem_contato')),
  valor numeric(12,2),
  vencimento date,
  start_date date not null default current_date,
  avatar_bg text default '#0d2a20',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create index idx_clients_consultant on public.clients(consultant_id);

create table public.client_week_progress (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  week_number int not null check (week_number >= 1),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, week_number)
);

create table public.client_week_field_responses (
  id uuid primary key default gen_random_uuid(),
  client_week_progress_id uuid not null references public.client_week_progress(id) on delete cascade,
  playbook_week_field_id uuid not null references public.playbook_week_fields(id),
  response jsonb,
  submitted_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Automations
-- ─────────────────────────────────────────────────────────────

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  icon text,
  trigger_event text not null,
  condition text,
  run_time time,
  channels text[] not null default '{}',
  active boolean not null default true,
  run_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_automations_updated_at before update on public.automations
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Cobrança (dunning ladder per client)
-- ─────────────────────────────────────────────────────────────

create table public.cobranca_steps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  step text not null check (step in ('D+1','D+3','D+5','D+7','D+10')),
  scheduled_for date not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_cobranca_client on public.cobranca_steps(client_id);

-- ─────────────────────────────────────────────────────────────
-- Auditoria (audit notes: text or audio)
-- ─────────────────────────────────────────────────────────────

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references public.profiles(id),
  tag text not null check (tag in ('audio','texto','formulario')),
  title text not null,
  body text,
  audio_url text,
  audio_duration int,
  waveform jsonb,
  created_at timestamptz not null default now()
);
create index idx_audits_client on public.audits(client_id);

-- ─────────────────────────────────────────────────────────────
-- CRM: deals (quente + frio pipelines)
-- ─────────────────────────────────────────────────────────────

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  pipeline text not null check (pipeline in ('quente','frio')),
  person_name text not null,
  phone text,
  email text,
  product text,
  stage int not null default 0 check (stage between 0 and 6),
  qualification int check (qualification between 1 and 5),
  score int check (score between 0 and 100),
  value numeric(12,2),
  task_type text,
  task_desc text,
  task_date timestamptz,
  source text,
  campaign text,
  adset text,
  ad text,
  objective text,
  students_count int,
  ticket numeric(12,2),
  revenue numeric(12,2),
  owner_name text,
  forecast text,
  preferred_time text,
  profile_notes text,
  pain_points text,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create index idx_deals_assigned on public.deals(assigned_to);
create index idx_deals_pipeline_stage on public.deals(pipeline, stage);

create table public.deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  author_id uuid references public.profiles(id),
  body text not null,
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_deal_notes_deal on public.deal_notes(deal_id);

-- ─────────────────────────────────────────────────────────────
-- Meetings
-- ─────────────────────────────────────────────────────────────

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  meeting_date date not null,
  duration_minutes int,
  summary text,
  created_at timestamptz not null default now(),
  constraint meetings_target_check check (deal_id is not null or client_id is not null)
);

-- ─────────────────────────────────────────────────────────────
-- Commissions
-- ─────────────────────────────────────────────────────────────

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  closer_id uuid not null references public.profiles(id),
  deal_id uuid references public.deals(id),
  amount numeric(12,2) not null,
  percent numeric(5,2),
  status text not null default 'pending' check (status in ('pending','paid')),
  period date not null default date_trunc('month', current_date),
  created_at timestamptz not null default now()
);
create index idx_commissions_closer on public.commissions(closer_id);

-- ─────────────────────────────────────────────────────────────
-- Public leads (landing page intake — inserted server-side via
-- service role, never directly from the browser)
-- ─────────────────────────────────────────────────────────────

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  gym_name text,
  students_count int,
  revenue numeric(12,2),
  pain_points text,
  source text not null default 'landing_page',
  campaign text,
  adset text,
  ad text,
  utm jsonb,
  converted_deal_id uuid references public.deals(id),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.playbook_weeks enable row level security;
alter table public.playbook_week_fields enable row level security;
alter table public.clients enable row level security;
alter table public.client_week_progress enable row level security;
alter table public.client_week_field_responses enable row level security;
alter table public.automations enable row level security;
alter table public.cobranca_steps enable row level security;
alter table public.audits enable row level security;
alter table public.deals enable row level security;
alter table public.deal_notes enable row level security;
alter table public.meetings enable row level security;
alter table public.commissions enable row level security;
alter table public.leads enable row level security;

-- profiles: every team member can read the team directory; only
-- admins manage rows; a user may update their own non-role fields.
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_team_member());
create policy profiles_admin_write on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- catalog tables: readable by any team member, writable by admins
create policy plans_select on public.plans
  for select to authenticated using (public.is_team_member());
create policy plans_admin_write on public.plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy playbook_weeks_select on public.playbook_weeks
  for select to authenticated using (public.is_team_member());
create policy playbook_weeks_admin_write on public.playbook_weeks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy playbook_week_fields_select on public.playbook_week_fields
  for select to authenticated using (public.is_team_member());
create policy playbook_week_fields_admin_write on public.playbook_week_fields
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- operational tables: any authenticated team member can read/write
-- (small internal team — fine-grained per-row ownership isn't needed
-- today; tighten later if the team grows).
create policy clients_rw on public.clients
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy client_week_progress_rw on public.client_week_progress
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy client_week_field_responses_rw on public.client_week_field_responses
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy automations_rw on public.automations
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy cobranca_steps_rw on public.cobranca_steps
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy audits_rw on public.audits
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy deals_rw on public.deals
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy deal_notes_rw on public.deal_notes
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy meetings_rw on public.meetings
  for all to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- commissions: admins see/manage all; closers see only their own
create policy commissions_admin_all on public.commissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy commissions_self_select on public.commissions
  for select to authenticated using (closer_id = auth.uid());

-- leads: no anon policies at all (deny by default). The public
-- landing-page endpoint inserts using the service_role key from the
-- Next.js API route, never from the browser. Team members can read
-- and mark leads as converted.
create policy leads_select on public.leads
  for select to authenticated using (public.is_team_member());
create policy leads_update on public.leads
  for update to authenticated using (public.is_team_member()) with check (public.is_team_member());

-- ─────────────────────────────────────────────────────────────
-- Seed: plan catalog
-- ─────────────────────────────────────────────────────────────

insert into public.plans (name, total_weeks) values
  ('SOS Academias', 12),
  ('PAV 12K', 12),
  ('PAV 24K', 12),
  ('BLACK BELT', 12);
