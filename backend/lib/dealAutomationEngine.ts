import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { sendWhatsapp } from "@/lib/integrations/whatsapp";
import { sendEmail } from "@/lib/integrations/email";

/** Motor de automações por etapa do CRM (deal_automations): calcula quando
 * uma regra deve disparar para um deal específico, considerando
 * `delay_days` (úteis ou corridos, conforme `skip_weekends`) contados a
 * partir de `stage_changed_at`, aplicado no horário fixo `run_time`.
 * Roda dentro do cron diário de automações (`/api/cron/automations`), já
 * que o plano atual da Vercel só permite disparo 1x/dia — `run_time` fica
 * como referência aproximada até um plano com granularidade maior. */

export function addDays(date: Date, days: number, skipWeekends: boolean): Date {
  const result = new Date(date);
  if (!skipWeekends) {
    result.setDate(result.getDate() + days);
    return result;
  }
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}

export function scheduledFireTime(
  stageChangedAt: string,
  delayDays: number,
  skipWeekends: boolean,
  runTime: string | null
): Date {
  const base = addDays(new Date(stageChangedAt), delayDays, skipWeekends);
  if (runTime) {
    const [h, m] = runTime.split(":").map(Number);
    base.setHours(h, m, 0, 0);
  }
  return base;
}

type TemplateDeal = {
  person_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  value: number | null;
};

/** Substitui as variáveis do template pelos dados do deal — placeholders
 * disponíveis pro admin no editor: {{nome}}, {{academia}}, {{valor}},
 * {{telefone}}, {{email}}. */
export function renderTemplate(template: string, deal: TemplateDeal): string {
  return template
    .replaceAll("{{nome}}", deal.person_name ?? "")
    .replaceAll("{{academia}}", deal.company_name ?? "")
    .replaceAll(
      "{{valor}}",
      deal.value != null ? deal.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""
    )
    .replaceAll("{{telefone}}", deal.phone ?? "")
    .replaceAll("{{email}}", deal.email ?? "");
}

/** Executa, na hora, as regras com `delay_days = 0` da etapa que o deal
 * acabou de entrar — chamado direto do PATCH de estágio
 * (`app/api/deals/[id]/route.ts`), sem esperar o cron diário. As regras
 * com atraso (24h/48h/72h etc.) continuam passando só pelo cron — não
 * tem granularidade menor que 1x/dia no plano atual (ver comentário no
 * topo do arquivo), mas pra "imediata" isso não é aceitável: o SDR
 * precisa da tarefa na hora que o lead entra em contato. */
export async function runImmediateDealAutomations(admin: SupabaseClient<Database>, dealId: string, stage: number) {
  const { data: rules } = await admin
    .from("deal_automations")
    .select("*")
    .eq("active", true)
    .eq("trigger_stage", stage)
    .eq("delay_days", 0);
  if (!rules || rules.length === 0) return;

  const { data: deal } = await admin.from("deals").select("*").eq("id", dealId).single();
  if (!deal) return;

  for (const rule of rules) {
    const { data: already } = await admin
      .from("deal_automation_runs")
      .select("id")
      .eq("rule_id", rule.id)
      .eq("deal_id", deal.id)
      .eq("stage_changed_at", deal.stage_changed_at)
      .maybeSingle();
    if (already) continue;

    let status = "success";
    let detail: string | null = null;

    if (rule.action_type === "email") {
      if (!deal.email) {
        status = "skipped";
        detail = "Negociação sem e-mail cadastrado";
      } else {
        const subject = renderTemplate(rule.template_subject ?? rule.title, deal);
        const body = renderTemplate(rule.template_body ?? "", deal);
        const result = await sendEmail(deal.email, subject, body);
        status = result.status === "sent" ? "success" : result.status;
        detail = result.detail ?? null;
      }
    } else if (rule.action_type === "whatsapp") {
      if (!deal.phone) {
        status = "skipped";
        detail = "Negociação sem telefone cadastrado";
      } else {
        const message = renderTemplate(rule.template_body ?? rule.title, deal);
        const result = await sendWhatsapp(deal.phone, message);
        status = result.status === "sent" ? "success" : result.status;
        detail = result.detail ?? null;
      }
    } else {
      const title = renderTemplate(rule.template_subject ?? rule.title, deal);
      await admin.from("deal_tasks").insert({
        deal_id: deal.id,
        title,
        description: rule.template_body ? renderTemplate(rule.template_body, deal) : null,
        assigned_to: deal.assigned_to,
        task_type: rule.task_type === "whatsapp" ? "whatsapp" : "ligacao",
        due_date: new Date().toISOString(),
      });
    }

    await admin.from("deal_automation_runs").insert({
      rule_id: rule.id,
      deal_id: deal.id,
      stage_changed_at: deal.stage_changed_at,
      status,
      detail,
    });
    await admin.from("deal_automations").update({ run_count: (rule.run_count ?? 0) + 1 }).eq("id", rule.id);
  }
}

