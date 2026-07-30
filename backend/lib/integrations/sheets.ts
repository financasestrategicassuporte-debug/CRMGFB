/** Importação de leads das planilhas Google do funil quente (aplicação
 * do webinário) e frio (exportação de Meta Lead Ads). Ambas as planilhas
 * são compartilhadas como "qualquer pessoa com o link pode ver", então
 * lemos direto o CSV público exportado pelo Google Sheets — sem precisar
 * de service account/credencial nenhuma. Os IDs abaixo são as planilhas
 * reais informadas pelo usuário; `GOOGLE_SHEETS_QUENTE_ID`/
 * `GOOGLE_SHEETS_FRIO_ID` permitem trocar sem precisar editar código. */

export type SheetLead = {
  name: string;
  phone?: string;
  email?: string;
  gym_name?: string;
  students_count?: number;
  revenue?: number;
  pain_points?: string;
  campaign?: string;
  adset?: string;
  ad?: string;
  source: string;
};

const DEFAULT_SHEET_IDS = {
  quente: "12-vMpjxquYpO7TgQBsXuvsPLUdDmZZtUvyt5ucC8OSo",
  frio: "1MW_dyf0VOHULceCCtY7FkCR_tLCCkM6YqPY-TQd8fjI",
};

function sheetIdFor(source: "quente" | "frio") {
  const envVar = source === "quente" ? process.env.GOOGLE_SHEETS_QUENTE_ID : process.env.GOOGLE_SHEETS_FRIO_ID;
  return envVar || DEFAULT_SHEET_IDS[source];
}

/** Parser de CSV mínimo o suficiente pro export do Google Sheets: trata
 * campos entre aspas (com vírgula/quebra de linha/aspas escapadas "")
 * sem precisar de uma dependência externa. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (r[i] ?? "").trim();
    });
    return obj;
  });
}

// `revenue` é numeric(12,2) e `students_count` é int4 no banco — texto
// livre de formulário às vezes tem lixo (telefone digitado no campo
// errado, número gigante por engano). Sem um teto sensato aqui, uma
// única linha ruim derruba o INSERT em lote inteiro (é uma única
// instrução SQL, tudo ou nada). Qualquer valor fora da faixa plausível
// vira "não informado" em vez de estourar a coluna.
const MAX_REVENUE = 50_000_000; // R$50 milhões/mês — teto generoso, mas finito
const MAX_STUDENTS = 200_000; // maior rede de academias do Brasil não chega perto disso

/** Extrai um valor numérico aproximado de faixas de faturamento em texto
 * livre ("20mil a 50mil", "Entre R$20.000 a R$30.000", "50k a 150k",
 * "Até 20 mil") — usa a média dos dois primeiros números encontrados, ou
 * o único número encontrado. Aproximado por natureza. */
function parseRevenueRange(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(mil|k)?/gi)];
  const nums = matches
    .map((m) => {
      const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      const suffix = m[2]?.toLowerCase();
      return suffix === "mil" || suffix === "k" ? n * 1000 : n;
    })
    .filter((n) => !isNaN(n) && n > 0 && n <= MAX_REVENUE);
  if (nums.length === 0) return undefined;
  if (nums.length === 1) return Math.round(nums[0]);
  return Math.round((nums[0] + nums[1]) / 2);
}

function parseStudentsCount(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const match = text.match(/\d+/);
  if (!match) return undefined;
  const n = parseInt(match[0], 10);
  return n > 0 && n <= MAX_STUDENTS ? n : undefined;
}

function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^p:/i, "").replace(/[^\d+]/g, "") || undefined;
}

async function fetchSheetRows(spreadsheetId: string): Promise<Record<string, string>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao ler planilha (HTTP ${res.status})`);
  const text = await res.text();
  return csvRowsToObjects(parseCsv(text));
}

/** Funil quente: aplicação do webinário (Nome Completo, Telefone, E-mail,
 * Nome da Academia, alunos, faturamento, dificuldades…). Exportada porque
 * o webhook (`/api/leads/webhook`) recebe a mesma linha em JSON — do
 * Apps Script — e precisa mapear com a lógica exata. */
export function mapQuenteRow(row: Record<string, string>): SheetLead | null {
  const name = row["Nome Completo"];
  if (!name) return null;
  const dificuldades = row['Escreva aqui as suas "3" MAIORES DIFICULDADES que você tem na sua ACADEMIA:'];
  return {
    name,
    phone: normalizePhone(row["Telefone"]),
    email: row["E-mail"] || undefined,
    gym_name: row["Nome da Academia"] || undefined,
    students_count: parseStudentsCount(row["Quantos alunos tem na sua academia?"]),
    revenue: parseRevenueRange(row["Faturamento mensal médio mensal"]),
    pain_points: dificuldades || row["Selecione a opção que te define"] || undefined,
    source: "sheets_quente",
  };
}

/** Funil frio: exportação de Meta Lead Ads (full_name, phone_number,
 * email, campaign_name, adset_name, ad_name…). Descarta os leads de
 * teste que a própria Meta insere ("<test lead: ...>"/test@meta.com). */
export function mapFrioRow(row: Record<string, string>): SheetLead | null {
  const name = row["full_name"];
  const email = row["email"];
  if (!name || name.includes("<test lead") || email === "test@meta.com") return null;
  return {
    name,
    phone: normalizePhone(row["phone_number"]),
    email: email || undefined,
    revenue: parseRevenueRange(row["qual_sua_faixa_de_faturamento_mensal?"]),
    pain_points: row["área_de_atuação"] || undefined,
    campaign: row["campaign_name"] || undefined,
    adset: row["adset_name"] || undefined,
    ad: row["ad_name"] || undefined,
    source: "sheets_frio",
  };
}

export async function importLeadsFromSheet(source: "quente" | "frio"): Promise<SheetLead[]> {
  const spreadsheetId = sheetIdFor(source);
  try {
    const rows = await fetchSheetRows(spreadsheetId);
    const mapper = source === "quente" ? mapQuenteRow : mapFrioRow;
    return rows.map(mapper).filter((l): l is SheetLead => l !== null);
  } catch (err) {
    console.error(`[sheets:error] falha ao importar funil ${source}:`, err);
    return [];
  }
}
