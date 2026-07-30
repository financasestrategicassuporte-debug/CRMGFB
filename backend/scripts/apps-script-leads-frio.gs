/**
 * Google Apps Script — instala isso na planilha do FUNIL FRIO (exportação
 * do Meta Lead Ads). Essa planilha não é ligada a um Google Form (quem
 * escreve nela é a integração da Meta), então não existe um evento
 * "ao enviar formulário" — em vez disso, reage a QUALQUER alteração na
 * planilha ("onChange") e manda só as linhas que ainda não foram
 * enviadas, guardando o número da última linha processada.
 *
 * COMO INSTALAR:
 * 1. Abra a planilha → Extensões → Apps Script.
 * 2. Apague o conteúdo do arquivo Code.gs e cole este arquivo inteiro.
 * 3. Troque WEBHOOK_URL e WEBHOOK_SECRET abaixo pelos valores reais
 *    (o secret é o mesmo configurado em LEADS_WEBHOOK_SECRET na Vercel).
 * 4. Clique no ícone de relógio (Gatilhos) na barra lateral esquerda.
 * 5. "+ Adicionar Gatilho" → função: onSheetChangeFrio → evento: Da
 *    planilha → Ao alterar → Salvar.
 * 6. Na primeira execução o Google vai pedir autorização — aceite.
 * 7. Pronto: cada linha nova que a integração da Meta adicionar cai no
 *    CRM poucos segundos depois.
 */

var WEBHOOK_URL = "https://crmgestaofitness.vercel.app/api/leads/webhook?source=frio";
var WEBHOOK_SECRET = "COLE_AQUI_O_MESMO_VALOR_DE_LEADS_WEBHOOK_SECRET";

function onSheetChangeFrio() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  var props = PropertiesService.getScriptProperties();
  var lastSent = parseInt(props.getProperty("lastSentRow") || "1", 10);
  if (lastRow <= lastSent) return; // nada novo desde a última vez

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  for (var r = lastSent + 1; r <= lastRow; r++) {
    var values = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    var payload = {};
    for (var i = 0; i < headers.length; i++) {
      payload[headers[i]] = values[i];
    }

    UrlFetchApp.fetch(WEBHOOK_URL, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + WEBHOOK_SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
  }

  props.setProperty("lastSentRow", String(lastRow));
}
