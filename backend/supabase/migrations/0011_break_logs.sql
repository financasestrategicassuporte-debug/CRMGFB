-- Registro de pausa (banheiro/almoço/outro) — 100% voluntário, o
-- colaborador clica quando quer, só pra folha de ponto/horário de
-- almoço ficar documentado. Sem trigger, sem bloqueio de tela: é só uma
-- tabela de log com início/fim.
create table public.break_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  tipo text not null default 'outro' check (tipo in ('banheiro', 'almoco', 'outro')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_break_logs_profile on public.break_logs(profile_id);
create index idx_break_logs_open on public.break_logs(profile_id) where ended_at is null;

alter table public.break_logs enable row level security;

create policy break_logs_admin_all on public.break_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy break_logs_own on public.break_logs
  for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
