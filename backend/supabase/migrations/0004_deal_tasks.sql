-- A visão de detalhe do deal (página cheia, igual ao mockup) tem uma
-- lista de tarefas própria ("Criar tarefa": assunto, descrição,
-- responsável, tipo) além das anotações — isso não existia no schema
-- (só tínhamos um único task_type/task_desc/task_date por deal). Vira
-- uma tabela de verdade, um-para-muitos.

create table public.deal_tasks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id),
  task_type text not null default 'tarefa',
  done boolean not null default false,
  due_date timestamptz,
  created_at timestamptz not null default now()
);
create index idx_deal_tasks_deal on public.deal_tasks(deal_id);

alter table public.deal_tasks enable row level security;

create policy deal_tasks_admin_all on public.deal_tasks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy deal_tasks_owner on public.deal_tasks
  for all to authenticated using (
    exists (select 1 from public.deals d where d.id = deal_tasks.deal_id and d.assigned_to = auth.uid())
  ) with check (
    exists (select 1 from public.deals d where d.id = deal_tasks.deal_id and d.assigned_to = auth.uid())
  );

-- "Marcar perda": hoje só existia ganhar (stage 6). Sem essa flag,
-- negociações perdidas ficariam presas num estágio ativo pra sempre.
alter table public.deals
  add column if not exists lost boolean not null default false;
