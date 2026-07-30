/**
 * Google Apps Script — instala isso na planilha do FUNIL QUENTE (aplicação
 * do webinário). Dispara em tempo real toda vez que alguém responde o
 * formulário, mandando a linha nova direto pro CRM.
 *
 * COMO INSTALAR:
 * 1. Abra a planilha → Extensões → Apps Script.
 * 2. Apague o conteúdo do arquivo Code.gs e cole este arquivo inteiro.
 * 3. Troque WEBHOOK_URL e WEBHOOK_SECRET abaixo pelos valores reais
 *    (o secret é o mesmo configurado em LEADS_WEBHOOK_SECRET na Vercel).
 * 4. Clique no ícone de relógio (Gatilhos) na barra lateral esquerda.
 * 5. "+ Adicionar Gatilho" → função: onFormSubmitQuente → evento: Do
 *    formulário → Ao enviar formulário → Salvar.
 * 6. Na primeira execução o Google vai pedir autorização — aceite (é o
 *    próprio dono da planilha autorizando o próprio script).
 * 7. Pronto: cada nova resposta do formulário cai no CRM na hora.
 */

var WEBHOOK_URL = "https://crmgestaofitness.vercel.app/api/leads/webhook?source=quente";
var WEBHOOK_SECRET = "COLE_AQUI_O_MESMO_VALOR_DE_LEADS_WEBHOOK_SECRET";

function onFormSubmitQuente(e) {
  var payload = {};
  var namedValues = e.namedValues; // { "Nome Completo": ["..."], "Telefone": ["..."], ... }
  for (var key in namedValues) {
    payload[key] = namedValues[key][0];
  }

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
