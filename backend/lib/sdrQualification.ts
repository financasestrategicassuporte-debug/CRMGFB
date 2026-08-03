/** Motor de qualificação BANT (Budget/Authority/Need/Timeline) — porte
 * fiel da lógica usada em sdr-ia-2.vercel.app (a ferramenta de
 * qualificação de SDR do usuário), pra rodar dentro do wizard "Qualificar
 * SDR IA" do CRM em vez de precisar de uma ferramenta externa separada.
 * Mesmas faixas, mesma fórmula de pontuação, mesmos alertas de
 * inconsistência e mesma recomendação de produto/forma de negociação. */

export type Origem = "quente" | "frio_ate40k" | "frio_mais40k";
export type SimNao = "sim" | "nao";
export type Decisor = "unico" | "outro";
export type Urgencia = "urgente" | "6meses" | "1ano";

export type SdrQualificationInput = {
  origem: Origem;
  negocio: string;
  faturamento: number; // valor da faixa selecionada (10000..300000)
  margem: number; // % da faixa selecionada (5..50)
  divida: SimNao;
  fluxo?: "pos" | "neg";
  fundo?: SimNao;
  desafio: string;
  fatEsperado?: number;
  margemEsperada?: number;
  dor: string;
  decisor: Decisor;
  casado?: SimNao;
  conjugeConfirmado?: SimNao;
  decisor2Confirmado?: SimNao;
  urgencia: Urgencia;
};

type BantStatus = "ok" | "warn" | "no";
type Alerta = { sev: "critico" | "suspeito"; msg: string };
type BreakdownItem = { label: string; pts: number; max: number };
type DiagnosticoSection = { label: string; text: string; color: string };

export type SdrQualificationResult = {
  resultado: "agendar" | "cautela" | "nao_agendar" | "encerrar";
  tituloText: string;
  produto: string;
  score: number;
  actions: string[];
  alertas: Alerta[];
  negociacao: string;
  breakdown: BreakdownItem[];
  diagnosticoSections: DiagnosticoSection[];
  bant: Record<"B" | "A" | "N" | "T", { status: BantStatus; desc: string }>;
  pontosFracos: string[];
};

const FAT_LABEL: Record<number, string> = {
  10000: "Até R$10k",
  20000: "R$10-20k",
  30000: "R$20-30k",
  50000: "R$30-50k",
  80000: "R$50-80k",
  120000: "R$80-120k",
  200000: "R$120-200k",
  300000: "Acima R$200k",
};

/** Único ponto onde a negociação fica travada e a ligação deve ser
 * encerrada sem oferecer o programa: fluxo de caixa negativo e nenhuma
 * reserva pra cobrir os meses ruins. */
export function shouldEncerrar(input: Pick<SdrQualificationInput, "divida" | "fluxo" | "fundo">) {
  return input.divida === "sim" && input.fluxo === "neg" && input.fundo === "nao";
}

