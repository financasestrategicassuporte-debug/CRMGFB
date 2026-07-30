import { z } from "zod";

export const teamMemberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "sdr", "closer"]),
  phone: z.string().optional(),
  initials: z.string().max(3).optional(),
  color: z.string().optional(),
});

export const teamMemberUpdateSchema = teamMemberSchema
  .omit({ password: true })
  .partial()
  .extend({ active: z.boolean().optional() });

export const clientSchema = z.object({
  name: z.string().min(2),
  plan_id: z.string().uuid().nullable().optional(),
  consultant_id: z.string().uuid().nullable().optional(),
  valor: z.number().nonnegative().nullable().optional(),
  vencimento: z.string().nullable().optional(),
  start_date: z.string().optional(),
  avatar_bg: z.string().optional(),
});

export const clientUpdateSchema = clientSchema.partial().extend({
  current_week: z.number().int().min(1).optional(),
  progress: z.number().min(0).max(100).optional(),
  atividade_status: z.enum(["no_prazo", "atrasado", "prazo_encerrado"]).optional(),
  financeiro_status: z.enum(["em_dia", "inadimplente", "sem_contato"]).optional(),
});

export const dealSchema = z.object({
  pipeline: z.enum(["quente", "frio"]),
  person_name: z.string().min(2),
  company_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  product: z.string().optional(),
  stage: z.number().int().min(0).max(6).optional(),
  value: z.number().nonnegative().optional(),
  task_type: z.string().optional(),
  task_desc: z.string().optional(),
  task_date: z.string().optional(),
  source: z.string().optional(),
  campaign: z.string().optional(),
  adset: z.string().optional(),
  ad: z.string().optional(),
  objective: z.string().optional(),
  students_count: z.number().int().nonnegative().optional(),
  ticket: z.number().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  owner_name: z.string().optional(),
  forecast: z.string().optional(),
  preferred_time: z.string().optional(),
  profile_notes: z.string().optional(),
  pain_points: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  lost: z.boolean().optional(),
  lost_reason: z.string().optional(),
  paused: z.boolean().optional(),
});

export const dealUpdateSchema = dealSchema.partial();

export const dealNoteSchema = z.object({
  body: z.string().min(1),
  is_ai_generated: z.boolean().optional(),
});

export const dealTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  task_type: z.string().optional(),
  due_date: z.string().optional(),
});

export const dealTaskUpdateSchema = dealTaskSchema.partial().extend({
  done: z.boolean().optional(),
});

export const dealAutomationSchema = z.object({
  title: z.string().min(2),
  trigger_stage: z.number().int().min(0).max(6),
  action_type: z.enum(["email", "whatsapp", "task"]),
  task_type: z.enum(["ligacao", "whatsapp"]).optional(),
  run_time: z.string().optional(),
  skip_weekends: z.boolean().optional(),
  delay_days: z.number().int().min(0).optional(),
  template_subject: z.string().optional(),
  template_body: z.string().optional(),
  active: z.boolean().optional(),
});

export const dealAutomationUpdateSchema = dealAutomationSchema.partial();

export const automationSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  title: z.string().min(2),
  icon: z.string().optional(),
  trigger_event: z.string().min(1),
  condition: z.string().optional(),
  run_time: z.string().optional(),
  channels: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export const automationUpdateSchema = automationSchema.partial();

export const cobrancaStepSchema = z.object({
  client_id: z.string().uuid(),
  step: z.enum(["D+1", "D+3", "D+5", "D+7", "D+10"]),
  scheduled_for: z.string(),
});

export const auditSchema = z.object({
  tag: z.enum(["audio", "texto", "formulario"]),
  title: z.string().min(1),
  body: z.string().optional(),
  audio_url: z.string().url().optional(),
  audio_duration: z.number().int().nonnegative().optional(),
  waveform: z.array(z.number()).optional(),
});

export const meetingSchema = z
  .object({
    deal_id: z.string().uuid().optional(),
    client_id: z.string().uuid().optional(),
    title: z.string().min(1),
    meeting_date: z.string(),
    duration_minutes: z.number().int().nonnegative().optional(),
    summary: z.string().optional(),
  })
  .refine((v) => v.deal_id || v.client_id, {
    message: "Informe deal_id ou client_id",
  });

export const commissionSchema = z.object({
  closer_id: z.string().uuid(),
  deal_id: z.string().uuid().optional(),
  amount: z.number().nonnegative(),
  percent: z.number().nonnegative().optional(),
  status: z.enum(["pending", "paid"]).optional(),
  period: z.string().optional(),
});

export const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gym_name: z.string().optional(),
  students_count: z.number().int().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  pain_points: z.string().optional(),
  source: z.string().optional(),
  campaign: z.string().optional(),
  adset: z.string().optional(),
  ad: z.string().optional(),
  utm: z.record(z.string()).optional(),
});

export const purchaseSchema = z.object({
  client_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  valor: z.number().nonnegative(),
  tipo: z.enum(["nova", "renovacao", "upsell", "cross", "indicacao"]),
  data: z.string().optional(),
});

export const messageSchema = z.object({
  direction: z.enum(["in", "out"]).default("in"),
  content: z.string().min(1),
});

export const conversationSchema = z.object({
  deal_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  sdr_id: z.string().uuid(),
  channel: z.enum(["whatsapp", "instagram", "messenger"]),
});

export const adSpendSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  period: z.string().optional(),
  amount: z.number().nonnegative(),
});

export const distributeSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1),
  strategy: z.enum(["round_robin", "balanceamento", "peso", "prioridade", "manual"]),
  manual_assignments: z.record(z.string().uuid()).optional(),
});

export const whatsappWebhookSchema = z.object({
  from: z.string().min(1),
  message: z.string().min(1),
  sdr_id: z.string().uuid(),
  deal_id: z.string().uuid().optional(),
});

export const weekResponseSchema = z.object({
  responses: z.array(
    z.object({
      playbook_week_field_id: z.string().uuid(),
      response: z.any(),
    })
  ),
  complete_week: z.boolean().optional(),
});
