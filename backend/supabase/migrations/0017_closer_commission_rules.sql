-- Estende a regra base pra cobrir também o comissionamento por evento
-- (reunião comparecida / venda fechada) — até aqui só existia hardcoded
-- pra SDR (R$10/R$10, direto no código) e nunca existiu pra Closer.
-- Agora os 4 valores (SDR/Closer × reunião/venda) ficam configuráveis
-- em /comissoes (admin), com fallback pros R$10/R$10 que já estavam
-- valendo pra SDR — ninguém perde comissão retroativa por causa dessa
-- migração.
alter table public.commission_rules
  add column sdr_meeting_amount numeric not null default 10,
  add column sdr_sale_amount numeric not null default 10,
  add column closer_meeting_amount numeric not null default 0,
  add column closer_sale_amount numeric not null default 0;

update public.commission_rules set sdr_meeting_amount = 10, sdr_sale_amount = 10;

-- A constraint (deal_id, tipo) só deixava UMA comissão de "reuniao"/"venda"
-- por negociação, no total — impedia SDR e Closer ganharem cada um a sua
-- pela mesma negociação (são papéis diferentes na mesma venda). Troca pra
-- (deal_id, tipo, closer_id): cada colaborador só ganha uma vez por
-- negociação/tipo, mas SDR e Closer podem coexistir.
alter table public.commissions
  drop constraint commissions_deal_tipo_unique,
  add constraint commissions_deal_tipo_unique unique (deal_id, tipo, closer_id);
