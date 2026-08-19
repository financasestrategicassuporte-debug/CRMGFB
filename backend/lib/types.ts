// Auto-generated from the gymplus-backend Supabase project (zjcxdqlifimnezxuzulc).
// Regenerate with: npx supabase gen types typescript --project-id zjcxdqlifimnezxuzulc > lib/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_spend: {
        Row: {
          amount: number
          created_at: string
          id: string
          period: string
          product_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          period?: string
          product_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          period?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_spend_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          audio_duration: number | null
          audio_url: string | null
          author_id: string | null
          body: string | null
          client_id: string
          created_at: string
          id: string
          tag: string
          title: string
          waveform: Json | null
        }
        Insert: {
          audio_duration?: number | null
          audio_url?: string | null
          author_id?: string | null
          body?: string | null
          client_id: string
          created_at?: string
          id?: string
          tag: string
          title: string
          waveform?: Json | null
        }
        Update: {
          audio_duration?: number | null
          audio_url?: string | null
          author_id?: string | null
          body?: string | null
          client_id?: string
          created_at?: string
          id?: string
          tag?: string
          title?: string
          waveform?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          canal: string
          detail: string | null
          executado_em: string
          id: string
          rule_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          canal: string
          detail?: string | null
          executado_em?: string
          id?: string
          rule_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          canal?: string
          detail?: string | null
          executado_em?: string
          id?: string
          rule_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_json: Json | null
          active: boolean
          channels: string[]
          client_id: string | null
          condition: string | null
          condition_json: Json | null
          created_at: string
          icon: string | null
          id: string
          run_count: number
          run_time: string | null
          title: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          action_json?: Json | null
          active?: boolean
          channels?: string[]
          client_id?: string | null
          condition?: string | null
          condition_json?: Json | null
          created_at?: string
          icon?: string | null
          id?: string
          run_count?: number
          run_time?: string | null
          title: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          action_json?: Json | null
          active?: boolean
          channels?: string[]
          client_id?: string | null
          condition?: string | null
          condition_json?: Json | null
          created_at?: string
          icon?: string | null
          id?: string
          run_count?: number
          run_time?: string | null
          title?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      break_logs: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          profile_id: string
          started_at: string
          tipo: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          profile_id: string
          started_at?: string
          tipo?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          profile_id?: string
          started_at?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "break_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_week_attachments: {
        Row: {
          client_week_progress_id: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          playbook_week_field_id: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          client_week_progress_id: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          playbook_week_field_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          client_week_progress_id?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          playbook_week_field_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_week_attachments_client_week_progress_id_fkey"
            columns: ["client_week_progress_id"]
            isOneToOne: false
            referencedRelation: "client_week_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_week_attachments_playbook_week_field_id_fkey"
            columns: ["playbook_week_field_id"]
            isOneToOne: false
            referencedRelation: "playbook_week_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      client_week_field_responses: {
        Row: {
          client_week_progress_id: string
          id: string
          playbook_week_field_id: string
          response: Json | null
          submitted_at: string
        }
        Insert: {
          client_week_progress_id: string
          id?: string
          playbook_week_field_id: string
          response?: Json | null
          submitted_at?: string
        }
        Update: {
          client_week_progress_id?: string
          id?: string
          playbook_week_field_id?: string
          response?: Json | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_week_field_responses_client_week_progress_id_fkey"
            columns: ["client_week_progress_id"]
            isOneToOne: false
            referencedRelation: "client_week_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_week_field_responses_playbook_week_field_id_fkey"
            columns: ["playbook_week_field_id"]
            isOneToOne: false
            referencedRelation: "playbook_week_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      client_week_progress: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          email_body: string | null
          email_sent_at: string | null
          email_status: string
          email_subject: string | null
          id: string
          scheduled_send_at: string | null
          week_number: number
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          email_body?: string | null
          email_sent_at?: string | null
          email_status?: string
          email_subject?: string | null
          id?: string
          scheduled_send_at?: string | null
          week_number: number
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          email_body?: string | null
          email_sent_at?: string | null
          email_status?: string
          email_subject?: string | null
          id?: string
          scheduled_send_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_week_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          atividade_status: string
          avatar_bg: string | null
          closer_id: string | null
          consultant_id: string | null
          created_at: string
          current_week: number
          data_primeira_compra: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          financeiro_status: string
          id: string
          ltv: number | null
          name: string
          plan_id: string | null
          progress: number
          start_date: string
          ticket_medio: number | null
          unidade: string | null
          updated_at: string
          user_id: string | null
          valor: number | null
          vencimento: string | null
          whatsapp: string | null
        }
        Insert: {
          atividade_status?: string
          avatar_bg?: string | null
          closer_id?: string | null
          consultant_id?: string | null
          created_at?: string
          current_week?: number
          data_primeira_compra?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          financeiro_status?: string
          id?: string
          ltv?: number | null
          name: string
          plan_id?: string | null
          progress?: number
          start_date?: string
          ticket_medio?: number | null
          unidade?: string | null
          updated_at?: string
          user_id?: string | null
          valor?: number | null
          vencimento?: string | null
          whatsapp?: string | null
        }
        Update: {
          atividade_status?: string
          avatar_bg?: string | null
          closer_id?: string | null
          consultant_id?: string | null
          created_at?: string
          current_week?: number
          data_primeira_compra?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          financeiro_status?: string
          id?: string
          ltv?: number | null
          name?: string
          plan_id?: string | null
          progress?: number
          start_date?: string
          ticket_medio?: number | null
          unidade?: string | null
          updated_at?: string
          user_id?: string | null
          valor?: number | null
          vencimento?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cobranca_steps: {
        Row: {
          client_id: string
          created_at: string
          done: boolean
          done_at: string | null
          id: string
          scheduled_for: string
          step: string
        }
        Insert: {
          client_id: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          scheduled_for: string
          step: string
        }
        Update: {
          client_id?: string
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          scheduled_for?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobranca_steps_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          campaign_active: boolean
          campaign_closer_amount: number | null
          campaign_label: string | null
          campaign_sdr_amount: number | null
          closer_base_amount: number
          id: string
          sdr_base_amount: number
          updated_at: string
        }
        Insert: {
          campaign_active?: boolean
          campaign_closer_amount?: number | null
          campaign_label?: string | null
          campaign_sdr_amount?: number | null
          closer_base_amount?: number
          id?: string
          sdr_base_amount?: number
          updated_at?: string
        }
        Update: {
          campaign_active?: boolean
          campaign_closer_amount?: number | null
          campaign_label?: string | null
          campaign_sdr_amount?: number | null
          closer_base_amount?: number
          id?: string
          sdr_base_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          closer_id: string
          created_at: string
          deal_id: string | null
          id: string
          percent: number | null
          period: string
          status: string
          tipo: string
        }
        Insert: {
          amount: number
          closer_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          percent?: number | null
          period?: string
          status?: string
          tipo?: string
        }
        Update: {
          amount?: number
          closer_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          percent?: number | null
          period?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string
          created_at: string
          deal_id: string | null
          ia_intencao: string | null
          ia_objecoes: Json | null
          ia_resumo: string | null
          id: string
          lead_id: string | null
          sdr_id: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          deal_id?: string | null
          ia_intencao?: string | null
          ia_objecoes?: Json | null
          ia_resumo?: string | null
          id?: string
          lead_id?: string | null
          sdr_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          deal_id?: string | null
          ia_intencao?: string | null
          ia_objecoes?: Json | null
          ia_resumo?: string | null
          id?: string
          lead_id?: string | null
          sdr_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_automation_runs: {
        Row: {
          deal_id: string
          detail: string | null
          executed_at: string
          id: string
          rule_id: string
          stage_changed_at: string
          status: string
        }
        Insert: {
          deal_id: string
          detail?: string | null
          executed_at?: string
          id?: string
          rule_id: string
          stage_changed_at: string
          status: string
        }
        Update: {
          deal_id?: string
          detail?: string | null
          executed_at?: string
          id?: string
          rule_id?: string
          stage_changed_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_automation_runs_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "deal_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_automations: {
        Row: {
          action_type: string
          active: boolean
          created_at: string
          delay_days: number
          id: string
          run_count: number
          run_time: string | null
          skip_weekends: boolean
          task_type: string | null
          template_body: string | null
          template_subject: string | null
          title: string
          trigger_stage: number
          updated_at: string
        }
        Insert: {
          action_type: string
          active?: boolean
          created_at?: string
          delay_days?: number
          id?: string
          run_count?: number
          run_time?: string | null
          skip_weekends?: boolean
          task_type?: string | null
          template_body?: string | null
          template_subject?: string | null
          title: string
          trigger_stage: number
          updated_at?: string
        }
        Update: {
          action_type?: string
          active?: boolean
          created_at?: string
          delay_days?: number
          id?: string
          run_count?: number
          run_time?: string | null
          skip_weekends?: boolean
          task_type?: string | null
          template_body?: string | null
          template_subject?: string | null
          title?: string
          trigger_stage?: number
          updated_at?: string
        }
        Relationships: []
      }
      deal_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          deal_id: string
          id: string
          is_ai_generated: boolean
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          deal_id: string
          id?: string
          is_ai_generated?: boolean
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          deal_id?: string
          id?: string
          is_ai_generated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          deal_id: string
          description: string | null
          done: boolean
          due_date: string | null
          id: string
          task_type: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deal_id: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          task_type?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deal_id?: string
          description?: string | null
          done?: boolean
          due_date?: string | null
          id?: string
          task_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          ad: string | null
          adset: string | null
          assigned_to: string | null
          campaign: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_attended_at: string | null
          first_contacted_at: string | null
          forecast: string | null
          id: string
          lost: boolean
          lost_reason: string | null
          objective: string | null
          owner_name: string | null
          pain_points: string | null
          paused: boolean
          person_name: string
          phone: string | null
          pipeline: string
          preferred_time: string | null
          product: string | null
          product_id: string | null
          profile_notes: string | null
          qualification: number | null
          revenue: number | null
          score: number | null
          source: string | null
          stage: number
          stage_changed_at: string
          students_count: number | null
          task_date: string | null
          task_desc: string | null
          task_type: string | null
          ticket: number | null
          updated_at: string
          value: number | null
        }
        Insert: {
          ad?: string | null
          adset?: string | null
          assigned_to?: string | null
          campaign?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_attended_at?: string | null
          first_contacted_at?: string | null
          forecast?: string | null
          id?: string
          lost?: boolean
          lost_reason?: string | null
          objective?: string | null
          owner_name?: string | null
          pain_points?: string | null
          paused?: boolean
          person_name: string
          phone?: string | null
          pipeline: string
          preferred_time?: string | null
          product?: string | null
          product_id?: string | null
          profile_notes?: string | null
          qualification?: number | null
          revenue?: number | null
          score?: number | null
          source?: string | null
          stage?: number
          stage_changed_at?: string
          students_count?: number | null
          task_date?: string | null
          task_desc?: string | null
          task_type?: string | null
          ticket?: number | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          ad?: string | null
          adset?: string | null
          assigned_to?: string | null
          campaign?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_attended_at?: string | null
          first_contacted_at?: string | null
          forecast?: string | null
          id?: string
          lost?: boolean
          lost_reason?: string | null
          objective?: string | null
          owner_name?: string | null
          pain_points?: string | null
          paused?: boolean
          person_name?: string
          phone?: string | null
          pipeline?: string
          preferred_time?: string | null
          product?: string | null
          product_id?: string | null
          profile_notes?: string | null
          qualification?: number | null
          revenue?: number | null
          score?: number | null
          source?: string | null
          stage?: number
          stage_changed_at?: string
          students_count?: number | null
          task_date?: string | null
          task_desc?: string | null
          task_type?: string | null
          ticket?: number | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          id: string
          key: string
          subject: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_html: string
          id?: string
          key: string
          subject: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_html?: string
          id?: string
          key?: string
          subject?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      group_migrations: {
        Row: {
          client_id: string
          created_at: string
          data: string
          grupo_destino: string
          grupo_origem: string
          id: string
          impacto_financeiro: number | null
          motivo: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: string
          grupo_destino: string
          grupo_origem: string
          id?: string
          impacto_financeiro?: number | null
          motivo?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: string
          grupo_destino?: string
          grupo_origem?: string
          id?: string
          impacto_financeiro?: number | null
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_migrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_distribution_settings: {
        Row: {
          auto_enabled: boolean
          id: string
          paused: boolean
          strategy: string
          updated_at: string
        }
        Insert: {
          auto_enabled?: boolean
          id?: string
          paused?: boolean
          strategy?: string
          updated_at?: string
        }
        Update: {
          auto_enabled?: boolean
          id?: string
          paused?: boolean
          strategy?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ad: string | null
          adset: string | null
          campaign: string | null
          converted_deal_id: string | null
          created_at: string
          email: string | null
          gym_name: string | null
          id: string
          name: string
          pain_points: string | null
          phone: string | null
          revenue: number | null
          source: string
          students_count: number | null
          utm: Json | null
        }
        Insert: {
          ad?: string | null
          adset?: string | null
          campaign?: string | null
          converted_deal_id?: string | null
          created_at?: string
          email?: string | null
          gym_name?: string | null
          id?: string
          name: string
          pain_points?: string | null
          phone?: string | null
          revenue?: number | null
          source?: string
          students_count?: number | null
          utm?: Json | null
        }
        Update: {
          ad?: string | null
          adset?: string | null
          campaign?: string | null
          converted_deal_id?: string | null
          created_at?: string
          email?: string | null
          gym_name?: string | null
          id?: string
          name?: string
          pain_points?: string | null
          phone?: string | null
          revenue?: number | null
          source?: string
          students_count?: number | null
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_deal_id_fkey"
            columns: ["converted_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          client_id: string | null
          created_at: string
          deal_id: string | null
          duration_minutes: number | null
          id: string
          meeting_date: string
          summary: string | null
          title: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_date: string
          summary?: string | null
          title: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deal_id?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_date?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          price: number | null
          total_weeks: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          price?: number | null
          total_weeks?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          price?: number | null
          total_weeks?: number
        }
        Relationships: []
      }
      playbook_week_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          label: string
          options: Json | null
          playbook_week_id: string
          position: number
        }
        Insert: {
          created_at?: string
          field_type: string
          id?: string
          label: string
          options?: Json | null
          playbook_week_id: string
          position?: number
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          label?: string
          options?: Json | null
          playbook_week_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_week_fields_playbook_week_id_fkey"
            columns: ["playbook_week_id"]
            isOneToOne: false
            referencedRelation: "playbook_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_weeks: {
        Row: {
          broadcast_sent_at: string | null
          channels: string[]
          created_at: string
          detail: string | null
          id: string
          plan_id: string
          send_at: string | null
          title: string
          week_number: number
        }
        Insert: {
          broadcast_sent_at?: string | null
          channels?: string[]
          created_at?: string
          detail?: string | null
          id?: string
          plan_id: string
          send_at?: string | null
          title: string
          week_number: number
        }
        Update: {
          broadcast_sent_at?: string | null
          channels?: string[]
          created_at?: string
          detail?: string | null
          id?: string
          plan_id?: string
          send_at?: string | null
          title?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_weeks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          email: string
          id: string
          initials: string | null
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          email: string
          id: string
          initials?: string | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          email?: string
          id?: string
          initials?: string | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          client_id: string
          created_at: string
          data: string
          id: string
          product_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: string
          id?: string
          product_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: string
          id?: string
          product_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      rfv_snapshots: {
        Row: {
          client_id: string
          created_at: string
          data: string
          frequencia: number
          grupo: string
          health_score: number
          id: string
          recencia: number
          tempo_entre_compras: number | null
          ticket_medio: number
          valor: number
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: string
          frequencia: number
          grupo: string
          health_score: number
          id?: string
          recencia: number
          tempo_entre_compras?: number | null
          ticket_medio?: number
          valor?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: string
          frequencia?: number
          grupo?: string
          health_score?: number
          id?: string
          recencia?: number
          tempo_entre_compras?: number | null
          ticket_medio?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfv_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit_log: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          client_id: string | null
          client_week_progress_id: string | null
          created_at: string
          event_type: string
          file_name: string | null
          id: string
          metadata: Json
          recipient_email: string | null
          status: string | null
          storage_path: string | null
          subject: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          client_id?: string | null
          client_week_progress_id?: string | null
          created_at?: string
          event_type: string
          file_name?: string | null
          id?: string
          metadata?: Json
          recipient_email?: string | null
          status?: string | null
          storage_path?: string | null
          subject?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          client_id?: string | null
          client_week_progress_id?: string | null
          created_at?: string
          event_type?: string
          file_name?: string | null
          id?: string
          metadata?: Json
          recipient_email?: string | null
          status?: string | null
          storage_path?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_audit_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_audit_log_client_week_progress_id_fkey"
            columns: ["client_week_progress_id"]
            isOneToOne: false
            referencedRelation: "client_week_progress"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_team_member: { Args: never; Returns: boolean }
      submit_week_form: {
        Args: { p_client_id: string; p_week_number: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
