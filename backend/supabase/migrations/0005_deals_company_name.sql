-- CRM cards/detalhe mostram "Academia – Contato" como título (igual ao
-- mockup) — faltava o nome da academia como campo próprio, só existia
-- o nome do contato (person_name).
alter table public.deals
  add column if not exists company_name text;
