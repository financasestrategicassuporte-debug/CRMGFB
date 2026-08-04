-- Excluir uma negociação estava falhando silenciosamente: `leads`
-- (converted_deal_id) e `commissions` (deal_id) referenciam `deals` sem
-- regra de exclusão (default "no action"/RESTRICT), então qualquer
-- negociação criada a partir de um lead — ou seja, quase todas depois do
-- import das planilhas — bloqueava o DELETE com violação de FK. Muda pra
-- SET NULL: excluir a negociação apaga só a referência pendurada, não o
-- lead/comissão em si.
alter table public.leads
  drop constraint leads_converted_deal_id_fkey,
  add constraint leads_converted_deal_id_fkey
    foreign key (converted_deal_id) references public.deals(id) on delete set null;

alter table public.commissions
  drop constraint commissions_deal_id_fkey,
  add constraint commissions_deal_id_fkey
    foreign key (deal_id) references public.deals(id) on delete set null;
