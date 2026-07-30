# Apps Script — leads em tempo real

Os dois arquivos `.gs` aqui são pra instalar direto nas planilhas de
origem, cada um dispara o CRM assim que uma linha nova aparece — sem
precisar esperar o sync diário ou abrir a página "Leads Recebidos".

- `apps-script-leads-quente.gs` → planilha de aplicação do webinário
  (dispara no envio do formulário).
- `apps-script-leads-frio.gs` → planilha de exportação do Meta Lead Ads
  (dispara em qualquer alteração na planilha, já que não é ligada a um
  formulário).

## Antes de instalar

1. Gere (ou peça pro Claude gerar) uma string aleatória qualquer e
   configure como `LEADS_WEBHOOK_SECRET` nas variáveis de ambiente do
   projeto na Vercel (Settings → Environment Variables).
2. Use esse mesmo valor no lugar de `COLE_AQUI_O_MESMO_VALOR_DE_LEADS_WEBHOOK_SECRET`
   dentro de cada script, na planilha correspondente.

As instruções passo a passo de instalação estão no topo de cada arquivo
`.gs`. Sem esse passo, os leads continuam entrando (via sync automático
ao abrir "Leads Recebidos" e via cron diário) — só não instantaneamente.
