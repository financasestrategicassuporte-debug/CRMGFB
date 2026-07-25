-- Fechar uma negociação no CRM (POST /api/deals/:id/close) grava uma
-- purchase pra Matriz RFV já enxergar a venda. Isso é feito por
-- SDR/Closer no dia a dia, não só por admin — a policy anterior
-- (purchases_admin, "for all") bloqueava esse insert pra quem não é
-- admin. Mantém leitura/edição/exclusão restritas a admin (é dado de
-- inteligência de cliente), mas libera INSERT para qualquer membro do
-- time.
drop policy if exists purchases_admin on public.purchases;

create policy purchases_admin_all on public.purchases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy purchases_team_insert on public.purchases
  for insert to authenticated with check (public.is_team_member());
