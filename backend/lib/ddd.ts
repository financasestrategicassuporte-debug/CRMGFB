/** DDD (código de área) → estado/região do Brasil, pra cruzar o telefone
 * do lead com "de onde ele é" sem precisar de nenhum serviço externo —
 * é uma tabela fixa, os DDDs não mudam. */
const DDD_TO_UF: Record<string, string> = {
  "11": "SP", "12": "SP", "13": "SP", "14": "SP", "15": "SP", "16": "SP", "17": "SP", "18": "SP", "19": "SP",
  "21": "RJ", "22": "RJ", "24": "RJ",
  "27": "ES", "28": "ES",
  "31": "MG", "32": "MG", "33": "MG", "34": "MG", "35": "MG", "37": "MG", "38": "MG",
  "41": "PR", "42": "PR", "43": "PR", "44": "PR", "45": "PR", "46": "PR",
  "47": "SC", "48": "SC", "49": "SC",
  "51": "RS", "53": "RS", "54": "RS", "55": "RS",
  "61": "DF", "62": "GO", "64": "GO", "65": "MT", "66": "MT", "67": "MS",
  "68": "AC", "69": "RO",
  "71": "BA", "73": "BA", "74": "BA", "75": "BA", "77": "BA",
  "79": "SE",
  "81": "PE", "87": "PE",
  "82": "AL",
  "83": "PB",
  "84": "RN",
  "85": "CE", "88": "CE",
  "86": "PI", "89": "PI",
  "91": "PA", "93": "PA", "94": "PA",
  "92": "AM", "97": "AM",
  "95": "RR",
  "96": "AP",
  "98": "MA", "99": "MA",
  "63": "TO",
};

const UF_TO_REGIAO: Record<string, string> = {
  SP: "Sudeste", RJ: "Sudeste", ES: "Sudeste", MG: "Sudeste",
  PR: "Sul", SC: "Sul", RS: "Sul",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  AC: "Norte", RO: "Norte", PA: "Norte", AM: "Norte", RR: "Norte", AP: "Norte", TO: "Norte",
  BA: "Nordeste", SE: "Nordeste", PE: "Nordeste", AL: "Nordeste", PB: "Nordeste", RN: "Nordeste", CE: "Nordeste", PI: "Nordeste", MA: "Nordeste",
};

export const REGIAO_NAO_IDENTIFICADA = "Não identificado";

/** Aceita telefone em qualquer formatação (com/sem +55, com/sem
 * pontuação) e devolve a região — ou `REGIAO_NAO_IDENTIFICADA` se não
 * der pra reconhecer um DDD válido (número de teste, incompleto etc). */
export function regiaoFromPhone(phone: string | null): string {
  if (!phone) return REGIAO_NAO_IDENTIFICADA;
  let digits = phone.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 11) return REGIAO_NAO_IDENTIFICADA;
  const ddd = digits.slice(0, 2);
  const uf = DDD_TO_UF[ddd];
  if (!uf) return REGIAO_NAO_IDENTIFICADA;
  return UF_TO_REGIAO[uf];
}
