-- GYMPLUS backend — operação completa (Performance, Funis, Gargalos,
-- Chats·IA, Matriz RFV, motor de automação com histórico, RBAC por dono).
-- Depende de 0001_init_gymplus_schema.sql.

-- ─────────────────────────────────────────────────────────────
-- Ajustes em tabelas existentes
-- ─────────────────────────────────────────────────────────────

alter table public.plans
  add column if not exists active boolean not null default true;

alter table public.deals
  add column if not exists product_id uuid references public.plans(id);
create index if not exists idx_deals_product on public.deals(product_id);

alter table public.clients
  add column if not exists closer_id uuid references public.profiles(id),
  add column if not exists unidade text,
  add column if not exists ticket_medio numeric(12,2),
  add column if not exists ltv numeric(12,2),
  add column if not exists data_primeira_compra date;
create index if not exists idx_clients_closer on public.clients(closer_id);

alter table public.automations
  add column if not exists condition_json jsonb,
  add column if not exists action_json jsonb;

-- ─────────────────────────────────────────────────────────────
-- Compras (histórico por cliente — alimenta a Matriz RFV)
-- ─────────────────────────────────────────────────────────────

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  product_id uuid references public.plans(id),
  valor numeric(12,2) not null,
  tipo text not null check (tipo in ('nova','renovacao','upsell','cross','indicacao')),
  data date not null default current_date,
  created_at timestamptz not null default now()
);
create index idx_purchases_client on public.purchases(client_id);
create index idx_purchases_data on public.purchases(data);

-- ─────────────────────────────────────────────────────────────
-- Matriz RFV: snapshot diário + migração de grupo
-- ─────────────────────────────────────────────────────────────

-- Os 12 grupos do ciclo de vida usados pela tela "Matriz RFV" (mesmos
-- nomes exibidos no front, para o mapeamento ficar 1:1 sem tradução).
create table public.rfv_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  data date not null default current_date,
  recencia int not null,
  frequencia int not null,
  valor numeric(12,2) not null default 0,
  ticket_medio numeric(12,2) not null default 0,
  tempo_entre_compras numeric(8,2),
  grupo text not null check (grupo in (
    'Campeão','Campeão se despedindo','Potencial campeão','Cliente fiel',
    'Jovem talento','Recém-chegado','Carente','Fiel abandonado',
    'Baixo potencial','Talento desperdiçado','Ex-campeão','Perdido'
  )),
  health_score int not null check (health_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (client_id, data)
);
create index idx_rfv_snapshots_client on public.rfv_snapshots(client_id, data desc);
create index idx_rfv_snapshots_data on public.rfv_snapshots(data);

create table public.group_migrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  grupo_origem text not null,
  grupo_destino text not null,
  data date not null default current_date,
  motivo text,
  impacto_financeiro numeric(12,2),
  created_at timestamptz not null default now()
);
create index idx_group_migrations_client on public.group_migrations(client_id);
create index idx_group_migrations_data on public.group_migrations(data);

-- ─────────────────────────────────────────────────────────────
-- Motor de automação: histórico de execução
-- ─────────────────────────────────────────────────────────────

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automations(id) on delete cascade,
  target_type text not null check (target_type in ('client','deal','lead')),
  target_id uuid not null,
  canal text not null,
  status text not null default 'success' check (status in ('success','skipped','failed')),
  detail text,
  executado_em timestamptz not null default now()
);
create index idx_automation_runs_rule on public.automation_runs(rule_id);
create index idx_automation_runs_target on public.automation_runs(target_type, target_id);

-- ─────────────────────────────────────────────────────────────
-- Chats · IA (conversas por canal + mensagens)
-- ─────────────────────────────────────────────────────────────

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  sdr_id uuid references public.profiles(id),
  channel text not null check (channel in ('whatsapp','instagram','messenger')),
  ia_resumo text,
  ia_intencao text,
  ia_objecoes jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_target_check check (deal_id is not null or lead_id is not null)
);
create trigger trg_conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();
create index idx_conversations_sdr on public.conversations(sdr_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  content text not null,
  created_at timestamptz not null default now()
);
create index idx_messages_conversation on public.messages(conversation_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- Investimento em mídia (alimenta CAC/ROI/ROAS — não existe
-- integração de mídia paga ainda, então é um valor editável pelo admin)
-- ─────────────────────────────────────────────────────────────

create table public.ad_spend (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.plans(id), -- null = investimento geral
  period date not null default date_trunc('month', current_date),
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, period)
);

-- ─────────────────────────────────────────────────────────────
-- RLS: tabelas novas
-- ─────────────────────────────────────────────────────────────

alter table public.purchases enable row level security;
alter table public.rfv_snapshots enable row level security;
alter table public.group_migrations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ad_spend enable row level security;

