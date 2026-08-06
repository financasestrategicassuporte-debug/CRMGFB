-- Relatório de Execução: "tempo de resposta ao lead" precisa de um
-- marco de quando o SDR de fato tirou a negociação do estágio 0 (Sem
-- Contato) pela primeira vez. Em vez de espalhar essa lógica em cada
-- lugar que muda `stage` (kanban drag-and-drop, botões avançar/voltar,
-- detalhe do deal, ações em massa, automações), um trigger captura uma
-- única vez, não importa o caminho.
alter table public.deals
  add column if not exists first_contacted_at timestamptz;

create or replace function public.deals_set_first_contacted_at()
returns trigger as $$
begin
  if new.stage is distinct from old.stage
     and old.stage = 0
     and new.stage > 0
     and new.first_contacted_at is null then
    new.first_contacted_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deals_first_contacted_at on public.deals;
create trigger trg_deals_first_contacted_at
  before update on public.deals
  for each row execute function public.deals_set_first_contacted_at();
