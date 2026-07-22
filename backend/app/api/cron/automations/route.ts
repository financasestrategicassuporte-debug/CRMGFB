import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargets, buildMessage, type ConditionJson } from "@/lib/automationEngine";
import { sendWhatsapp } from "@/lib/integrations/whatsapp";
import { sendEmail } from "@/lib/integrations/email";

/** Roda periodicamente (ver vercel.json) e avalia todas as automações
 * ativas contra o estado atual dos clientes, evitando disparar duas vezes
 * no mesmo dia para o mesmo cliente (checa `automation_runs` de hoje
 * antes de agir). Envio de verdade passa pelos adapters de
 * `lib/integrations/*` — sem credencial configurada, eles só logam. */
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

  return NextResponse.json({ disparos });
}