-- Inteligência de cliente (RFV) e mídia paga são visão de gestão — admin only.
create policy purchases_admin on public.purchases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy rfv_snapshots_admin on public.rfv_snapshots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy group_migrations_admin on public.group_migrations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ad_spend_admin on public.ad_spend
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Execuções de automação: qualquer membro do time lê (transparência do
-- disparo), só o service role (cron) escreve.
create policy automation_runs_select on public.automation_runs
  for select to authenticated using (public.is_team_member());

-- Conversas/mensagens: admin vê tudo; sdr/closer só as suas (dono = sdr_id).
create policy conversations_admin_all on public.conversations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy conversations_self on public.conversations
  for all to authenticated using (sdr_id = auth.uid()) with check (sdr_id = auth.uid());

create policy messages_admin_all on public.messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy messages_self on public.messages
  for all to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.sdr_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.sdr_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: corrigir a lacuna de RBAC em deals/deal_notes
-- (a policy anterior liberava qualquer membro do time para tudo;
-- agora sdr/closer só enxergam o que é deles, admin continua vendo tudo).
-- ─────────────────────────────────────────────────────────────

drop policy if exists deals_rw on public.deals;
create policy deals_admin_all on public.deals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy deals_owner_select on public.deals
  for select to authenticated using (assigned_to = auth.uid());
create policy deals_owner_update on public.deals
  for update to authenticated using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());
-- Insert liberado para qualquer membro do time (distribuição de leads
-- cria o deal já atribuído a um dono).
create policy deals_insert on public.deals
  for insert to authenticated with check (public.is_team_member());

drop policy if exists deal_notes_rw on public.deal_notes;
create policy deal_notes_admin_all on public.deal_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy deal_notes_owner on public.deal_notes
  for all to authenticated using (
    exists (select 1 from public.deals d where d.id = deal_notes.deal_id and d.assigned_to = auth.uid())
  ) with check (
    exists (select 1 from public.deals d where d.id = deal_notes.deal_id and d.assigned_to = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────
-- Seed: clientes de exemplo + compras sintéticas cobrindo os 12
-- grupos de ciclo de vida (para a Matriz RFV renderizar populada)
-- ─────────────────────────────────────────────────────────────

-- Ainda não existe nenhum `client` na base (só `plans` foi semeado em
-- 0001) — sem isso, o gerador de compras abaixo não teria em quê
-- inserir. `consultant_id`/`closer_id` ficam nulos (não há nenhum
-- `profiles` ainda, já que dependem de um `auth.users` real); o admin
-- atribui depois pela tela Time + PATCH /clients/:id. Nomes reaproveitam
-- as academias já mockadas no front (funil quente/frio) para o CRM e a
-- Matriz RFV baterem com o que aparece na tela.
insert into public.clients (name, plan_id, atividade_status, financeiro_status, valor, start_date)
select
  nome,
  (select id from public.plans order by random() limit 1),
  (array['no_prazo','no_prazo','no_prazo','atrasado','prazo_encerrado'])[1 + floor(random() * 5)::int],
  (array['em_dia','em_dia','em_dia','inadimplente','sem_contato'])[1 + floor(random() * 5)::int],
  800 + floor(random() * 4000)::int,
  current_date - floor(random() * 700)::int
from unnest(array[
  'ULTRA ACADEMIA', 'Skyfit', 'GOLDEN Club', 'Invictus Academia', 'Intense Academia',
  'Pleno Vigor', 'Forcee Academia', 'Academia Atlética', 'Funcional Attack', 'VIP Fitness',
  'V2 Fitness', 'Espaço Sena', 'PowerFit Center', 'Elite Training', 'CrossBox Aurora',
  'Studio Vitalis', 'Corpo em Forma', 'Academia Prime', 'Box Guerreiros', 'Fit Express',
  'Movimento Saudável', 'Academia Impacto', 'Corpo & Cia', 'Muscle House'
]) as nome;

-- Reaproveita os clients existentes: para cada um, gera de 1 a 6 compras
-- espalhadas nos últimos 24 meses, com valores e datas que produzem uma
-- distribuição plausível de recência/frequência/valor.
do $$
declare
  c record;
  n_compras int;
  i int;
  compra_data date;
  compra_valor numeric;
  tipos text[] := array['nova','renovacao','upsell','cross','indicacao'];
begin
  for c in select id, plan_id from public.clients loop
    n_compras := 1 + floor(random() * 6)::int;
    for i in 1..n_compras loop
      compra_data := current_date - ((n_compras - i) * (20 + floor(random() * 40)::int) + floor(random() * 15)::int);
      compra_valor := 800 + floor(random() * 4000)::int;
      insert into public.purchases (client_id, product_id, valor, tipo, data)
      values (
        c.id,
        c.plan_id,
        compra_valor,
        case when i = 1 then 'nova' else tipos[2 + floor(random() * 4)::int] end,
        compra_data
      );
    end loop;
  end loop;
end $$;
