# GYMPLUS Backend

API interna (Next.js App Router + Supabase) para o painel de operações/CRM
GYMPLUS — a ferramenta que a equipe usa para vender e entregar a consultoria
de marketing para academias (pipeline de vendas, playbook semanal de
onboarding dos clientes, cobrança, automações, comissões).

## Stack

- **Next.js 14 (App Router)** — rotas de API como serverless functions, deploy nativo na Vercel.
- **Supabase** (Postgres + Auth) — projeto `gymplus-backend` (`zjcxdqlifimnezxuzulc`), separado do projeto Supabase usado pela agenda/calendário do time.
- **zod** para validação de entrada.

> Nota: o projeto Supabase existente (`vsnfqohptlporesdfrtx`, usado por
> `team_members`/`routine_blocks`/`events`/`gfb_models`) é de outra
> ferramenta interna (agenda do time + diagnóstico financeiro) e não foi
> tocado além de habilitar RLS nas 3 tabelas que estavam sem proteção.

## Estrutura

```
backend/
  app/
    api/
      auth/{login,logout,me}          — autenticação (Supabase Auth)
      team/                            — gestão do time (admin)
      plans/                           — catálogo de planos (SOS Academias, PAV 12K, PAV 24K, BLACK BELT)
      clients/                         — clientes (academias) em playbook ativo
        [id]/weeks/[week]              — progresso semanal + respostas de formulário
        [id]/cobranca                  — régua de cobrança D+1..D+10
        [id]/audits                    — auditorias (texto/áudio/formulário)
      automations/                     — automações (regras SE→ENTÃO)
      deals/                           — funil de CRM (pipelines quente/frio)
        [id]/notes                     — anotações do negócio
        [id]/qualify                   — wizard de qualificação (scoring automático)
      meetings/                        — reuniões
      commissions/                     — comissões de closers
      leads/                           — intake público da landing page (+ /[id]/convert)
        distribute                     — motor de distribuição (round robin/balanceamento/peso/prioridade/manual)
        import                         — importação do Google Sheets (funil quente/frio; no-op sem credencial)
      commercial/summary               — dashboards agregados (produto/SDR/closer)
      performance/sdr, performance/closer (+ [id])  — funil + ranking, filtrado por dono se não-admin
      funnels/product/[id], funnels/general         — funil por produto e consolidado
      products/dashboard               — CAC/ROI/ROAS por produto (usa `ad_spend`)
      bottlenecks, decisions           — motor de gargalos e recomendações (regras determinísticas)
      chats/ (+ [id]/messages)         — inbox de conversas + "IA da conversa" (heurística por palavra-chave)
      webhooks/whatsapp                — handshake + inbound da WhatsApp Cloud API
      rfv/{overview,priorities,migration,recurrence,evolution,alerts,client/[id]} — Matriz RFV
      cron/rfv-recalc                  — recálculo diário de recência/frequência/valor/grupo (protegido por CRON_SECRET)
      cron/automations                 — dispara as automações ativas (protegido por CRON_SECRET)
  lib/
    supabase/{server,admin,middleware}.ts
    auth.ts, validation.ts, scoring.ts, api.ts, types.ts
    rfv.ts, bottlenecks.ts, distribution.ts, chatAi.ts, automationEngine.ts,
    performance.ts, funnels.ts       — módulos determinísticos (sem chamada a IA/LLM externo)
    integrations/{whatsapp,sheets,email}.ts — adapters que fazem no-op/log sem credencial configurada
  supabase/migrations/0001_init_gymplus_schema.sql, 0002_operacao_completa.sql
  middleware.ts                        — protege /api/* exigindo sessão (exceto login, POST /api/leads, webhook do WhatsApp e /api/cron/*)
  vercel.json                          — agenda dos crons (rfv-recalc 06:00, automations 08:00)
```

## Modelo de dados

Ver [`supabase/migrations/0001_init_gymplus_schema.sql`](supabase/migrations/0001_init_gymplus_schema.sql)
e [`0002_operacao_completa.sql`](supabase/migrations/0002_operacao_completa.sql).
Principais tabelas: `profiles` (time: admin/sdr/closer), `plans` +
`playbook_weeks` + `playbook_week_fields` (template do onboarding de 12
semanas), `clients` + `client_week_progress` + `client_week_field_responses`
(cliente e seu progresso semana a semana), `automations` (+ `automation_runs`
com o histórico de disparo), `cobranca_steps` (régua de inadimplência),
`audits`, `deals` + `deal_notes` (CRM), `meetings`, `commissions`, `leads`
(intake público), `purchases` + `rfv_snapshots` + `group_migrations`
(Matriz RFV), `conversations` + `messages` (Chats·IA), `ad_spend`
(investimento em mídia por produto/mês — único jeito de alimentar
CAC/ROI/ROAS honestamente sem integração de mídia paga ainda).