export function computeQualification(input: SdrQualificationInput): SdrQualificationResult {
  const { negocio, faturamento: fat, margem, divida, fluxo, fundo, desafio, dor, decisor: dec, casado: cas } = input;
  const conjuge = input.conjugeConfirmado;
  const decisor2 = input.decisor2Confirmado;
  const prior = input.urgencia;

  const origemQuente = input.origem === "quente";
  const origemFrioAte40k = input.origem === "frio_ate40k";

  // ── PRODUTO ──
  let produto: string;
  let produtoLogica: string;
  if (fat <= 30000) {
    produto = "Acelerador de Matrículas — R$1.997";
    produtoLogica = "faturamento até R$30k";
  } else if (fat === 50000) {
    if (origemFrioAte40k) {
      produto = "Acelerador de Matrículas — R$1.997";
      produtoLogica = "Funil Frio Até 40K + faixa R$30-50k";
    } else {
      produto = "PAV — Programa de Aceleração de Vendas — R$24.997";
      produtoLogica = "faixa R$30-50k com origem +40K ou Quente";
    }
  } else {
    produto = "PAV — Programa de Aceleração de Vendas — R$24.997";
    produtoLogica = "faturamento acima de R$50k";
  }

  const isPAV = produto.includes("PAV");
  const isAcelerador = produto.includes("Acelerador");
  const ticketProduto = isAcelerador ? 1997 : 24997;
  const lucroEstimado = fat * (margem / 100);
  const mesesParaPagar = lucroEstimado > 0 ? ticketProduto / lucroEstimado : 99;

  // ── BANT ASSESSMENT ──
  let bantB: BantStatus = "ok";
  let bantBDesc = "";
  if (mesesParaPagar > 6 || (divida === "sim" && fluxo === "neg" && fundo === "nao")) {
    bantB = "no";
    bantBDesc = "Capacidade financeira insuficiente";
  } else if (mesesParaPagar > 3 || (divida === "sim" && fluxo === "neg")) {
    bantB = "warn";
    bantBDesc = "Capacidade apertada";
  } else {
    bantBDesc = "Capacidade adequada";
  }

  let bantA: BantStatus = "ok";
  let bantADesc = "";
  if (dec === "outro" && decisor2 === "nao") {
    bantA = "no";
    bantADesc = "2º decisor não confirmado";
  } else if (dec === "outro") {
    bantA = "warn";
    bantADesc = "Múltiplos decisores";
  } else if (dec === "unico" && cas === "sim" && conjuge === "nao") {
    bantA = "warn";
    bantADesc = "Cônjuge não vem";
  } else if (dec === "unico") {
    bantADesc = "Decisor único confirmado";
  } else {
    bantA = "warn";
    bantADesc = "Não informado";
  }

  let bantN: BantStatus = "ok";
  let bantNDesc = "";
  if (!desafio || desafio.length < 10) {
    bantN = "warn";
    bantNDesc = "Necessidade não mapeada";
  } else {
    bantNDesc = desafio.substring(0, 40) + "...";
  }

  let bantT: BantStatus = "ok";
  let bantTDesc = "";
  if (prior === "1ano") {
    bantT = "no";
    bantTDesc = "Baixíssima urgência";
  } else if (prior === "6meses") {
    bantT = "warn";
    bantTDesc = "Urgência moderada";
  } else if (prior === "urgente") {
    bantTDesc = "Alta urgência";
  } else {
    bantT = "warn";
    bantTDesc = "Não informada";
  }

  const bant = {
    B: { status: bantB, desc: bantBDesc },
    A: { status: bantA, desc: bantADesc },
    N: { status: bantN, desc: bantNDesc },
    T: { status: bantT, desc: bantTDesc },
  };

  // ── ALERTAS DE INCONSISTÊNCIA ──
  const alertas: Alerta[] = [];
  const negocioLower = negocio.toLowerCase();

  if (fat <= 20000 && margem >= 35)
    alertas.push({
      sev: "critico",
      msg: "Margem acima de 30% com faturamento abaixo de R$20k é praticamente impossível no setor fitness — custos fixos (aluguel, energia, folha) inviabilizam essa equação. Confirme se não está confundindo margem de contribuição com lucro líquido.",
    });

  if (margem >= 50 && fat < 80000)
    alertas.push({
      sev: "critico",
      msg: "Margem acima de 40% com faturamento abaixo de R$80k raramente ocorre em academias convencionais. Questione os custos fixos declarados. Muito provavelmente está informando a margem bruta, não o lucro líquido.",
    });

  if (fat >= 50000 && margem <= 5)
    alertas.push({
      sev: "critico",
      msg: "Faturamento alto com margem abaixo de 5%: possível que esteja declarando faturamento bruto incluindo inadimplência ou receitas de parceiros. O caixa real pode ser muito menor. Solicite o extrato bancário antes da reunião.",
    });

  if (fat <= 15000 && divida === "nao" && margem >= 20)
    alertas.push({
      sev: "critico",
      msg: "Faturamento até R$15k + sem dívidas + margem boa: muito provavelmente está confundindo faturamento com lucro. Uma academia nessa faixa raramente cobre aluguel, energia e folha e ainda tem margem alta.",
    });

  if (divida === "sim" && fluxo === "neg" && fundo === "sim" && fat < 30000)
    alertas.push({
      sev: "critico",
      msg: "Fluxo negativo + faturamento baixo + reserva declarada: quem tem fluxo negativo consistente consome a reserva rapidamente. Verifique se a reserva é real ou se foi informada para \"passar na triagem\".",
    });

  const alunosMatch = negocio.match(/(\d+)\s*(alunos?|clientes?|matrículas?)/i);
  if (alunosMatch) {
    const alunos = parseInt(alunosMatch[1], 10);
    if (alunos > 0 && fat > 0) {
      const ticketMedio = fat / alunos;
      if (ticketMedio < 30 && alunos > 50)
        alertas.push({
          sev: "critico",
          msg: `Ticket médio calculado: R$${ticketMedio.toFixed(0)}/aluno (${alunos} alunos × R$${fat.toLocaleString("pt-BR")}). Abaixo de R$30/aluno para academia com estrutura é inviável — os números declarados não fecham.`,
        });
      if (ticketMedio > 600 && !negocioLower.includes("premium") && !negocioLower.includes("vip"))
        alertas.push({
          sev: "suspeito",
          msg: `Ticket médio calculado: R$${ticketMedio.toFixed(0)}/aluno — muito acima da média para academia convencional. Confirme se é realmente um studio premium ou se o número de alunos está subestimado.`,
        });
    }
  }

  if (dec === "unico" && (negocioLower.includes("sócio") || negocioLower.includes("socio") || negocioLower.includes("sociedade")))
    alertas.push({
      sev: "suspeito",
      msg: "Lead declarou ser o único decisor mas mencionou sócio na descrição do negócio. Confirme quem mais precisa estar na reunião para evitar que a decisão seja bloqueada depois.",
    });

  const funcionariosMatch = negocio.match(/(\d+)\s*(funcionário|funcionarios|colaborador|colaboradores|CLT)/i);
  if (funcionariosMatch) {
    const funcs = parseInt(funcionariosMatch[1], 10);
    const custoFolha = funcs * 2500;
    if (fat > 0 && custoFolha > fat * 0.6)
      alertas.push({
        sev: "critico",
        msg: `${funcs} funcionários declarados: custo de folha estimado ~R$${custoFolha.toLocaleString("pt-BR")}/mês, mais de 60% do faturamento. Matematicamente inviável sem endividamento ou fluxo negativo.`,
      });
  }

  if ((negocioLower.includes("unidade") || negocioLower.includes("filial")) && fat < 30000)
    alertas.push({
      sev: "critico",
      msg: "Mencionou mais de uma unidade mas faturamento total abaixo de R$30k: duas unidades com custos fixos separados nessa faixa sugerem operação no prejuízo ou faturamento incorreto.",
    });

  if (
    isPAV &&
    (negocioLower.includes("sozinho") || negocioLower.includes("só eu") || negocioLower.includes("eu mesmo") || negocioLower.includes("faço tudo"))
  )
    alertas.push({
      sev: "suspeito",
      msg: "Perfil indicado para o PAV (que exige time de vendas), mas a descrição sugere que o lead opera sozinho. Reavalie se o produto correto não seria o Acelerador de Matrículas.",
    });

  // ── FORMA DE NEGOCIAÇÃO ──
  let negociacao: string;
  if (isAcelerador) {
    if (fat <= 10000 || (divida === "sim" && fluxo === "neg"))
      negociacao = "💳 Parcelado em até 12x no cartão (R$166/mês) — faturamento muito baixo, não forçar à vista.";
    else if (mesesParaPagar <= 0.5 && divida === "nao")
      negociacao = "💳 Cartão à vista (R$1.997) — lucro mensal cobre o ticket com folga. Tentar fechar à vista primeiro.";
    else if (mesesParaPagar <= 1 && divida === "nao") negociacao = "💳 À vista ou em até 3x — margem saudável. Evitar parcelar muito.";
    else negociacao = "💳 Entrada de 50% (R$998) + restante em até 6x no cartão.";
  } else {
    if (fat >= 80000 && margem >= 25 && divida === "nao")
      negociacao = "💳 À vista ou em até 6x no cartão — faturamento e margem fortes. Tentar menos parcelas.";
    else if (fat >= 50000 && (divida === "nao" || fluxo === "pos"))
      negociacao = "💳 Entrada de 30-50% no cartão + restante em até 12x — capacidade moderada para PAV.";
    else negociacao = "💳 Parcelado em até 12x no cartão (R$2.083/mês) — verificar limite disponível com o closer antes da reunião.";
  }

  // ── SCORING ──
  let scoreA = 0;
  if (isAcelerador) {
    if (fat <= 30000 && fat >= 10000) scoreA = 20;
    else if (fat < 10000) scoreA = 8;
    else scoreA = 12;
  } else {
    if (fat >= 80000) scoreA = 20;
    else if (fat >= 50000) scoreA = 15;
    else scoreA = 8;
  }

  let sbFat = 0;
  if (isAcelerador) {
    if (fat >= 20000) sbFat = 10;
    else if (fat >= 10000) sbFat = 6;
    else sbFat = 2;
  } else {
    if (fat >= 80000) sbFat = 10;
    else if (fat >= 50000) sbFat = 6;
    else sbFat = 2;
  }
  let sbMargem = 0;
  if (mesesParaPagar <= 0.5) sbMargem = 10;
  else if (mesesParaPagar <= 1) sbMargem = 8;
  else if (mesesParaPagar <= 2) sbMargem = 5;
  else if (mesesParaPagar <= 3) sbMargem = 3;
  else if (mesesParaPagar <= 6) sbMargem = 1;

  let sbFinanceiro = 0;
  if (!divida || divida === "nao") sbFinanceiro = 5;
  else if (divida === "sim" && fluxo === "pos") sbFinanceiro = 3;
  else if (divida === "sim" && fluxo === "neg" && fundo === "sim") sbFinanceiro = 1;
  const scoreB = sbFat + sbMargem + sbFinanceiro;

  let scoreC = 0;
  if (dor.length > 80) scoreC = 20;
  else if (dor.length > 40) scoreC = 15;
  else if (dor.length > 15) scoreC = 8;
  else if (dor.length > 0) scoreC = 4;

  let scoreD = 0;
  if (desafio.length > 80) scoreD = 10;
  else if (desafio.length > 40) scoreD = 7;
  else if (desafio.length > 15) scoreD = 4;
  else if (desafio.length > 0) scoreD = 2;

  let scoreE = 0;
  if (dec === "unico" && cas === "nao") scoreE = 10;
  else if (dec === "unico" && conjuge === "sim") scoreE = 9;
  else if (dec === "unico") scoreE = 7;
  else if (dec === "outro" && decisor2 === "sim") scoreE = 6;
  else if (dec === "outro") scoreE = 2;

  let scoreF = 0;
  if (origemQuente) scoreF = 10;
  else if (input.origem === "frio_mais40k") scoreF = 6;
  else if (origemFrioAte40k) scoreF = 3;

  let scoreG = 0;
  if (prior === "urgente") scoreG = 10;
  else if (prior === "6meses") scoreG = 4;
  else if (prior === "1ano") scoreG = 0;
  else scoreG = 3;

  let scoreH = 0;
  const criticos = alertas.filter((a) => a.sev === "critico").length;
  const suspeitos = alertas.filter((a) => a.sev === "suspeito").length;
  scoreH -= criticos * 8;
  scoreH -= suspeitos * 4;
  if (mesesParaPagar > 6) scoreH -= 10;
  else if (mesesParaPagar > 4) scoreH -= 6;
  else if (mesesParaPagar > 3) scoreH -= 3;
  if (dor.length === 0) scoreH -= 5;
  if (divida === "sim" && fluxo === "neg" && fundo === "nao") scoreH -= 20;
  if (dec === "outro" && decisor2 !== "sim") scoreH -= 6;
  else if (dec === "outro") scoreH -= 2;
  if (prior === "1ano") scoreH -= 25;
  else if (prior === "6meses") scoreH -= 3;

  let score = scoreA + scoreB + scoreC + scoreD + scoreE + scoreF + scoreG + scoreH;
  score = Math.max(0, Math.min(score, 95));

  const breakdown: BreakdownItem[] = [
    { label: "Fit de Produto", pts: scoreA, max: 20 },
    { label: "Capacidade Financeira [Budget]", pts: scoreB, max: 25 },
    { label: "Motivação / Dor Oculta", pts: scoreC, max: 20 },
    { label: "Necessidade [Need]", pts: scoreD, max: 10 },
    { label: "Autoridade Decisória [Authority]", pts: scoreE, max: 10 },
    { label: "Intenção / Origem", pts: scoreF, max: 10 },
    { label: "Urgência [Timeline]", pts: scoreG, max: 10 },
    { label: "Penalidades", pts: scoreH, max: 0 },
  ];
  const pontosFracos = breakdown.filter((d) => d.max > 0 && d.pts < d.max * 0.5).map((d) => `${d.label} (${d.pts}/${d.max})`);

  // ── DECISÃO ──
  let resultado: SdrQualificationResult["resultado"];
  let tituloText: string;
  let actions: string[];

  const priorLabel = prior === "urgente" ? "🔥 Urgente" : prior === "6meses" ? "📅 6 meses" : prior === "1ano" ? "🕐 1 ano+" : "❓ Não informada";
  const decisorAlerta =
    dec === "outro" && decisor2 !== "sim"
      ? "🚨 SEGUNDO DECISOR NÃO CONFIRMADO — não agendar sem garantir presença de todos."
      : dec === "unico" && cas === "sim" && conjuge !== "sim"
        ? "⚠️ Cônjuge não confirmado na reunião — closer deve reforçar isso no agendamento."
        : null;

  if (score >= 60) {
    resultado = "agendar";
    tituloText = "✅ Agendar Reunião com o Closer";
    actions = [
      "Informe ao lead que ele passou para a próxima fase.",
      "Ofereça dois horários (manhã/tarde) para a reunião de 1h.",
      "Confirme presença de TODOS os decisores (cônjuge incluído, se casado).",
      `🛒 Produto indicado: ${produto}`,
      `💳 Negociação sugerida: ${negociacao}`,
      `⏰ Prioridade do lead: ${priorLabel}`,
      "Envie o script completo para o closer via botão abaixo.",
    ];
    if (decisorAlerta) actions.splice(2, 0, decisorAlerta);
  } else if (score >= 35 && prior !== "1ano") {
    resultado = "cautela";
    tituloText = "⚠️ Agendar com Cautela";
    actions = [
      "Informe ao lead que pode estar no perfil, mas há pontos a confirmar.",
      "⚠️ AVISE O CLOSER sobre os pontos fracos antes da reunião.",
      criticos > 0
        ? "🚨 Inconsistências críticas detectadas — solicite comprovação antes de avançar."
        : dor.length === 0
          ? "Dor oculta não mapeada — closer deve aprofundar no início da reunião."
          : "Aprofunde a dor oculta se ainda não estiver clara.",
      prior === "6meses"
        ? "⚠️ URGÊNCIA BAIXA: lead disse que vai resolver em 6 meses. Só agendar se houver razão concreta para não agir agora. Avise o closer."
        : "",
      `🛒 Produto indicado: ${produto}`,
      `💳 Negociação sugerida: ${negociacao}`,
      `⏰ Prioridade do lead: ${priorLabel}`,
      pontosFracos.length > 0 ? `📊 Pontos fracos: ${pontosFracos.join(", ")}` : "",
    ].filter(Boolean);
    if (decisorAlerta) actions.splice(1, 0, decisorAlerta);
  } else {
    resultado = "nao_agendar";
    tituloText = prior === "1ano" ? "❌ Não Agendar — Sem Urgência" : "❌ Não Agendar";
    actions = [
      "NÃO agende reunião com o closer neste momento.",
      prior === "1ano"
        ? "🚨 MOTIVO PRINCIPAL: lead declarou que só vai agir em 1 ano ou mais. Sem urgência real, a reunião não vai fechar — e provavelmente nem vai acontecer (no-show). Não há lógica em agendar."
        : prior === "6meses"
          ? "⚠️ Urgência insuficiente: lead quer resolver em 6 meses, mas o score financeiro/BANT está fraco demais para compensar essa falta de urgência. Não agendar agora."
          : criticos > 0
            ? "🚨 Dados críticos inconsistentes — não avançar até esclarecer."
            : "Score insuficiente de qualificação geral.",
      "Encerre a ligação de forma respeitosa e profissional.",
      "Cadastre na base de nurturing para follow-up em 60-90 dias.",
      `⏰ Prioridade declarada: ${priorLabel}`,
    ];
    if (decisorAlerta) actions.splice(2, 0, decisorAlerta);
  }

  const lucroFmt = lucroEstimado > 0 ? "R$" + lucroEstimado.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "—";
  const mesesFmt = mesesParaPagar < 99 ? mesesParaPagar.toFixed(1) : "N/A";

  const diagnosticoSections: DiagnosticoSection[] = [
    {
      label: "🛒 Por que este produto?",
      text: isPAV
        ? `Produto indicado: PAV — Programa de Aceleração de Vendas (R$24.997). Motivo: ${produtoLogica}. O PAV é recomendado para academias com estrutura suficiente para implementar um time comercial e processos de vendas. Ticket médio alto o suficiente para justificar o investimento.`
        : `Produto indicado: Acelerador de Matrículas (R$1.997). Motivo: ${produtoLogica}. O Acelerador é o produto certo para academias menores ou studios que ainda não têm escala para o PAV. Ticket mais acessível e retorno mais rápido.`,
      color: "ok",
    },
    {
      label: "💰 Análise de Capacidade de Pagamento (Budget)",
      text:
        lucroEstimado > 0
          ? `Faturamento declarado: R$${fat.toLocaleString("pt-BR")} | Margem: ${margem}% | Lucro líquido estimado: ${lucroFmt}/mês. O programa representa ${mesesFmt} meses de lucro. ${
              mesesParaPagar <= 1
                ? "Excelente capacidade — pode tentar à vista ou poucas parcelas."
                : mesesParaPagar <= 3
                  ? "Capacidade moderada — parcelamento em 6-12x é o caminho."
                  : "Capacidade financeira apertada — closer deve confirmar limite de cartão e ausência de comprometimentos."
            }${divida === "sim" ? " ⚠️ Atenção: lead declarou endividamento." : ""}`
          : "Faturamento ou margem não informados — capacidade de pagamento não calculada.",
      color: bantB === "ok" ? "ok" : bantB === "warn" ? "" : "danger",
    },
    {
      label: "🎯 Necessidade Real (Need)",
      text: desafio
        ? `Desafio relatado: "${desafio}". Este é o problema que o programa precisa resolver. ${
            dor
              ? `Dor oculta identificada: "${dor}". O closer deve usar essa motivação pessoal como âncora de valor durante a reunião.`
              : "Dor oculta não mapeada — o closer deve aprofundar esse ponto antes de qualquer apresentação."
          }`
        : "Necessidade não mapeada claramente — o closer deve investigar o desafio real antes de apresentar qualquer solução.",
      color: bantN === "ok" ? "ok" : "warn",
    },
    {
      label: "👥 Autoridade de Decisão (Authority)",
      text:
        dec === "unico"
          ? `Lead declarou ser o único decisor.${
              cas === "sim"
                ? conjuge === "sim"
                  ? " Cônjuge confirmado na reunião — decisão pode ser tomada na hora."
                  : " Cônjuge casado mas não confirmado na reunião — risco de bloqueio de decisão."
                : " Não casado — decisão direta."
            }`
          : dec === "outro"
            ? decisor2 === "sim"
              ? "Há múltiplos decisores e o segundo decisor confirmou presença. Reunião pode prosseguir."
              : "⚠️ Há múltiplos decisores mas o segundo decisor NÃO confirmou presença. Altíssimo risco de reunião perdida. Não agendar sem confirmar todos."
            : "Processo decisório não mapeado.",
      color: bantA === "ok" ? "ok" : bantA === "warn" ? "" : "danger",
    },
    {
      label: "⏰ Urgência (Timeline)",
      text:
        prior === "urgente"
          ? "✅ Lead declarou urgência imediata — quer resolver agora. Excelente sinal. Alta probabilidade de decisão na reunião. Agendar com prioridade."
          : prior === "6meses"
            ? "⚠️ Lead declarou que pretende resolver nos próximos 6 meses. ATENÇÃO: se não é urgente agora, não há razão real para agendar a reunião hoje. Leads sem urgência têm alta taxa de no-show, cancelamento ou \"não é o momento\" na hora H. Antes de agendar, o SDR precisa descobrir o que está impedindo de agir agora — se a resposta for vaga, NÃO agendar. Só agendar se o lead der uma razão concreta e válida (ex: \"termino uma reforma em 30 dias\"). Avise o closer sobre essa fragilidade."
            : "🚨 Lead declarou que só vai agir daqui 1 ano ou mais. Isso inviabiliza o agendamento. Quem não sente urgência agora não vai aparecer na reunião — e mesmo que apareça, não vai fechar. A lógica é simples: se o problema não precisa ser resolvido hoje, por que ele pagaria pelo programa hoje? NÃO AGENDAR. Cadastrar na base de nurturing para follow-up em 60-90 dias e rever quando a urgência mudar.",
      color: prior === "urgente" ? "ok" : prior === "1ano" ? "danger" : "warn",
    },
  ];
  if (pontosFracos.length > 0) {
    diagnosticoSections.push({
      label: "⚠️ Pontos Fracos Identificados",
      text: "Os seguintes critérios ficaram abaixo de 50% do potencial: " + pontosFracos.join(", ") + ". O closer deve estar ciente dessas lacunas.",
      color: "warn",
    });
  }

  return { resultado, tituloText, produto, score, actions, alertas, negociacao, breakdown, diagnosticoSections, bant, pontosFracos };
}

