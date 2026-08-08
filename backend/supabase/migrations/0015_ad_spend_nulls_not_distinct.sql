-- ad_spend.product_id é null pro investimento geral (mídia sem produto
-- específico) — a unique (product_id, period) original tratava dois
-- NULLs como distintos (comportamento padrão do Postgres), então o
-- upsert de lib/integrations/marketingSpend.ts (ON CONFLICT nessa
-- constraint) nunca detectava conflito pra linhas com product_id null e
-- ia duplicando uma linha nova por sync em vez de atualizar a existente.
alter table public.ad_spend
  drop constraint ad_spend_product_id_period_key,
  add constraint ad_spend_product_id_period_key unique nulls not distinct (product_id, period);
