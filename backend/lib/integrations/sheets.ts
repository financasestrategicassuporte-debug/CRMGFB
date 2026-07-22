/** Importação de leads das planilhas Google (funil quente/frio). Sem
 * `GOOGLE_SHEETS_CLIENT_EMAIL`/`GOOGLE_SHEETS_PRIVATE_KEY`/
 * `GOOGLE_SHEETS_SPREADSHEET_ID` configurados, devolve lista vazia em vez
 * de lançar erro — o endpoint `GET /api/leads/import` continua
 * respondendo normalmente, só não traz leads novos até a credencial
 * real ser configurada. */

export type SheetLead = {
  name: string;
  phone?: string;
  email?: string;
  gym_name?: string;
  students_count?: number;
  revenue?: number;
  source: string;
};

export async function importLeadsFromSheet(source: "quente" | "frio"): Promise<SheetLead[]> {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.info(`[sheets:skipped] credenciais do Google Sheets não configuradas — import do funil ${source} não executado`);
    return [];
  }

  // Implementação real fica pendente da credencial: usar a Sheets API
  // (google-auth-library + googleapis) para ler a aba correspondente ao
  // funil `source` e mapear as colunas do formulário para `SheetLead`.
  console.info(`[sheets:todo] credenciais presentes mas leitura real ainda não implementada (funil ${source})`);
  return [];
}