/** Monta o texto formatado salvo em anotações do deal — mesmas seções do
 * "Baixar Script Completo" da ferramenta original. */
export function buildQualificationNote(input: SdrQualificationInput, sdrNome: string, data: SdrQualificationResult): string {
  const bantLines = (["B", "A", "N", "T"] as const)
    .map((k) => {
      const labels = { B: "B (Budget)", A: "A (Authority)", N: "N (Need)", T: "T (Timeline)" };
      const item = data.bant[k];
      const status = item.status === "ok" ? "✅" : item.status === "warn" ? "⚠️" : "❌";
      return `${status} ${labels[k]}: ${item.desc}`;
    })
    .join("\n");

  const alertasText =
    data.alertas.length > 0
      ? "\n\n🚨 Alertas de inconsistência\n" + data.alertas.map((a) => `• [${a.sev.toUpperCase()}] ${a.msg}`).join("\n")
      : "";

  const diagText = data.diagnosticoSections.map((s) => `${s.label}\n${s.text}`).join("\n\n");

  const origemLabel =
    input.origem === "quente"
      ? "Funil Webinário Quente — Preencheram Aplicação"
      : input.origem === "frio_ate40k"
        ? "Funil Webinário Frio — Até 40K"
        : "Funil Webinário Frio — +40K";

  const margemMap: Record<number, string> = { 5: "<10%", 15: "10-20%", 25: "20-30%", 35: "30-40%", 50: ">40%" };

  return `GFB — Diagnóstico de Qualificação (SDR IA)
Gerado em ${new Date().toLocaleString("pt-BR")} · SDR: ${sdrNome} · Origem: ${origemLabel}

📋 Dados coletados
Faturamento mensal: ${FAT_LABEL[input.faturamento] || "Não informado"}
Margem de lucro: ${margemMap[input.margem] || "Não informado"}
Endividamento: ${input.divida === "sim" ? "Sim" : "Não"}
Fluxo de caixa: ${input.fluxo === "neg" ? "Negativo" : input.fluxo === "pos" ? "Positivo" : "—"}
Fundo de reserva: ${input.fundo === "sim" ? "Tem" : input.fundo === "nao" ? "Não tem" : "—"}
Decisor: ${input.decisor === "unico" ? "É o único decisor" : "Precisa consultar outros"}
Casado: ${input.casado === "sim" ? "Sim" : input.casado === "nao" ? "Não" : "—"}

📊 Análise BANT
${bantLines}

📝 Notas do SDR
Negócio: ${input.negocio || "Não preenchido"}
Maior desafio: ${input.desafio || "Não preenchido"}
Dor oculta: ${input.dor || "Não preenchido"}

🎯 Orientação para o closer
${
  input.dor
    ? `Motivação real do lead: "${input.dor}". Use esse gatilho nos momentos de objeção. Explore: (1) como a situação atual impede esse objetivo; (2) o que muda quando resolver; (3) quanto está disposto a investir.`
    : "Dor oculta não mapeada — aprofundar no início da reunião antes de apresentar qualquer solução."
}

✅ Resultado
Decisão: ${data.tituloText}
Produto recomendado: ${data.produto}
Forma de negociação: ${data.negociacao}
Chance de compra: ${data.score}%${alertasText}

🔍 Lógica do diagnóstico
${diagText}

🎯 Ações para o closer
${data.actions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;
}

/** Diagnóstico de encerramento (fluxo negativo sem reserva) — mesma regra
 * de corte usada pela ferramenta original antes de chegar ao BANT completo. */
export function buildEncerrarNote(input: Pick<SdrQualificationInput, "negocio">, sdrNome: string): string {
  return `GFB — Diagnóstico de Qualificação (SDR IA)
Gerado em ${new Date().toLocaleString("pt-BR")} · SDR: ${sdrNome}

❌ Resultado: Entrevista encerrada
Motivo: fluxo de caixa negativo sem fundo de reserva — situação financeira crítica. O programa não consegue ajudar o lead neste momento.

Script sugerido: "Pelo que você me disse, você está em uma situação muito delicada na sua empresa. Na minha opinião, o mais importante agora é segurar o caixa. Vou te enviar 1 hora de consultoria 100% gratuita e um PDF de bônus — não é o momento de vender."

📝 Negócio
${input.negocio || "Não preenchido"}`;
}
