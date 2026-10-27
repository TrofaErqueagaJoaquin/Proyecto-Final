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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          accessibility_notes: string[]
          age_max_months: number
          age_min_months: number
          cost_level: string
          created_at: string
          duration_min: number
          evidence_label: string
          id: string
          materials: string[]
          objective: string
          participants_max: number | null
          participants_min: number
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          safety_notes: string | null
          search: unknown
          slug: string
          sort_order: number
          space: string
          status: string
          summary: string
          title: string
          updated_at: string
          variants: string[]
        }
        Insert: {
          accessibility_notes?: string[]
          age_max_months: number
          age_min_months: number
          cost_level: string
          created_at?: string
          duration_min: number
          evidence_label: string
          id?: string
          materials?: string[]
          objective: string
          participants_max?: number | null
          participants_min?: number
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_notes?: string | null
          search?: unknown
          slug: string
          sort_order?: number
          space: string
          status?: string
          summary: string
          title: string
          updated_at?: string
          variants?: string[]
        }
        Update: {
          accessibility_notes?: string[]
          age_max_months?: number
          age_min_months?: number
          cost_level?: string
          created_at?: string
          duration_min?: number
          evidence_label?: string
          id?: string
          materials?: string[]
          objective?: string
          participants_max?: number | null
          participants_min?: number
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          safety_notes?: string | null
          search?: unknown
          slug?: string
          sort_order?: number
          space?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          variants?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "activities_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_categories: {
        Row: {
          code: string
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      activity_category_links: {
        Row: {
          activity_id: string
          category_code: string
        }
        Insert: {
          activity_id: string
          category_code: string
        }
        Update: {
          activity_id?: string
          category_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_category_links_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_category_links_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      activity_log_participants: {
        Row: {
          log_id: string
          member_id: string
        }
        Insert: {
          log_id: string
          member_id: string
        }
        Update: {
          log_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_participants_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          activity_id: string
          created_at: string
          done_on: string
          family_id: string
          id: string
          logged_by: string | null
          rating: number | null
        }
        Insert: {
          activity_id: string
          created_at?: string
          done_on?: string
          family_id: string
          id?: string
          logged_by?: string | null
          rating?: number | null
        }
        Update: {
          activity_id?: string
          created_at?: string
          done_on?: string
          family_id?: string
          id?: string
          logged_by?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sources: {
        Row: {
          activity_id: string
          locator: string | null
          source_id: string
        }
        Insert: {
          activity_id: string
          locator?: string | null
          source_id: string
        }
        Update: {
          activity_id?: string
          locator?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sources_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_steps: {
        Row: {
          activity_id: string
          body: string
          position: number
        }
        Insert: {
          activity_id: string
          body: string
          position: number
        }
        Update: {
          activity_id?: string
          body?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_steps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          option_id: string | null
          question_id: string
          value_number: number | null
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          option_id?: string | null
          question_id: string
          value_number?: number | null
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          option_id?: string | null
          question_id?: string
          value_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          engine_version: string | null
          family_id: string
          id: string
          member_age_months: number
          member_id: string
          respondent_id: string | null
          started_at: string
          status: string
          submitted_at: string | null
          updated_at: string
          version_id: string
        }
        Insert: {
          engine_version?: string | null
          family_id: string
          id?: string
          member_age_months: number
          member_id: string
          respondent_id?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          version_id: string
        }
        Update: {
          engine_version?: string | null
          family_id?: string
          id?: string
          member_age_months?: number
          member_id?: string
          respondent_id?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_dimension_scores: {
        Row: {
          attempt_id: string
          band: string
          dimension_code: string
          explanation: Json
          normalized: number
          raw_score: number
        }
        Insert: {
          attempt_id: string
          band: string
          dimension_code: string
          explanation?: Json
          normalized: number
          raw_score: number
        }
        Update: {
          attempt_id?: string
          band?: string
          dimension_code?: string
          explanation?: Json
          normalized?: number
          raw_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_dimension_scores_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          entity_id: string | null
          entity_type: string
          family_id: string | null
          id: number
          metadata: Json
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          entity_id?: string | null
          entity_type: string
          family_id?: string | null
          id?: never
          metadata?: Json
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          entity_id?: string | null
          entity_type?: string
          family_id?: string | null
          id?: never
          metadata?: Json
          occurred_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          family_id: string | null
          granted_at: string
          granted_by: string
          id: string
          member_id: string | null
          policy_version: string
          purpose: string
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          family_id?: string | null
          granted_at?: string
          granted_by: string
          id?: string
          member_id?: string | null
          policy_version: string
          purpose: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          family_id?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          member_id?: string | null
          policy_version?: string
          purpose?: string
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consents_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          age_max_months: number | null
          age_min_months: number | null
          body_md: string
          created_at: string
          evidence_label: string
          id: string
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search: unknown
          slug: string
          sort_order: number
          status: string
          summary: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          age_max_months?: number | null
          age_min_months?: number | null
          body_md: string
          created_at?: string
          evidence_label: string
          id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search?: unknown
          slug: string
          sort_order?: number
          status?: string
          summary: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          age_max_months?: number | null
          age_min_months?: number | null
          body_md?: string
          created_at?: string
          evidence_label?: string
          id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search?: unknown
          slug?: string
          sort_order?: number
          status?: string
          summary?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          body_md: string
          content_id: string
          created_at: string
          edited_by: string | null
          revision: number
        }
        Insert: {
          body_md: string
          content_id: string
          created_at?: string
          edited_by?: string | null
          revision: number
        }
        Update: {
          body_md?: string
          content_id?: string
          created_at?: string
          edited_by?: string | null
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_revisions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sources: {
        Row: {
          content_id: string
          locator: string | null
          source_id: string
        }
        Insert: {
          content_id: string
          locator?: string | null
          source_id: string
        }
        Update: {
          content_id?: string
          locator?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sources_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          chat_history_enabled: boolean
          chat_retention_days: number
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          chat_history_enabled?: boolean
          chat_retention_days?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          chat_history_enabled?: boolean
          chat_retention_days?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "families_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          family_id: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          alias: string
          archived_at: string | null
          birth_month: string
          created_at: string
          family_id: string
          id: string
          interests: string[]
          updated_at: string
        }
        Insert: {
          alias: string
          archived_at?: string | null
          birth_month: string
          created_at?: string
          family_id: string
          id?: string
          interests?: string[]
          updated_at?: string
        }
        Update: {
          alias?: string
          archived_at?: string | null
          birth_month?: string
          created_at?: string
          family_id?: string
          id?: string
          interests?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_memberships: {
        Row: {
          created_at: string
          family_id: string
          invited_by: string | null
          relationship: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          invited_by?: string | null
          relationship: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          invited_by?: string | null
          relationship?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_preferences: {
        Row: {
          budget: string | null
          family_id: string
          interests: string[]
          minutes_per_day: number | null
          space: string | null
          updated_at: string
        }
        Insert: {
          budget?: string | null
          family_id: string
          interests?: string[]
          minutes_per_day?: number | null
          space?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string | null
          family_id?: string
          interests?: string[]
          minutes_per_day?: number | null
          space?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_preferences_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: true
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          locale: string
          theme_pref: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          locale?: string
          theme_pref?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          theme_pref?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          code: string
          id: string
          label: string
          position: number
          question_id: string
          value: number
        }
        Insert: {
          code: string
          id?: string
          label: string
          position: number
          question_id: string
          value: number
        }
        Update: {
          code?: string
          id?: string
          label?: string
          position?: number
          question_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_sections: {
        Row: {
          code: string
          description: string | null
          id: string
          max_age_months: number | null
          min_age_months: number | null
          position: number
          title: string
          version_id: string
        }
        Insert: {
          code: string
          description?: string | null
          id?: string
          max_age_months?: number | null
          min_age_months?: number | null
          position: number
          title: string
          version_id: string
        }
        Update: {
          code?: string
          description?: string | null
          id?: string
          max_age_months?: number | null
          min_age_months?: number | null
          position?: number
          title?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_sections_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_versions: {
        Row: {
          created_at: string
          estimated_minutes: number
          evidence_label: string
          id: string
          max_age_months: number
          min_age_months: number
          published_at: string | null
          questionnaire_id: string
          scoring_spec: Json
          source_hash: string | null
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          estimated_minutes: number
          evidence_label: string
          id?: string
          max_age_months: number
          min_age_months: number
          published_at?: string | null
          questionnaire_id: string
          scoring_spec: Json
          source_hash?: string | null
          status?: string
          version: number
        }
        Update: {
          created_at?: string
          estimated_minutes?: number
          evidence_label?: string
          id?: string
          max_age_months?: number
          min_age_months?: number
          published_at?: string | null
          questionnaire_id?: string
          scoring_spec?: Json
          source_hash?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_versions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          description: string
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          code: string
          help_text: string | null
          id: string
          max_age_months: number | null
          min_age_months: number | null
          number_max: number | null
          number_min: number | null
          number_step: number | null
          position: number
          prompt: string
          required: boolean
          section_id: string
          show_if: Json | null
          type: string
          unit: string | null
        }
        Insert: {
          code: string
          help_text?: string | null
          id?: string
          max_age_months?: number | null
          min_age_months?: number | null
          number_max?: number | null
          number_min?: number | null
          number_step?: number | null
          position: number
          prompt: string
          required?: boolean
          section_id: string
          show_if?: Json | null
          type: string
          unit?: string | null
        }
        Update: {
          code?: string
          help_text?: string | null
          id?: string
          max_age_months?: number | null
          min_age_months?: number | null
          number_max?: number | null
          number_min?: number | null
          number_step?: number | null
          position?: number
          prompt?: string
          required?: boolean
          section_id?: string
          show_if?: Json | null
          type?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          activity_id: string | null
          attempt_id: string
          content_item_id: string | null
          created_at: string
          family_id: string
          id: string
          member_id: string
          priority: number
          reason: string
          rule_code: string
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
        }
        Insert: {
          activity_id?: string | null
          attempt_id: string
          content_item_id?: string | null
          created_at?: string
          family_id: string
          id?: string
          member_id: string
          priority: number
          reason: string
          rule_code: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
        }
        Update: {
          activity_id?: string | null
          attempt_id?: string
          content_item_id?: string | null
          created_at?: string
          family_id?: string
          id?: string
          member_id?: string
          priority?: number
          reason?: string
          rule_code?: string
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_code: string
          role_code: string
        }
        Insert: {
          permission_code: string
          role_code: string
        }
        Update: {
          permission_code?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          description: string
          name: string
        }
        Insert: {
          code: string
          description: string
          name: string
        }
        Update: {
          code?: string
          description?: string
          name?: string
        }
        Relationships: []
      }
      saved_activities: {
        Row: {
          activity_id: string
          created_at: string
          family_id: string
          saved_by: string | null
        }
        Insert: {
          activity_id: string
          created_at?: string
          family_id: string
          saved_by?: string | null
        }
        Update: {
          activity_id?: string
          created_at?: string
          family_id?: string
          saved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_activities_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_activities_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_activities_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          citation: string
          confidence: string
          created_at: string
          doi: string | null
          id: string
          last_checked_at: string | null
          notes: string | null
          slug: string
          study_type: string
          updated_at: string
          url: string | null
          verification_status: string
          year: number | null
        }
        Insert: {
          citation: string
          confidence: string
          created_at?: string
          doi?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          slug: string
          study_type: string
          updated_at?: string
          url?: string | null
          verification_status?: string
          year?: number | null
        }
        Update: {
          citation?: string
          confidence?: string
          created_at?: string
          doi?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          slug?: string
          study_type?: string
          updated_at?: string
          url?: string | null
          verification_status?: string
          year?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role_code: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role_code: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_family_invitation: {
        Args: { p_relationship: string; p_token: string }
        Returns: string
      }
      add_family_member: {
        Args: {
          p_alias: string
          p_birth_month: string
          p_child_data_consent: boolean
          p_family_id: string
          p_interests: string[]
          p_policy_version: string
        }
        Returns: string
      }
      age_in_months: {
        Args: { p_birth_month: string; p_on: string }
        Returns: number
      }
      can_manage_attempt: { Args: { p_attempt_id: string }; Returns: boolean }
      create_family: {
        Args: { p_name: string; p_relationship: string }
        Returns: string
      }
      finalize_assessment: {
        Args: {
          p_attempt_id: string
          p_engine_version: string
          p_recommendations: Json
          p_scores: Json
          p_submitted_by: string
        }
        Returns: undefined
      }
      has_permission: { Args: { p_code: string }; Returns: boolean }
      is_family_adult: {
        Args: { p_family_id: string; p_roles?: string[] }
        Returns: boolean
      }
      log_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_family_id?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      questionnaire_definition: {
        Args: { p_version_id: string }
        Returns: Json
      }
      raise_domain_error: {
        Args: { p_code: string; p_detail?: string }
        Returns: undefined
      }
      save_answer: {
        Args: {
          p_attempt_id: string
          p_option_ids: string[]
          p_question_id: string
          p_value: number
        }
        Returns: undefined
      }
      shares_family_with: { Args: { p_user_id: string }; Returns: boolean }
      start_assessment: {
        Args: { p_member_id: string; p_version_id: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
