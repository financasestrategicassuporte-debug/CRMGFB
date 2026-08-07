-- Comissionamento automático do SDR: R$10 por reunião qualificada
-- comparecida (negócio cruza pra etapa >= 3 pela primeira vez) + R$10
-- de bônus quando a negociação que ele é dono fecha em venda. `tipo`
-- ganha 'reuniao'; a constraint (deal_id, tipo) evita lançar duas vezes
-- pro mesmo negócio (NULLs de deal_id, usados pelas comissões manuais
-- fixo/extra, não colidem entre si — Postgres trata NULL como distinto
-- em unique).
alter table public.commissions
  drop constraint commissions_tipo_check,
  add constraint commissions_tipo_check check (tipo in ('fixo', 'extra', 'venda', 'reuniao'));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'commissions_deal_tipo_unique') then
    alter table public.commissions add constraint commissions_deal_tipo_unique unique (deal_id, tipo);
  end if;
end $$;

alter table public.deals
  add column if not exists first_attended_at timestamptz;

create or replace function public.deals_set_first_attended_at()
returns trigger as $$
begin
  if new.stage is distinct from old.stage
     and old.stage < 3
     and new.stage >= 3
     and new.first_attended_at is null then
    new.first_attended_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deals_first_attended_at on public.deals;
create trigger trg_deals_first_attended_at
  before update on public.deals
  for each row execute function public.deals_set_first_attended_at();
