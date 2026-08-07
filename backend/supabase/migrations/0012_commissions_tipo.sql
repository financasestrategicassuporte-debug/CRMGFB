-- Comissões manuais: além de "por venda" (futuro, ainda sem cálculo
-- automático), o admin precisa lançar valor fixo (base mensal do SDR/
-- Closer) e valor extra (bônus pontual num período específico). `tipo`
-- deixa isso explícito pra separar na tela em vez de tudo virar uma
-- lista genérica.
alter table public.commissions
  add column if not exists tipo text not null default 'fixo' check (tipo in ('fixo', 'extra', 'venda'));
