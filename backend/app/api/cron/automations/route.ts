import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargets, buildMessage, type ConditionJson } from "@/lib/automationEngine";
import { runDealAutomations } from "@/lib/dealAutomationEngine";
import { syncLeadsFromSheet } from "@/lib/leadImport";
import { autoDistributeNewLeads } from "@/lib/leadAutoDistribute";
import { sendWhatsapp } from "@/lib/integrations/whatsapp";
import { sendEmail } from "@/lib/integrations/email";
import { syncMarketingSpend } from "@/lib/integrations/marketingSpend";
import { generateMonthlyBaseCommissions } from "@/lib/commissionRules";

// Varrer o backlog inteiro de leads (item 5 abaixo) pode levar mais que
// os 10s padrão da function em dias com fila grande — 60s é o teto do
// plano Hobby da Vercel.
export const maxDuration = 60;

/** Roda 1x/dia (ver vercel.json): (1) avalia as automações de playbook
 * ativas contra o estado atual dos clientes, evitando disparar duas
 * vezes no mesmo dia (checa `automation_runs` de hoje antes de agir) —
 * envio de verdade passa pelos adapters de `lib/integrations/*`, que
 * sem credencial configurada só logam; (2) roda as automações de etapa
 * do CRM (`runDealAutomations`); (3) sincroniza os leads novos das duas
 * planilhas (quente/frio) — o mesmo sync também roda toda vez que
 * alguém abre `/leads`; (4) sincroniza o investimento real em mídia do
 * dashboard de marketing pra `ad_spend` — mesmo sync também roda ao
 * abrir Dashboard/Dashboard de Produtos; (5) varre todo o backlog de
 * leads ainda não convertidos e distribui (se o modo automático estiver
 * ligado) — não só os sincronizados nessa execução, pra nenhum lead
 * ficar parado esperando o próximo toggle manual; (6) gera a comissão
 * fixa mensal de quem ainda não tem uma nesse período, pela regra base
 * configurada em /comissoes — mesma geração também roda na hora quando
 * o admin salva a regra. */
export async function GET(request: Request) {
  const forbidden = verifyCronSecret(request);
  if (forbidden) return forbidden;

  const admin = createAdminClient();
  const hoje = new Date();
  const hojeIso = hoje.toISOString().slice(0, 10);

  const [{ data: automations, error: autoError }, { data: clients, error: clientsError }] = await Promise.all([
    admin.from("automations").select("*").eq("active", true),
    admin.from("clients").select("id,name,atividade_status,financeiro_status"),
  ]);
  if (autoError) return NextResponse.json({ error: autoError.message }, { status: 400 });
  if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 400 });

  let disparos = 0;

  for (const rule of automations ?? []) {
    const condition = rule.condition_json as ConditionJson | null;
    const alvos = resolveTargets(condition, clients ?? [], hoje);
    if (alvos.length === 0) continue;

    const { data: jaRodou } = await admin
      .from("automation_runs")
      .select("target_id")
      .eq("rule_id", rule.id)
      .gte("executado_em", `${hojeIso}T00:00:00Z`);
    const idsJaExecutados = new Set((jaRodou ?? []).map((r) => r.target_id));

    for (const cliente of alvos) {
      if (idsJaExecutados.has(cliente.id)) continue;

      const mensagem = buildMessage(rule.title, cliente.name);
      for (const canal of rule.channels as string[]) {
        const resultado =
          canal === "WhatsApp" || canal === "whatsapp"
            ? await sendWhatsapp(cliente.id, mensagem)
            : await sendEmail(cliente.id, rule.title, mensagem);

        await admin.from("automation_runs").insert({
          rule_id: rule.id,
          target_type: "client",
          target_id: cliente.id,
          canal,
          status: resultado.status === "sent" ? "success" : resultado.status,
          detail: resultado.detail ?? null,
        });
        disparos++;
      }
    }

    await admin.from("automations").update({ run_count: (rule.run_count ?? 0) + alvos.length }).eq("id", rule.id);
  }

  const dealResult = await runDealAutomations(admin);

  const [leadsQuente, leadsFrio, spendResult] = await Promise.all([
    syncLeadsFromSheet(admin, "quente"),
    syncLeadsFromSheet(admin, "frio"),
    syncMarketingSpend(admin),
  ]);

  // Varre TODO o backlog de leads ainda não convertidos, não só os
  // sincronizados agora — rede de segurança pro modo automático (ligado
  // em /leads) nunca deixar lead parado esperando: se por qualquer
  // motivo o toggle não pegou algum lote (settings mudou de mão, erro
  // pontual etc.), o cron do dia seguinte já limpa sozinho.
  let leadsDistribuidos = { converted: 0, distributed: 0 };
  try {
    const { data: pendentes } = await admin.from("leads").select("id").is("converted_deal_id", null);
    const pendenteIds = (pendentes ?? []).map((l) => l.id);
    if (pendenteIds.length > 0) {
      leadsDistribuidos = await autoDistributeNewLeads(admin, pendenteIds);
    }
  } catch {
    // não deixa a distribuição automática quebrar o cron
  }

  let comissoesGeradas = 0;
  try {
    const result = await generateMonthlyBaseCommissions(admin);
    comissoesGeradas = result.created;
  } catch {
    // não deixa a geração de comissão fixa quebrar o cron
  }

  return NextResponse.json({ disparos, dealDisparos: dealResult.disparos, leadsQuente, leadsFrio, spendResult, leadsDistribuidos, comissoesGeradas });
}