Todas as tabelas têm **Row Level Security habilitada**. `profiles`,
`plans`, `purchases`, `rfv_snapshots`, `group_migrations` e `ad_spend` só
são editáveis por `admin`; `deals`/`deal_notes` e `conversations`/
`messages` seguem a regra de ouro do RBAC — admin vê/edita tudo, sdr/closer
só o que é deles (`assigned_to`/`sdr_id`); as demais tabelas operacionais
continuam liberadas para qualquer membro autenticado do time; `leads` não
tem nenhuma política para `anon` — o insert público só acontece via
`POST /api/leads`, que usa a service role key no servidor.

## Rodando localmente

```bash
cd backend
npm install
cp .env.example .env.local   # preencha SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

A `SUPABASE_SERVICE_ROLE_KEY` fica em Supabase Dashboard → Project Settings
→ API → `service_role` (secret). **Nunca** commitar esse valor.

### Criando o primeiro usuário admin

Como não existe nenhum usuário ainda, crie o primeiro admin direto pelo
Supabase Dashboard (Authentication → Users → Add user) e depois insira a
linha correspondente em `profiles` com `role = 'admin'` — ou rode:

```sql
insert into public.profiles (id, name, email, role)
values ('<uuid-do-usuario-criado>', 'Seu Nome', 'seu@email.com', 'admin');
```

A partir daí, `POST /api/team` (autenticado como admin) cria os demais
membros do time já com login funcionando.

## Subindo no GitHub

```bash
git init            # se ainda não for um repositório
git add .
git commit -m "Backend inicial do GYMPLUS"
git remote add origin <url-do-seu-repo-no-github>
git push -u origin main
```

## Crons e integrações externas

`vercel.json` agenda `cron/rfv-recalc` (diário, 06:00 UTC) e
`cron/automations` (diário, 08:00 UTC) — a Vercel os chama com
`Authorization: Bearer $CRON_SECRET`, que precisa estar configurado nas
env vars do projeto (gere qualquer string aleatória).

WhatsApp Cloud API, Google Sheets e e-mail (Resend) são opcionais: sem as
env vars correspondentes (ver `.env.example`), os adapters em
`lib/integrations/` apenas logam e devolvem "skipped" — todo o resto do
fluxo (automação, webhook, importação de leads) continua funcionando
normalmente. Configure as env vars reais quando tiver as credenciais; não
é necessário mudar nenhuma rota.

## Deploy na Vercel

1. Importe o repositório no dashboard da Vercel, apontando o **Root
   Directory** para `backend/` (é onde fica o `package.json`).
2. Configure as variáveis de ambiente do projeto na Vercel (Settings →
   Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://zjcxdqlifimnezxuzulc.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a publishable key (está em `.env.example`)
   - `SUPABASE_SERVICE_ROLE_KEY` = a service role key (pegue no Supabase Dashboard, não commitar)
3. Deploy. A Vercel builda na nuvem — não depende de espaço em disco local.

## Conectando o frontend existente

O frontend atual (`index.html`, `index-corrigido.html`,
`site-otimizado/`) hoje não faz nenhuma chamada de API — todos os dados
são mock em memória. Para ligar ao backend real, troque os arrays mock por
`fetch('/api/...')` (ou a URL completa do deploy da Vercel, se o frontend
for hospedado separadamente) nos pontos correspondentes: login,
listagem/edição de clientes, funil de CRM, automações, etc. O endpoint
`POST /api/leads` já está pronto para receber o formulário da landing page
(`site-otimizado/index.html`) sem exigir login.

## Observação de segurança pendente

As funções `is_admin()` e `is_team_member()` são `SECURITY DEFINER` e por
isso aparecem no advisor do Supabase como "executáveis via RPC por
anon/authenticated". Isso é intencional — usar `SECURITY DEFINER` é o que
evita recursão de RLS ao consultar `profiles` de dentro das próprias
políticas de `profiles` — e as funções só retornam um booleano sobre o
próprio usuário chamador, sem vazar dados. Não é necessário agir, mas fica
registrado caso o advisor volte a mostrar o aviso.