/** Avalia todas as regras ativas de `deal_automations` contra os deals que
 * estão hoje na etapa gatilho de cada regra e dispara a ação (e-mail,
 * WhatsApp ou nova atividade) para quem já cumpriu o atraso configurado e
 * ainda não foi processado para a etapa atual (`deal_automation_runs`
 * evita repetir o disparo enquanto o deal não mudar de etapa de novo). */
export async function runDealAutomations(admin: SupabaseClient<Database>) {
  const now = new Date();
  const { data: rules, error: rulesError } = await admin.from("deal_automations").select("*").eq("active", true);
  if (rulesError) return { disparos: 0, error: rulesError.message };

  let disparos = 0;

  for (const rule of rules ?? []) {
    const { data: deals, error: dealsError } = await admin
      .from("deals")
      .select("*")
      .eq("stage", rule.trigger_stage)
      .eq("lost", false);
    if (dealsError) continue;

    let ruleDisparos = 0;

    for (const deal of deals ?? []) {
      const fireAt = scheduledFireTime(deal.stage_changed_at, rule.delay_days, rule.skip_weekends, rule.run_time);
      if (fireAt > now) continue;

      const { data: already } = await admin
        .from("deal_automation_runs")
        .select("id")
        .eq("rule_id", rule.id)
        .eq("deal_id", deal.id)
        .eq("stage_changed_at", deal.stage_changed_at)
        .maybeSingle();
      if (already) continue;

      let status = "success";
      let detail: string | null = null;

      if (rule.action_type === "email") {
        if (!deal.email) {
          status = "skipped";
          detail = "Negociação sem e-mail cadastrado";
        } else {
          const subject = renderTemplate(rule.template_subject ?? rule.title, deal);
          const body = renderTemplate(rule.template_body ?? "", deal);
          const result = await sendEmail(deal.email, subject, body);
          status = result.status === "sent" ? "success" : result.status;
          detail = result.detail ?? null;
        }
      } else if (rule.action_type === "whatsapp") {
        if (!deal.phone) {
          status = "skipped";
          detail = "Negociação sem telefone cadastrado";
        } else {
          const message = renderTemplate(rule.template_body ?? rule.title, deal);
          const result = await sendWhatsapp(deal.phone, message);
          status = result.status === "sent" ? "success" : result.status;
          detail = result.detail ?? null;
        }
      } else {
        const title = renderTemplate(rule.template_subject ?? rule.title, deal);
        await admin.from("deal_tasks").insert({
          deal_id: deal.id,
          title,
          description: rule.template_body ? renderTemplate(rule.template_body, deal) : null,
          assigned_to: deal.assigned_to,
          task_type: rule.task_type === "whatsapp" ? "whatsapp" : "ligacao",
          due_date: now.toISOString(),
        });
      }

      await admin.from("deal_automation_runs").insert({
        rule_id: rule.id,
        deal_id: deal.id,
        stage_changed_at: deal.stage_changed_at,
        status,
        detail,
      });
      disparos++;
      ruleDisparos++;
    }

    if (ruleDisparos > 0) {
      await admin.from("deal_automations").update({ run_count: (rule.run_count ?? 0) + ruleDisparos }).eq("id", rule.id);
    }
  }

  return { disparos };
}
