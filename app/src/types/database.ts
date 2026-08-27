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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          code: string
          created_at: string
          id: string
          name_ar: string | null
          name_en: string
          objective_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en: string
          objective_id: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en?: string
          objective_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objective"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_enrolment: {
        Row: {
          application_status: Database["public"]["Enums"]["record_status_t"]
          applied_on: string | null
          attended: boolean
          client_uuid: string | null
          created_at: string
          created_by: string | null
          decided_by: string | null
          decided_on: string | null
          deleted_at: string | null
          id: string
          met_criteria: boolean | null
          person_id: string
          registered_on: string
          session_id: string
          submitted_by_participant: boolean
          updated_at: string
        }
        Insert: {
          application_status?: Database["public"]["Enums"]["record_status_t"]
          applied_on?: string | null
          attended?: boolean
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          decided_by?: string | null
          decided_on?: string | null
          deleted_at?: string | null
          id?: string
          met_criteria?: boolean | null
          person_id: string
          registered_on?: string
          session_id: string
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Update: {
          application_status?: Database["public"]["Enums"]["record_status_t"]
          applied_on?: string | null
          attended?: boolean
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          decided_by?: string | null
          decided_on?: string | null
          deleted_at?: string | null
          id?: string
          met_criteria?: boolean | null
          person_id?: string
          registered_on?: string
          session_id?: string
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisory_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_enrolment_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisory_session"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_session: {
        Row: {
          adviser: string | null
          application_closes_on: string | null
          application_opens_on: string | null
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivered_by_partnership_id: string | null
          description: string | null
          duration_hours: number | null
          end_date: string
          focal_point: string | null
          id: string
          is_cancelled: boolean
          is_delivered: boolean
          is_published: boolean
          planned_seats: number | null
          start_date: string
          title: string
          topic_id: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          adviser?: string | null
          application_closes_on?: string | null
          application_opens_on?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by_partnership_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date: string
          focal_point?: string | null
          id?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_published?: boolean
          planned_seats?: number | null
          start_date: string
          title: string
          topic_id: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          adviser?: string | null
          application_closes_on?: string | null
          application_opens_on?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by_partnership_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string
          focal_point?: string | null
          id?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_published?: boolean
          planned_seats?: number | null
          start_date?: string
          title?: string
          topic_id?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisory_session_delivered_by_partnership_id_fkey"
            columns: ["delivered_by_partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_session_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "ref_training_topic"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role_t"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role_t"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role_t"]
          updated_at?: string
        }
        Relationships: []
      }
      applicant_lookup_secret: {
        Row: {
          created_at: string
          id: boolean
          salt: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          salt: string
        }
        Update: {
          created_at?: string
          id?: boolean
          salt?: string
        }
        Relationships: []
      }
      applicant_lookup_throttle: {
        Row: {
          attempts: number
          key_hash: string
          minute_bucket: string
          scope: string
        }
        Insert: {
          attempts?: number
          key_hash: string
          minute_bucket: string
          scope: string
        }
        Update: {
          attempts?: number
          key_hash?: string
          minute_bucket?: string
          scope?: string
        }
        Relationships: []
      }
      attachment: {
        Row: {
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          actor_role: Database["public"]["Enums"]["app_role_t"] | null
          changed_at: string
          changed_fields: string[] | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          table_name: string
          updated_at: string
        }
        Insert: {
          action: string
          actor?: string | null
          actor_role?: Database["public"]["Enums"]["app_role_t"] | null
          changed_at?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name: string
          updated_at?: string
        }
        Update: {
          action?: string
          actor?: string | null
          actor_role?: Database["public"]["Enums"]["app_role_t"] | null
          changed_at?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_study: {
        Row: {
          change_evidenced: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          documented_on: string
          id: string
          initiative_id: string | null
          person_id: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          change_evidenced: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          documented_on: string
          id?: string
          initiative_id?: string | null
          person_id?: string | null
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          change_evidenced?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          documented_on?: string
          id?: string
          initiative_id?: string | null
          person_id?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_study_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_study_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_study_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_study_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coordination_meeting: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          meeting_date: string
          minutes_ref: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          meeting_date: string
          minutes_ref?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          meeting_date?: string
          minutes_ref?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      coordination_meeting_partner: {
        Row: {
          created_at: string
          external_name: string | null
          id: string
          meeting_id: string
          partnership_id: string | null
          stakeholder_type_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_name?: string | null
          id?: string
          meeting_id: string
          partnership_id?: string | null
          stakeholder_type_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_name?: string | null
          id?: string
          meeting_id?: string
          partnership_id?: string | null
          stakeholder_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordination_meeting_partner_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "coordination_meeting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_stakeholder_type_id_fkey"
            columns: ["stakeholder_type_id"]
            isOneToOne: false
            referencedRelation: "ref_stakeholder_type"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibition: {
        Row: {
          application_closes_on: string | null
          application_opens_on: string | null
          booth_capacity: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string
          external_sponsor: string | null
          focal_point: string | null
          id: string
          is_cancelled: boolean
          is_published: boolean
          location: string
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          application_closes_on?: string | null
          application_opens_on?: string | null
          booth_capacity: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date: string
          external_sponsor?: string | null
          focal_point?: string | null
          id?: string
          is_cancelled?: boolean
          is_published?: boolean
          location: string
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          application_closes_on?: string | null
          application_opens_on?: string | null
          booth_capacity?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          external_sponsor?: string | null
          focal_point?: string | null
          id?: string
          is_cancelled?: boolean
          is_published?: boolean
          location?: string
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      exhibition_registration: {
        Row: {
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          exhibition_id: string
          id: string
          is_first_time: boolean
          person_id: string
          producer_type_id: string
          producer_type_other: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status_t"]
          submitted_by_participant: boolean
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exhibition_id: string
          id?: string
          is_first_time: boolean
          person_id: string
          producer_type_id: string
          producer_type_other?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status_t"]
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          exhibition_id?: string
          id?: string
          is_first_time?: boolean
          person_id?: string
          producer_type_id?: string
          producer_type_other?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status_t"]
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_registration_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "exhibition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_exhibitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_producer_type_id_fkey"
            columns: ["producer_type_id"]
            isOneToOne: false
            referencedRelation: "ref_producer_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_producer_type_id_fkey"
            columns: ["producer_type_id"]
            isOneToOne: false
            referencedRelation: "v_public_producer_type"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibition_registration_product: {
        Row: {
          created_at: string
          product_id: string
          registration_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          product_id: string
          registration_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          product_id?: string
          registration_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_registration_product_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ref_product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_public_product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "exhibition_registration"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_answer: {
        Row: {
          created_at: string
          question_code: string
          survey_id: string
          updated_at: string
          value_boolean: boolean | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          question_code: string
          survey_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          question_code?: string
          survey_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_answer_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_answer_option: {
        Row: {
          created_at: string
          option_id: string
          option_other: string | null
          question_code: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          option_id: string
          option_other?: string | null
          question_code: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_answer_option_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_buyer_connection: {
        Row: {
          arrangement: string
          buyer_name: string
          buyer_type_id: string
          created_at: string
          how_connected: string
          id: string
          seq: number
          still_active: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          arrangement: string
          buyer_name: string
          buyer_type_id: string
          created_at?: string
          how_connected: string
          id?: string
          seq: number
          still_active: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          arrangement?: string
          buyer_name?: string
          buyer_type_id?: string
          created_at?: string
          how_connected?: string
          id?: string
          seq?: number
          still_active?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_buyer_connection_buyer_type_id_fkey"
            columns: ["buyer_type_id"]
            isOneToOne: false
            referencedRelation: "ref_buyer_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_safety_item: {
        Row: {
          created_at: string
          item_id: string
          obstacle: string | null
          status: Database["public"]["Enums"]["tri_status_t"]
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          item_id: string
          obstacle?: string | null
          status: Database["public"]["Enums"]["tri_status_t"]
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          obstacle?: string | null
          status?: Database["public"]["Enums"]["tri_status_t"]
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_safety_item_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ref_safety_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_safety_item_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_survey: {
        Row: {
          client_uuid: string | null
          contact_date: string | null
          contact_mode: Database["public"]["Enums"]["contact_mode_t"] | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          enumerator_name: string | null
          id: string
          person_id: string
          q08_applied_knowledge: string | null
          q14_used_office: boolean | null
          q16_advice_useful: string | null
          q17_activity_status: string | null
          q18_started_after_support: boolean | null
          q22_volume_change: string | null
          q26_workers_total: number | null
          q26_workers_under30: number | null
          q26_workers_women: number | null
          q29_selling_change: string | null
          q30_events_attended: number | null
          q30_is_overridden: boolean
          q31_last_event_sales_band: string | null
          q34_connection_made: string | null
          q37_still_engaged: string | null
          q38_capacity: string | null
          q40_income_change: string | null
          q43_enumerator_notes: string | null
          respondent: Database["public"]["Enums"]["respondent_t"]
          round: Database["public"]["Enums"]["followup_round_t"]
          status: Database["public"]["Enums"]["record_status_t"]
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          contact_date?: string | null
          contact_mode?: Database["public"]["Enums"]["contact_mode_t"] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enumerator_name?: string | null
          id?: string
          person_id: string
          q08_applied_knowledge?: string | null
          q14_used_office?: boolean | null
          q16_advice_useful?: string | null
          q17_activity_status?: string | null
          q18_started_after_support?: boolean | null
          q22_volume_change?: string | null
          q26_workers_total?: number | null
          q26_workers_under30?: number | null
          q26_workers_women?: number | null
          q29_selling_change?: string | null
          q30_events_attended?: number | null
          q30_is_overridden?: boolean
          q31_last_event_sales_band?: string | null
          q34_connection_made?: string | null
          q37_still_engaged?: string | null
          q38_capacity?: string | null
          q40_income_change?: string | null
          q43_enumerator_notes?: string | null
          respondent: Database["public"]["Enums"]["respondent_t"]
          round: Database["public"]["Enums"]["followup_round_t"]
          status?: Database["public"]["Enums"]["record_status_t"]
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          contact_date?: string | null
          contact_mode?: Database["public"]["Enums"]["contact_mode_t"] | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enumerator_name?: string | null
          id?: string
          person_id?: string
          q08_applied_knowledge?: string | null
          q14_used_office?: boolean | null
          q16_advice_useful?: string | null
          q17_activity_status?: string | null
          q18_started_after_support?: boolean | null
          q22_volume_change?: string | null
          q26_workers_total?: number | null
          q26_workers_under30?: number | null
          q26_workers_women?: number | null
          q29_selling_change?: string | null
          q30_events_attended?: number | null
          q30_is_overridden?: boolean
          q31_last_event_sales_band?: string | null
          q34_connection_made?: string | null
          q37_still_engaged?: string | null
          q38_capacity?: string | null
          q40_income_change?: string | null
          q43_enumerator_notes?: string | null
          respondent?: Database["public"]["Enums"]["respondent_t"]
          round?: Database["public"]["Enums"]["followup_round_t"]
          status?: Database["public"]["Enums"]["record_status_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_survey_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_survey_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_survey_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guidance_record: {
        Row: {
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivered_by: string | null
          guidance_date: string
          guidance_type_id: string
          id: string
          person_id: string
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by?: string | null
          guidance_date: string
          guidance_type_id: string
          id?: string
          person_id: string
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by?: string | null
          guidance_date?: string
          guidance_type_id?: string
          id?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guidance_record_guidance_type_id_fkey"
            columns: ["guidance_type_id"]
            isOneToOne: false
            referencedRelation: "ref_guidance_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guidance_record_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guidance_record_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guidance_record_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator: {
        Row: {
          activity_id: string | null
          baseline: number | null
          code: string
          created_at: string
          data_source: string | null
          definition: string | null
          disaggregation: string[] | null
          final_target: number | null
          formula: string | null
          id: string
          indicator_type: string
          name_ar: string | null
          name_en: string
          objective_id: string
          sort_order: number
          unit: string
          updated_at: string
          view_name: string | null
        }
        Insert: {
          activity_id?: string | null
          baseline?: number | null
          code: string
          created_at?: string
          data_source?: string | null
          definition?: string | null
          disaggregation?: string[] | null
          final_target?: number | null
          formula?: string | null
          id?: string
          indicator_type: string
          name_ar?: string | null
          name_en: string
          objective_id: string
          sort_order: number
          unit: string
          updated_at?: string
          view_name?: string | null
        }
        Update: {
          activity_id?: string | null
          baseline?: number | null
          code?: string
          created_at?: string
          data_source?: string | null
          definition?: string | null
          disaggregation?: string[] | null
          final_target?: number | null
          formula?: string | null
          id?: string
          indicator_type?: string
          name_ar?: string | null
          name_en?: string
          objective_id?: string
          sort_order?: number
          unit?: string
          updated_at?: string
          view_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objective"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_snapshot: {
        Row: {
          actual_value: number | null
          computed_at: string
          computed_by: string | null
          created_at: string
          indicator_id: string
          is_final: boolean
          note: string | null
          period_id: string
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          computed_at?: string
          computed_by?: string | null
          created_at?: string
          indicator_id: string
          is_final?: boolean
          note?: string | null
          period_id: string
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          computed_at?: string
          computed_by?: string | null
          created_at?: string
          indicator_id?: string
          is_final?: boolean
          note?: string | null
          period_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_snapshot_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_snapshot_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "reporting_period"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_target: {
        Row: {
          created_at: string
          indicator_id: string
          period_id: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          indicator_id: string
          period_id: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          indicator_id?: string
          period_id?: string
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_target_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_target_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "reporting_period"
            referencedColumns: ["id"]
          },
        ]
      }
      linkage_request: {
        Row: {
          activity_type_id: string
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          initiative_title: string
          main_product: string | null
          matched_initiative_id: string | null
          matched_linkage_id: string | null
          person_id: string
          request: string
          requested_on: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["record_status_t"]
          updated_at: string
        }
        Insert: {
          activity_type_id: string
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_title: string
          main_product?: string | null
          matched_initiative_id?: string | null
          matched_linkage_id?: string | null
          person_id: string
          request: string
          requested_on?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status_t"]
          updated_at?: string
        }
        Update: {
          activity_type_id?: string
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_title?: string
          main_product?: string | null
          matched_initiative_id?: string | null
          matched_linkage_id?: string | null
          person_id?: string
          request?: string
          requested_on?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["record_status_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkage_request_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "ref_activity_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkage_request_matched_initiative_id_fkey"
            columns: ["matched_initiative_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkage_request_matched_linkage_id_fkey"
            columns: ["matched_linkage_id"]
            isOneToOne: false
            referencedRelation: "market_linkage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkage_request_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkage_request_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkage_request_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
        ]
      }
      market_linkage: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          initiative_id: string
          linked_on: string
          outcome: string | null
          partnership_id: string
          request: string | null
          scope: string
          status: Database["public"]["Enums"]["link_status_t"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_id: string
          linked_on?: string
          outcome?: string | null
          partnership_id: string
          request?: string | null
          scope: string
          status?: Database["public"]["Enums"]["link_status_t"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_id?: string
          linked_on?: string
          outcome?: string | null
          partnership_id?: string
          request?: string | null
          scope?: string
          status?: Database["public"]["Enums"]["link_status_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_linkage_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_linkage_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_session: {
        Row: {
          adviser: string | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          initiative_id: string
          session_date: string
          topic: string
          updated_at: string
        }
        Insert: {
          adviser?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_id: string
          session_date: string
          topic: string
          updated_at?: string
        }
        Update: {
          adviser?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_id?: string
          session_date?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_session_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone: {
        Row: {
          achieved_on: string | null
          code: string
          created_at: string
          created_by: string | null
          decision_ref: string | null
          deleted_at: string | null
          id: string
          is_achieved: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          achieved_on?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          decision_ref?: string | null
          deleted_at?: string | null
          id?: string
          is_achieved?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          achieved_on?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          decision_ref?: string | null
          deleted_at?: string | null
          id?: string
          is_achieved?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      objective: {
        Row: {
          code: string
          created_at: string
          id: string
          name_ar: string | null
          name_en: string
          result_statement_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en: string
          result_statement_en?: string | null
          sort_order: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name_ar?: string | null
          name_en?: string
          result_statement_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      office_service: {
        Row: {
          adviser: string | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          person_id: string
          service_date: string
          service_type_id: string
          updated_at: string
        }
        Insert: {
          adviser?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          person_id: string
          service_date: string
          service_type_id: string
          updated_at?: string
        }
        Update: {
          adviser?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          service_date?: string
          service_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_service_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_service_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_service_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_service_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "ref_office_service_type"
            referencedColumns: ["id"]
          },
        ]
      }
      partner: {
        Row: {
          contact_person: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      partner_contribution: {
        Row: {
          contributed_on: string
          contribution_type: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          partnership_id: string
          updated_at: string
        }
        Insert: {
          contributed_on: string
          contribution_type: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          partnership_id: string
          updated_at?: string
        }
        Update: {
          contributed_on?: string
          contribution_type?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          partnership_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_contribution_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership: {
        Row: {
          agreement_ref: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ended_on: string | null
          established_on: string
          id: string
          is_active: boolean
          partner_id: string
          partner_type_id: string
          partner_type_other: string | null
          partnership_type: Database["public"]["Enums"]["partnership_type_t"]
          updated_at: string
        }
        Insert: {
          agreement_ref?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ended_on?: string | null
          established_on: string
          id?: string
          is_active?: boolean
          partner_id: string
          partner_type_id: string
          partner_type_other?: string | null
          partnership_type: Database["public"]["Enums"]["partnership_type_t"]
          updated_at?: string
        }
        Update: {
          agreement_ref?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ended_on?: string | null
          established_on?: string
          id?: string
          is_active?: boolean
          partner_id?: string
          partner_type_id?: string
          partner_type_other?: string | null
          partnership_type?: Database["public"]["Enums"]["partnership_type_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_role: {
        Row: {
          created_at: string
          partnership_id: string
          role_id: string
          role_other: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          partnership_id: string
          role_id: string
          role_other?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          partnership_id?: string
          role_id?: string
          role_other?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_role_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
        ]
      }
      person: {
        Row: {
          age_recorded: number | null
          agri_involvement_id: string | null
          auth_user_id: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          deleted_at: string | null
          disability_type_id: string | null
          full_name: string
          has_disability: boolean | null
          id: string
          is_refugee: boolean | null
          national_id: string
          nationality_id: string | null
          notes: string | null
          phone: string | null
          sex: Database["public"]["Enums"]["sex_t"] | null
          updated_at: string
          village: string | null
        }
        Insert: {
          age_recorded?: number | null
          agri_involvement_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          disability_type_id?: string | null
          full_name: string
          has_disability?: boolean | null
          id?: string
          is_refugee?: boolean | null
          national_id: string
          nationality_id?: string | null
          notes?: string | null
          phone?: string | null
          sex?: Database["public"]["Enums"]["sex_t"] | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          age_recorded?: number | null
          agri_involvement_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          disability_type_id?: string | null
          full_name?: string
          has_disability?: boolean | null
          id?: string
          is_refugee?: boolean | null
          national_id?: string
          nationality_id?: string | null
          notes?: string | null
          phone?: string | null
          sex?: Database["public"]["Enums"]["sex_t"] | null
          updated_at?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_agri_involvement_id_fkey"
            columns: ["agri_involvement_id"]
            isOneToOne: false
            referencedRelation: "ref_agri_involvement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_disability_type_id_fkey"
            columns: ["disability_type_id"]
            isOneToOne: false
            referencedRelation: "ref_disability_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_nationality"
            referencedColumns: ["id"]
          },
        ]
      }
      person_activity_type: {
        Row: {
          activity_type_id: string
          created_at: string
          person_id: string
          updated_at: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          person_id: string
          updated_at?: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          person_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_activity_type_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "ref_activity_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_activity_type_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_activity_type_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_activity_type_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
        ]
      }
      production_initiative: {
        Row: {
          activity_type_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_women_led: boolean | null
          is_youth_led: boolean | null
          main_product: string | null
          person_id: string
          started_on: string | null
          status: Database["public"]["Enums"]["initiative_status_t"]
          support_value_jod: number | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_type_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_women_led?: boolean | null
          is_youth_led?: boolean | null
          main_product?: string | null
          person_id: string
          started_on?: string | null
          status?: Database["public"]["Enums"]["initiative_status_t"]
          support_value_jod?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_type_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_women_led?: boolean | null
          is_youth_led?: boolean | null
          main_product?: string | null
          person_id?: string
          started_on?: string | null
          status?: Database["public"]["Enums"]["initiative_status_t"]
          support_value_jod?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_initiative_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "ref_activity_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_initiative_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_initiative_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_initiative_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_action: {
        Row: {
          action_date: string
          channel_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          reach_estimate: number | null
          title: string
          updated_at: string
        }
        Insert: {
          action_date: string
          channel_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          reach_estimate?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          action_date?: string
          channel_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          reach_estimate?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotional_action_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "ref_promotional_channel"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_activity_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_agri_involvement: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_buyer_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_disability_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_guidance_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_nationality: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_office_service_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_partner_role_production: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_partner_role_training: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_partner_type_production: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_partner_type_training: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_producer_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_product: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_promotional_channel: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_safety_item: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_sales_channel: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_stakeholder_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_training_topic: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          is_food_processing: boolean
          label_ar: string | null
          label_en: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          allows_free_text?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_food_processing?: boolean
          label_ar?: string | null
          label_en: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allows_free_text?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_food_processing?: boolean
          label_ar?: string | null
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      reporting_period: {
        Row: {
          code: string
          created_at: string
          end_date: string
          id: string
          is_locked: boolean
          start_date: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          end_date: string
          id?: string
          is_locked?: boolean
          start_date: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          end_date?: string
          id?: string
          is_locked?: boolean
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_enrolment: {
        Row: {
          application_status: Database["public"]["Enums"]["record_status_t"]
          applied_on: string | null
          attended: boolean
          client_uuid: string | null
          created_at: string
          created_by: string | null
          decided_by: string | null
          decided_on: string | null
          deleted_at: string | null
          id: string
          met_criteria: boolean | null
          person_id: string
          registered_on: string
          session_id: string
          submitted_by_participant: boolean
          updated_at: string
        }
        Insert: {
          application_status?: Database["public"]["Enums"]["record_status_t"]
          applied_on?: string | null
          attended?: boolean
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          decided_by?: string | null
          decided_on?: string | null
          deleted_at?: string | null
          id?: string
          met_criteria?: boolean | null
          person_id: string
          registered_on?: string
          session_id: string
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Update: {
          application_status?: Database["public"]["Enums"]["record_status_t"]
          applied_on?: string | null
          attended?: boolean
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          decided_by?: string | null
          decided_on?: string | null
          deleted_at?: string | null
          id?: string
          met_criteria?: boolean | null
          person_id?: string
          registered_on?: string
          session_id?: string
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolment_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_session"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session: {
        Row: {
          application_closes_on: string | null
          application_opens_on: string | null
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivered_by_partnership_id: string | null
          description: string | null
          duration_hours: number | null
          end_date: string
          focal_point: string | null
          id: string
          is_cancelled: boolean
          is_delivered: boolean
          is_published: boolean
          planned_seats: number | null
          start_date: string
          title: string
          topic_id: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          application_closes_on?: string | null
          application_opens_on?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by_partnership_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date: string
          focal_point?: string | null
          id?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_published?: boolean
          planned_seats?: number | null
          start_date: string
          title: string
          topic_id: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          application_closes_on?: string | null
          application_opens_on?: string | null
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by_partnership_id?: string | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string
          focal_point?: string | null
          id?: string
          is_cancelled?: boolean
          is_delivered?: boolean
          is_published?: boolean
          planned_seats?: number | null
          start_date?: string
          title?: string
          topic_id?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_session_delivered_by_partnership_id_fkey"
            columns: ["delivered_by_partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "ref_training_topic"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ind_a1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_a1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_a1_3: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_b1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_b1_1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_b1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1_1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1_3: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_d0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_d0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_e0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_e0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_f0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_3: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_4: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_imp_0: {
        Row: {
          actual: number | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_indicator_actual: {
        Row: {
          actual: number | null
          code: string | null
          denominator: number | null
          period_code: string | null
        }
        Relationships: []
      }
      v_indicator_disaggregated: {
        Row: {
          age_band: string | null
          code: string | null
          disability_status: string | null
          period_code: string | null
          refugee_status: string | null
          sex: string | null
          value: number | null
          village: string | null
        }
        Relationships: []
      }
      v_indicator_progress: {
        Row: {
          actual: number | null
          code: string | null
          definition: string | null
          denominator: number | null
          end_date: string | null
          indicator_type: string | null
          is_disaggregable: boolean | null
          is_manual: boolean | null
          name_ar: string | null
          name_en: string | null
          objective_code: string | null
          objective_name_ar: string | null
          objective_name_en: string | null
          objective_sort: number | null
          period_code: string | null
          progress_pct: number | null
          sort_order: number | null
          start_date: string | null
          status: string | null
          target: number | null
          unit: string | null
        }
        Relationships: []
      }
      v_opportunity: {
        Row: {
          application_closes_on: string | null
          application_opens_on: string | null
          applications_open: boolean | null
          capacity: number | null
          created_at: string | null
          delivered_by_partnership_id: string | null
          description: string | null
          duration_hours: number | null
          end_date: string | null
          focal_point: string | null
          id: string | null
          is_cancelled: boolean | null
          is_published: boolean | null
          location: string | null
          opportunity_type: string | null
          seats_taken: number | null
          start_date: string | null
          title: string | null
          topic_id: string | null
        }
        Relationships: []
      }
      v_person_missing_verification: {
        Row: {
          date_of_birth: string | null
          full_name: string | null
          id: string | null
          national_id: string | null
          phone: string | null
          verification_state: string | null
          village: string | null
        }
        Insert: {
          date_of_birth?: string | null
          full_name?: string | null
          id?: string | null
          national_id?: string | null
          phone?: string | null
          verification_state?: never
          village?: string | null
        }
        Update: {
          date_of_birth?: string | null
          full_name?: string | null
          id?: string | null
          national_id?: string | null
          phone?: string | null
          verification_state?: never
          village?: string | null
        }
        Relationships: []
      }
      v_person_public: {
        Row: {
          age_band: string | null
          full_name: string | null
          has_disability: boolean | null
          id: string | null
          is_refugee: boolean | null
          national_id_masked: string | null
          sex: Database["public"]["Enums"]["sex_t"] | null
          village: string | null
        }
        Insert: {
          age_band?: never
          full_name?: string | null
          has_disability?: boolean | null
          id?: string | null
          is_refugee?: boolean | null
          national_id_masked?: never
          sex?: Database["public"]["Enums"]["sex_t"] | null
          village?: string | null
        }
        Update: {
          age_band?: never
          full_name?: string | null
          has_disability?: boolean | null
          id?: string | null
          is_refugee?: boolean | null
          national_id_masked?: never
          sex?: Database["public"]["Enums"]["sex_t"] | null
          village?: string | null
        }
        Relationships: []
      }
      v_public_opportunity: {
        Row: {
          application_closes_on: string | null
          application_opens_on: string | null
          applications_open: boolean | null
          capacity: number | null
          description: string | null
          duration_hours: number | null
          end_date: string | null
          focal_point: string | null
          id: string | null
          is_full: boolean | null
          location: string | null
          opportunity_type: string | null
          places_remaining: number | null
          start_date: string | null
          title: string | null
          topic_ar: string | null
          topic_en: string | null
        }
        Relationships: []
      }
      v_public_producer_type: {
        Row: {
          id: string | null
          label_ar: string | null
          label_en: string | null
        }
        Insert: {
          id?: string | null
          label_ar?: string | null
          label_en?: string | null
        }
        Update: {
          id?: string | null
          label_ar?: string | null
          label_en?: string | null
        }
        Relationships: []
      }
      v_public_product: {
        Row: {
          id: string | null
          label_ar: string | null
          label_en: string | null
        }
        Insert: {
          id?: string | null
          label_ar?: string | null
          label_en?: string | null
        }
        Update: {
          id?: string | null
          label_ar?: string | null
          label_en?: string | null
        }
        Relationships: []
      }
      v_recent_activity: {
        Row: {
          detail: string | null
          happened_on: string | null
          id: string | null
          kind: string | null
          module: string | null
          person_id: string | null
          subject: string | null
          village: string | null
        }
        Relationships: []
      }
      v_upcoming_exhibitions: {
        Row: {
          booth_capacity: number | null
          booths_pending: number | null
          booths_taken: number | null
          end_date: string | null
          has_ended: boolean | null
          id: string | null
          location: string | null
          name: string | null
          start_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      age_band: {
        Args: { p: Database["public"]["Tables"]["person"]["Row"] }
        Returns: string
      }
      applicant_prefill: {
        Args: {
          p_date_of_birth?: string
          p_national_id: string
          p_phone?: string
        }
        Returns: Json
      }
      apply_for_opportunity: {
        Args: {
          p_client_uuid?: string
          p_date_of_birth?: string
          p_full_name?: string
          p_national_id: string
          p_opportunity_id: string
          p_opportunity_type: string
          p_phone?: string
          p_producer_type_id?: string
          p_product_ids?: string[]
          p_sex?: string
          p_village?: string
        }
        Returns: Json
      }
      attach_updated_at: { Args: { p_table: string }; Returns: undefined }
      bump_lookup_throttle: {
        Args: {
          p_limit: number
          p_scope: string
          p_value: string
          p_window: string
        }
        Returns: boolean
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role_t"]
      }
      followup_prefill: { Args: { p_national_id: string }; Returns: Json }
      indicator_figures: {
        Args: {
          p_age_bands?: string[]
          p_disability?: string[]
          p_objectives?: string[]
          p_period_from?: string
          p_period_to?: string
          p_refugee?: string[]
          p_sex?: string[]
          p_statuses?: string[]
          p_villages?: string[]
        }
        Returns: {
          actual: number
          aggregation: string
          code: string
          filter_ignored: boolean
          is_disaggregable: boolean
          is_manual: boolean
          name_ar: string
          name_en: string
          objective_code: string
          objective_name_ar: string
          objective_name_en: string
          objective_sort: number
          period_from: string
          period_to: string
          progress_pct: number
          sort_order: number
          status: string
          target: number
          unit: string
        }[]
      }
      is_coordinator: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      my_person_id: { Args: never; Returns: string }
      overview_counts: {
        Args: {
          p_age_bands?: string[]
          p_disability?: string[]
          p_period_from?: string
          p_period_to?: string
          p_refugee?: string[]
          p_sex?: string[]
          p_villages?: string[]
        }
        Returns: {
          followups_done: number
          markets_held: number
          markets_upcoming: number
          partners_active: number
          people_in_period: number
          people_total: number
          registrations_pending: number
          trainings_completed: number
          villages_reached: number
        }[]
      }
      snapshot_period: { Args: { p_period_code: string }; Returns: number }
    }
    Enums: {
      app_role_t:
        | "coordinator"
        | "data_entry"
        | "enumerator"
        | "partner_viewer"
        | "participant"
      contact_mode_t: "telephone" | "site_visit" | "municipal_office"
      followup_round_t: "six_month" | "twelve_month" | "annual"
      initiative_status_t: "planned" | "operating" | "paused" | "stopped"
      link_status_t: "proposed" | "under_review" | "active" | "ended"
      partnership_type_t: "training" | "production_support"
      record_status_t: "draft" | "submitted" | "approved" | "rejected"
      respondent_t: "participant" | "household_member" | "not_reached"
      sex_t: "female" | "male"
      tri_status_t: "done" | "in_progress" | "not_started"
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
    Enums: {
      app_role_t: [
        "coordinator",
        "data_entry",
        "enumerator",
        "partner_viewer",
        "participant",
      ],
      contact_mode_t: ["telephone", "site_visit", "municipal_office"],
      followup_round_t: ["six_month", "twelve_month", "annual"],
      initiative_status_t: ["planned", "operating", "paused", "stopped"],
      link_status_t: ["proposed", "under_review", "active", "ended"],
      partnership_type_t: ["training", "production_support"],
      record_status_t: ["draft", "submitted", "approved", "rejected"],
      respondent_t: ["participant", "household_member", "not_reached"],
      sex_t: ["female", "male"],
      tri_status_t: ["done", "in_progress", "not_started"],
    },
  },
} as const
