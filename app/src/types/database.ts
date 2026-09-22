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
      activity: {
        Row: {
          code: string
          created_at: string
          id: string
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          name_ar?: string | null
          name_en?: string
          objective_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objective"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_objective_municipality_fkey"
            columns: ["objective_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "objective"
            referencedColumns: ["id", "municipality_id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          person_id?: string
          registered_on?: string
          session_id?: string
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_enrolment_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "advisory_session"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_enrolment_session_municipality_fkey"
            columns: ["session_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "advisory_session"
            referencedColumns: ["id", "municipality_id"]
          }
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
          municipality_id: string
          planned_seats: number | null
          start_date: string
          title: string
          topic_id: string
          track: Database["public"]["Enums"]["advisory_track_t"]
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
          municipality_id?: string
          planned_seats?: number | null
          start_date: string
          title: string
          topic_id: string
          track: Database["public"]["Enums"]["advisory_track_t"]
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
          municipality_id?: string
          planned_seats?: number | null
          start_date?: string
          title?: string
          topic_id?: string
          track?: Database["public"]["Enums"]["advisory_track_t"]
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
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_session_partnership_municipality_fkey"
            columns: ["delivered_by_partnership_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "ref_training_topic"
            referencedColumns: ["id"]
          }
        ]
      }
      app_user: {
        Row: {
          acting_municipality_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          municipality_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role_t"]
          updated_at: string
        }
        Insert: {
          acting_municipality_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean
          municipality_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role_t"]
          updated_at?: string
        }
        Update: {
          acting_municipality_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          municipality_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
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
          bucket: string
          content_kind: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          mime_type: string | null
          municipality_id: string
          object_key: string
          original_size_bytes: number
          size_bytes: number
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          content_kind: string
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          municipality_id?: string
          object_key: string
          original_size_bytes: number
          size_bytes: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          content_kind?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          municipality_id?: string
          object_key?: string
          original_size_bytes?: number
          size_bytes?: number
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
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
          municipality_id: string | null
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
          municipality_id?: string | null
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
          municipality_id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          table_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
            foreignKeyName: "case_study_initiative_municipality_fkey"
            columns: ["initiative_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_study_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      coordination_meeting_partner: {
        Row: {
          created_at: string
          external_name: string | null
          id: string
          meeting_id: string
          municipality_id: string
          partnership_id: string | null
          stakeholder_type_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_name?: string | null
          id?: string
          meeting_id: string
          municipality_id?: string
          partnership_id?: string | null
          stakeholder_type_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_name?: string | null
          id?: string
          meeting_id?: string
          municipality_id?: string
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
            foreignKeyName: "coordination_meeting_partner_meeting_municipality_fkey"
            columns: ["meeting_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "coordination_meeting"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
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
            foreignKeyName: "coordination_meeting_partner_partnership_municipality_fkey"
            columns: ["partnership_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_stakeholder_type_id_fkey"
            columns: ["stakeholder_type_id"]
            isOneToOne: false
            referencedRelation: "ref_stakeholder_type"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
            foreignKeyName: "exhibition_registration_exhibition_municipality_fkey"
            columns: ["exhibition_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "exhibition"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
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
            foreignKeyName: "exhibition_registration_producer_type_id_fkey"
            columns: ["producer_type_id"]
            isOneToOne: false
            referencedRelation: "ref_producer_type"
            referencedColumns: ["id"]
          }
        ]
      }
      exhibition_registration_product: {
        Row: {
          created_at: string
          municipality_id: string
          product_id: string
          registration_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          product_id: string
          registration_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          product_id?: string
          registration_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ref_product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "exhibition_registration"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_registration_municipality_fkey"
            columns: ["registration_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "exhibition_registration"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      followup_answer: {
        Row: {
          created_at: string
          municipality_id: string
          question_code: string
          survey_id: string
          updated_at: string
          value_boolean: boolean | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          question_code: string
          survey_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          municipality_id?: string
          question_code?: string
          survey_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_answer_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_answer_survey_municipality_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      followup_answer_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_answer_option_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_answer_option_survey_municipality_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      followup_buyer_connection: {
        Row: {
          arrangement: string
          buyer_name: string
          buyer_type_id: string
          buyer_type_other: string | null
          created_at: string
          how_connected: string
          how_connected_other: string | null
          id: string
          municipality_id: string
          seq: number
          still_active: string
          survey_id: string
          updated_at: string
        }
        Insert: {
          arrangement: string
          buyer_name: string
          buyer_type_id: string
          buyer_type_other?: string | null
          created_at?: string
          how_connected: string
          how_connected_other?: string | null
          id?: string
          municipality_id?: string
          seq: number
          still_active: string
          survey_id: string
          updated_at?: string
        }
        Update: {
          arrangement?: string
          buyer_name?: string
          buyer_type_id?: string
          buyer_type_other?: string | null
          created_at?: string
          how_connected?: string
          how_connected_other?: string | null
          id?: string
          municipality_id?: string
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
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_survey_municipality_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      followup_safety_item: {
        Row: {
          created_at: string
          item_id: string
          municipality_id: string
          obstacle: string | null
          status: Database["public"]["Enums"]["tri_status_t"]
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          item_id: string
          municipality_id?: string
          obstacle?: string | null
          status: Database["public"]["Enums"]["tri_status_t"]
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          municipality_id?: string
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
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_safety_item_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_safety_item_survey_municipality_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "followup_survey"
            referencedColumns: ["id", "municipality_id"]
          }
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
          municipality_id: string
          person_id: string
          q08_applied_knowledge: string | null
          q14_used_office: string | null
          q16_advice_useful: string | null
          q17_activity_status: string | null
          q18_started_after_support: string | null
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
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
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
          municipality_id?: string
          person_id: string
          q08_applied_knowledge?: string | null
          q14_used_office?: string | null
          q16_advice_useful?: string | null
          q17_activity_status?: string | null
          q18_started_after_support?: string | null
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
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          municipality_id?: string
          person_id?: string
          q08_applied_knowledge?: string | null
          q14_used_office?: string | null
          q16_advice_useful?: string | null
          q17_activity_status?: string | null
          q18_started_after_support?: string | null
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
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          round?: Database["public"]["Enums"]["followup_round_t"]
          status?: Database["public"]["Enums"]["record_status_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_survey_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guidance_record_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
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
          full_code: string
          id: string
          indicator_type: string
          municipality_id: string
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
          full_code: string
          id?: string
          indicator_type: string
          municipality_id?: string
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
          full_code?: string
          id?: string
          indicator_type?: string
          municipality_id?: string
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
            foreignKeyName: "indicator_activity_municipality_fkey"
            columns: ["activity_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "activity"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objective"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_objective_municipality_fkey"
            columns: ["objective_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "objective"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      indicator_plan_target: {
        Row: {
          basis: string
          by_date: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          from_date: string | null
          id: string
          indicator_id: string
          maximum: number | null
          minimum: number | null
          municipality_id: string
          note_en: string | null
          parent_id: string | null
          sort_order: number
          source_ar: string | null
          source_en: string
          subgroup: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          basis: string
          by_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          from_date?: string | null
          id?: string
          indicator_id: string
          maximum?: number | null
          minimum?: number | null
          municipality_id?: string
          note_en?: string | null
          parent_id?: string | null
          sort_order?: number
          source_ar?: string | null
          source_en: string
          subgroup?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          basis?: string
          by_date?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          from_date?: string | null
          id?: string
          indicator_id?: string
          maximum?: number | null
          minimum?: number | null
          municipality_id?: string
          note_en?: string | null
          parent_id?: string | null
          sort_order?: number
          source_ar?: string | null
          source_en?: string
          subgroup?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_plan_target_indicator_id_fkey"
            columns: ["indicator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "indicator"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "indicator_plan_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_plan_target_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "indicator_plan_target"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
            foreignKeyName: "indicator_snapshot_indicator_municipality_fkey"
            columns: ["indicator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "indicator"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_snapshot_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "reporting_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_snapshot_period_municipality_fkey"
            columns: ["period_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "reporting_period"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      indicator_target: {
        Row: {
          created_at: string
          indicator_id: string
          municipality_id: string
          period_id: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          indicator_id: string
          municipality_id?: string
          period_id: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          indicator_id?: string
          municipality_id?: string
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
            foreignKeyName: "indicator_target_indicator_municipality_fkey"
            columns: ["indicator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "indicator"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_target_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "reporting_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_target_period_municipality_fkey"
            columns: ["period_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "reporting_period"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_action_day: {
        Row: {
          activity_id: string | null
          called_by_id: string
          campaign_id: string | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          date: string
          deleted_at: string | null
          id: string
          incident_id: string
          incident_other: string | null
          linked_kind_id: string
          location_id: string
          location_other: string | null
          market_id: string | null
          materials: string
          municipality_id: string
          new_registrations: number
          notice_days: number | null
          person_hours: number
          recorded_by_name: string | null
          recorded_by_position: string | null
          recorded_on: string | null
          reference: string | null
          refreshments_id: string | null
          refreshments_other: string | null
          remaining_tasks: string
          roles_assigned: boolean
          supervisor: string
          tasks_completed: string
          team_leaders: string | null
          times_from: string | null
          times_to: string | null
          updated_at: string
          volunteer_feedback_id: string | null
          volunteer_feedback_other: string | null
          volunteers_total: number
        }
        Insert: {
          activity_id?: string | null
          called_by_id: string
          campaign_id?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          deleted_at?: string | null
          id?: string
          incident_id: string
          incident_other?: string | null
          linked_kind_id: string
          location_id: string
          location_other?: string | null
          market_id?: string | null
          materials: string
          municipality_id?: string
          new_registrations: number
          notice_days?: number | null
          person_hours: number
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          refreshments_id?: string | null
          refreshments_other?: string | null
          remaining_tasks: string
          roles_assigned: boolean
          supervisor: string
          tasks_completed: string
          team_leaders?: string | null
          times_from?: string | null
          times_to?: string | null
          updated_at?: string
          volunteer_feedback_id?: string | null
          volunteer_feedback_other?: string | null
          volunteers_total: number
        }
        Update: {
          activity_id?: string | null
          called_by_id?: string
          campaign_id?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          id?: string
          incident_id?: string
          incident_other?: string | null
          linked_kind_id?: string
          location_id?: string
          location_other?: string | null
          market_id?: string | null
          materials?: string
          municipality_id?: string
          new_registrations?: number
          notice_days?: number | null
          person_hours?: number
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          refreshments_id?: string | null
          refreshments_other?: string | null
          remaining_tasks?: string
          roles_assigned?: boolean
          supervisor?: string
          tasks_completed?: string
          team_leaders?: string | null
          times_from?: string | null
          times_to?: string | null
          updated_at?: string
          volunteer_feedback_id?: string | null
          volunteer_feedback_other?: string | null
          volunteers_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "khld_action_day_activity_id_fkey"
            columns: ["activity_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_activity"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_action_day_called_by_id_fkey"
            columns: ["called_by_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f3_called_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_action_day_campaign_id_fkey"
            columns: ["campaign_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_campaign"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_action_day_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_action_day_linked_kind_id_fkey"
            columns: ["linked_kind_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f3_linked_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_action_day_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f3_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_action_day_market_id_fkey"
            columns: ["market_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_market"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_action_day_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_action_day_refreshments_id_fkey"
            columns: ["refreshments_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f3_refreshments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_action_day_volunteer_feedback_id_fkey"
            columns: ["volunteer_feedback_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f3_volunteer_feedback"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_action_day_count: {
        Row: {
          action_day_id: string
          cell_id: string
          count: number
          created_at: string
          field_code: string
          municipality_id: string
        }
        Insert: {
          action_day_id: string
          cell_id: string
          count: number
          created_at?: string
          field_code: string
          municipality_id?: string
        }
        Update: {
          action_day_id?: string
          cell_id?: string
          count?: number
          created_at?: string
          field_code?: string
          municipality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_action_day_count_action_day_id_fkey"
            columns: ["action_day_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_action_day"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_action_day_option: {
        Row: {
          action_day_id: string
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          action_day_id: string
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          action_day_id?: string
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_action_day_option_action_day_id_fkey"
            columns: ["action_day_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_action_day"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_activity: {
        Row: {
          activity_type_id: string
          announcement_days_advance: number | null
          calendar_status_id: string
          cash_cost_jod: number
          client_uuid: string | null
          content_summary: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_date: string
          event_time_from: string | null
          event_time_to: string | null
          event_title: string
          feedback_collected_id: string
          feedback_collected_other: string | null
          frequency_type_id: string
          id: string
          inkind_source: string | null
          inkind_value_jod: number | null
          is_published: boolean
          lessons: string
          location_id: string
          municipality_id: string
          organiser_id: string
          organiser_other: string | null
          participants_actual: number
          participants_planned: number
          partner_count: number
          recorded_by_name: string | null
          recorded_on: string | null
          reference: string | null
          updated_at: string
          verified_by_name: string | null
          verified_on: string | null
          volunteers_supporting: number | null
        }
        Insert: {
          activity_type_id: string
          announcement_days_advance?: number | null
          calendar_status_id: string
          cash_cost_jod: number
          client_uuid?: string | null
          content_summary: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_date: string
          event_time_from?: string | null
          event_time_to?: string | null
          event_title: string
          feedback_collected_id: string
          feedback_collected_other?: string | null
          frequency_type_id: string
          id?: string
          inkind_source?: string | null
          inkind_value_jod?: number | null
          is_published?: boolean
          lessons: string
          location_id: string
          municipality_id?: string
          organiser_id: string
          organiser_other?: string | null
          participants_actual: number
          participants_planned: number
          partner_count: number
          recorded_by_name?: string | null
          recorded_on?: string | null
          reference?: string | null
          updated_at?: string
          verified_by_name?: string | null
          verified_on?: string | null
          volunteers_supporting?: number | null
        }
        Update: {
          activity_type_id?: string
          announcement_days_advance?: number | null
          calendar_status_id?: string
          cash_cost_jod?: number
          client_uuid?: string | null
          content_summary?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_date?: string
          event_time_from?: string | null
          event_time_to?: string | null
          event_title?: string
          feedback_collected_id?: string
          feedback_collected_other?: string | null
          frequency_type_id?: string
          id?: string
          inkind_source?: string | null
          inkind_value_jod?: number | null
          is_published?: boolean
          lessons?: string
          location_id?: string
          municipality_id?: string
          organiser_id?: string
          organiser_other?: string | null
          participants_actual?: number
          participants_planned?: number
          partner_count?: number
          recorded_by_name?: string | null
          recorded_on?: string | null
          reference?: string | null
          updated_at?: string
          verified_by_name?: string | null
          verified_on?: string | null
          volunteers_supporting?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_activity_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d1_activity_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_activity_calendar_status_id_fkey"
            columns: ["calendar_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d1_calendar_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_activity_feedback_collected_id_fkey"
            columns: ["feedback_collected_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d1_feedback_collected"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_activity_frequency_type_id_fkey"
            columns: ["frequency_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d1_frequency_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_activity_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d1_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_activity_organiser_id_fkey"
            columns: ["organiser_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d1_organiser"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_activity_option: {
        Row: {
          activity_id: string
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_activity_option_activity_id_fkey"
            columns: ["activity_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_activity"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_attendance: {
        Row: {
          activity_id: string
          client_uuid: string | null
          consent_informed_id: string
          consent_informed_recorded_by: string | null
          consent_informed_recorded_on: string | null
          count_method_id: string
          counters: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          duplicate_check_id: string
          entered_by_name: string | null
          entered_on: string | null
          estimate_basis: string | null
          estimate_by: string | null
          first_time: number | null
          id: string
          mothers_children: number | null
          municipality_id: string
          notes: string | null
          photo_consent_id: string
          photo_consent_recorded_by: string | null
          photo_consent_recorded_on: string | null
          pwd_count: number | null
          register_attached_id: string
          register_attached_other: string | null
          repeat_participants: number | null
          staff_municipal: number | null
          staff_partner: number | null
          staff_volunteers: number
          total_participants: number
          updated_at: string
        }
        Insert: {
          activity_id: string
          client_uuid?: string | null
          consent_informed_id: string
          consent_informed_recorded_by?: string | null
          consent_informed_recorded_on?: string | null
          count_method_id: string
          counters: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duplicate_check_id: string
          entered_by_name?: string | null
          entered_on?: string | null
          estimate_basis?: string | null
          estimate_by?: string | null
          first_time?: number | null
          id?: string
          mothers_children?: number | null
          municipality_id?: string
          notes?: string | null
          photo_consent_id: string
          photo_consent_recorded_by?: string | null
          photo_consent_recorded_on?: string | null
          pwd_count?: number | null
          register_attached_id: string
          register_attached_other?: string | null
          repeat_participants?: number | null
          staff_municipal?: number | null
          staff_partner?: number | null
          staff_volunteers: number
          total_participants: number
          updated_at?: string
        }
        Update: {
          activity_id?: string
          client_uuid?: string | null
          consent_informed_id?: string
          consent_informed_recorded_by?: string | null
          consent_informed_recorded_on?: string | null
          count_method_id?: string
          counters?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duplicate_check_id?: string
          entered_by_name?: string | null
          entered_on?: string | null
          estimate_basis?: string | null
          estimate_by?: string | null
          first_time?: number | null
          id?: string
          mothers_children?: number | null
          municipality_id?: string
          notes?: string | null
          photo_consent_id?: string
          photo_consent_recorded_by?: string | null
          photo_consent_recorded_on?: string | null
          pwd_count?: number | null
          register_attached_id?: string
          register_attached_other?: string | null
          repeat_participants?: number | null
          staff_municipal?: number | null
          staff_partner?: number | null
          staff_volunteers?: number
          total_participants?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_attendance_activity_id_fkey"
            columns: ["activity_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_activity"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_attendance_consent_informed_id_fkey"
            columns: ["consent_informed_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d2_consent_informed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_attendance_count_method_id_fkey"
            columns: ["count_method_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d2_count_method"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_attendance_duplicate_check_id_fkey"
            columns: ["duplicate_check_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d2_duplicate_check"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_attendance_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_attendance_photo_consent_id_fkey"
            columns: ["photo_consent_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d2_photo_consent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_attendance_register_attached_id_fkey"
            columns: ["register_attached_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_d2_register_attached"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_attendance_count: {
        Row: {
          attendance_id: string
          cell_id: string
          count: number
          created_at: string
          field_code: string
          municipality_id: string
        }
        Insert: {
          attendance_id: string
          cell_id: string
          count: number
          created_at?: string
          field_code: string
          municipality_id?: string
        }
        Update: {
          attendance_id?: string
          cell_id?: string
          count?: number
          created_at?: string
          field_code?: string
          municipality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_attendance_count_attendance_id_fkey"
            columns: ["attendance_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_attendance"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_campaign: {
        Row: {
          area_m2: number | null
          area_section: string | null
          campaign_date: string
          campaign_time_from: string | null
          campaign_time_to: string | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          incident_id: string
          incident_other: string | null
          inkind_value: number | null
          is_first_campaign_id: string | null
          lead_organiser_id: string
          lead_organiser_other: string | null
          linked_item_id: string | null
          materials: string
          municipal_supervision_id: string
          municipal_supervision_other: string | null
          municipality_id: string
          new_volunteers: number
          outputs: string
          partners_involved: string | null
          person_hours: number
          recognition_id: string | null
          recognition_other: string | null
          recorded_by_name: string | null
          recorded_by_position: string | null
          recorded_on: string | null
          reference: string | null
          remaining_work: string
          safety_briefing_id: string
          school_linked_id: string | null
          school_linked_other: string | null
          updated_at: string
          volunteers_total: number
          works_item_id: string | null
        }
        Insert: {
          area_m2?: number | null
          area_section?: string | null
          campaign_date: string
          campaign_time_from?: string | null
          campaign_time_to?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          incident_id: string
          incident_other?: string | null
          inkind_value?: number | null
          is_first_campaign_id?: string | null
          lead_organiser_id: string
          lead_organiser_other?: string | null
          linked_item_id?: string | null
          materials: string
          municipal_supervision_id: string
          municipal_supervision_other?: string | null
          municipality_id?: string
          new_volunteers: number
          outputs: string
          partners_involved?: string | null
          person_hours: number
          recognition_id?: string | null
          recognition_other?: string | null
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          remaining_work: string
          safety_briefing_id: string
          school_linked_id?: string | null
          school_linked_other?: string | null
          updated_at?: string
          volunteers_total: number
          works_item_id?: string | null
        }
        Update: {
          area_m2?: number | null
          area_section?: string | null
          campaign_date?: string
          campaign_time_from?: string | null
          campaign_time_to?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          incident_id?: string
          incident_other?: string | null
          inkind_value?: number | null
          is_first_campaign_id?: string | null
          lead_organiser_id?: string
          lead_organiser_other?: string | null
          linked_item_id?: string | null
          materials?: string
          municipal_supervision_id?: string
          municipal_supervision_other?: string | null
          municipality_id?: string
          new_volunteers?: number
          outputs?: string
          partners_involved?: string | null
          person_hours?: number
          recognition_id?: string | null
          recognition_other?: string | null
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          remaining_work?: string
          safety_briefing_id?: string
          school_linked_id?: string | null
          school_linked_other?: string | null
          updated_at?: string
          volunteers_total?: number
          works_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_campaign_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_is_first_campaign_id_fkey"
            columns: ["is_first_campaign_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c2_is_first_campaign"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_lead_organiser_id_fkey"
            columns: ["lead_organiser_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c2_lead_organiser"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_linked_item_id_fkey"
            columns: ["linked_item_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c2_linked_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_municipal_supervision_id_fkey"
            columns: ["municipal_supervision_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c2_municipal_supervision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_recognition_id_fkey"
            columns: ["recognition_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c2_recognition"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_safety_briefing_id_fkey"
            columns: ["safety_briefing_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c2_safety_briefing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_school_linked_id_fkey"
            columns: ["school_linked_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c2_school_linked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_campaign_works_item_id_fkey"
            columns: ["works_item_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_works_item"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_campaign_count: {
        Row: {
          campaign_id: string
          cell_id: string
          count: number
          created_at: string
          field_code: string
          municipality_id: string
        }
        Insert: {
          campaign_id: string
          cell_id: string
          count: number
          created_at?: string
          field_code: string
          municipality_id?: string
        }
        Update: {
          campaign_id?: string
          cell_id?: string
          count?: number
          created_at?: string
          field_code?: string
          municipality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_campaign_count_campaign_id_fkey"
            columns: ["campaign_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_campaign"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_campaign_option: {
        Row: {
          campaign_id: string
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_campaign_option_campaign_id_fkey"
            columns: ["campaign_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_campaign"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_contribution: {
        Row: {
          acknowledged_id: string
          client_uuid: string | null
          conditions_id: string
          conditions_other: string | null
          contribution_type_id: string
          contributor_contact: string | null
          contributor_name: string
          contributor_type_id: string
          contributor_type_other: string | null
          created_at: string
          created_by: string | null
          csr_linked_id: string | null
          date_pledged: string | null
          date_received: string | null
          deleted_at: string | null
          description: string
          first_contribution_id: string
          first_contribution_other: string | null
          id: string
          municipal_acceptance_id: string
          municipal_acceptance_other: string | null
          municipality_id: string
          notes: string | null
          partner_id: string | null
          quantity: string | null
          quantity_unit: string | null
          recorded_by_name: string | null
          recorded_by_position: string | null
          recorded_on: string | null
          reference: string | null
          source_meeting_id: string | null
          source_meeting_other: string | null
          status_id: string
          updated_at: string
          valuation_basis_id: string
          value_jod: number
          volunteer_labour_person_hours: number | null
          volunteer_labour_volunteers: number | null
          works_item_id: string | null
        }
        Insert: {
          acknowledged_id: string
          client_uuid?: string | null
          conditions_id: string
          conditions_other?: string | null
          contribution_type_id: string
          contributor_contact?: string | null
          contributor_name: string
          contributor_type_id: string
          contributor_type_other?: string | null
          created_at?: string
          created_by?: string | null
          csr_linked_id?: string | null
          date_pledged?: string | null
          date_received?: string | null
          deleted_at?: string | null
          description: string
          first_contribution_id: string
          first_contribution_other?: string | null
          id?: string
          municipal_acceptance_id: string
          municipal_acceptance_other?: string | null
          municipality_id?: string
          notes?: string | null
          partner_id?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          source_meeting_id?: string | null
          source_meeting_other?: string | null
          status_id: string
          updated_at?: string
          valuation_basis_id: string
          value_jod: number
          volunteer_labour_person_hours?: number | null
          volunteer_labour_volunteers?: number | null
          works_item_id?: string | null
        }
        Update: {
          acknowledged_id?: string
          client_uuid?: string | null
          conditions_id?: string
          conditions_other?: string | null
          contribution_type_id?: string
          contributor_contact?: string | null
          contributor_name?: string
          contributor_type_id?: string
          contributor_type_other?: string | null
          created_at?: string
          created_by?: string | null
          csr_linked_id?: string | null
          date_pledged?: string | null
          date_received?: string | null
          deleted_at?: string | null
          description?: string
          first_contribution_id?: string
          first_contribution_other?: string | null
          id?: string
          municipal_acceptance_id?: string
          municipal_acceptance_other?: string | null
          municipality_id?: string
          notes?: string | null
          partner_id?: string | null
          quantity?: string | null
          quantity_unit?: string | null
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          source_meeting_id?: string | null
          source_meeting_other?: string | null
          status_id?: string
          updated_at?: string
          valuation_basis_id?: string
          value_jod?: number
          volunteer_labour_person_hours?: number | null
          volunteer_labour_volunteers?: number | null
          works_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_contribution_acknowledged_id_fkey"
            columns: ["acknowledged_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_acknowledged"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_conditions_id_fkey"
            columns: ["conditions_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_contribution_type_id_fkey"
            columns: ["contribution_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_contribution_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_contributor_type_id_fkey"
            columns: ["contributor_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_contributor_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_csr_linked_id_fkey"
            columns: ["csr_linked_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_csr_linked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_first_contribution_id_fkey"
            columns: ["first_contribution_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_first_contribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_municipal_acceptance_id_fkey"
            columns: ["municipal_acceptance_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_municipal_acceptance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_partner_id_fkey"
            columns: ["partner_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_partner"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_contribution_source_meeting_id_fkey"
            columns: ["source_meeting_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_source_meeting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_valuation_basis_id_fkey"
            columns: ["valuation_basis_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a3_valuation_basis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_contribution_works_item_id_fkey"
            columns: ["works_item_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_works_item"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_contribution_option: {
        Row: {
          contribution_id: string
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          contribution_id: string
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          contribution_id?: string
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_contribution_option_contribution_id_fkey"
            columns: ["contribution_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_contribution"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_coordination_meeting: {
        Row: {
          actions_assigned: string
          agenda: string
          attendance_sheet: boolean
          attendees_total: number
          chaired_by: string
          client_uuid: string | null
          contributions_pledged_id: string
          convened_by_id: string
          created_at: string
          created_by: string | null
          decisions: string
          deleted_at: string | null
          id: string
          issues_raised: string | null
          meeting_date: string
          meeting_time_from: string | null
          meeting_time_to: string | null
          meeting_type_id: string
          minutes_prepared_id: string
          municipality_id: string
          new_partners_id: string
          new_partners_other: string | null
          next_meeting: string | null
          notes: string | null
          orgs_invited: number
          orgs_present: number
          prev_followup_id: string
          recorded_by_name: string | null
          recorded_by_position: string | null
          recorded_on: string | null
          reference: string | null
          updated_at: string
          venue_id: string
          venue_other: string | null
        }
        Insert: {
          actions_assigned: string
          agenda: string
          attendance_sheet: boolean
          attendees_total: number
          chaired_by: string
          client_uuid?: string | null
          contributions_pledged_id: string
          convened_by_id: string
          created_at?: string
          created_by?: string | null
          decisions: string
          deleted_at?: string | null
          id?: string
          issues_raised?: string | null
          meeting_date: string
          meeting_time_from?: string | null
          meeting_time_to?: string | null
          meeting_type_id: string
          minutes_prepared_id: string
          municipality_id?: string
          new_partners_id: string
          new_partners_other?: string | null
          next_meeting?: string | null
          notes?: string | null
          orgs_invited: number
          orgs_present: number
          prev_followup_id: string
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          updated_at?: string
          venue_id: string
          venue_other?: string | null
        }
        Update: {
          actions_assigned?: string
          agenda?: string
          attendance_sheet?: boolean
          attendees_total?: number
          chaired_by?: string
          client_uuid?: string | null
          contributions_pledged_id?: string
          convened_by_id?: string
          created_at?: string
          created_by?: string | null
          decisions?: string
          deleted_at?: string | null
          id?: string
          issues_raised?: string | null
          meeting_date?: string
          meeting_time_from?: string | null
          meeting_time_to?: string | null
          meeting_type_id?: string
          minutes_prepared_id?: string
          municipality_id?: string
          new_partners_id?: string
          new_partners_other?: string | null
          next_meeting?: string | null
          notes?: string | null
          orgs_invited?: number
          orgs_present?: number
          prev_followup_id?: string
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          reference?: string | null
          updated_at?: string
          venue_id?: string
          venue_other?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_coordination_meeting_contributions_pledged_id_fkey"
            columns: ["contributions_pledged_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a2_contributions_pledged"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_coordination_meeting_convened_by_id_fkey"
            columns: ["convened_by_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a2_convened_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_coordination_meeting_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a2_meeting_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_coordination_meeting_minutes_prepared_id_fkey"
            columns: ["minutes_prepared_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a2_minutes_prepared"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_coordination_meeting_new_partners_id_fkey"
            columns: ["new_partners_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a2_new_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_coordination_meeting_prev_followup_id_fkey"
            columns: ["prev_followup_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a2_prev_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_coordination_meeting_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a2_venue"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_coordination_meeting_count: {
        Row: {
          cell_id: string
          count: number
          created_at: string
          field_code: string
          meeting_id: string
          municipality_id: string
        }
        Insert: {
          cell_id: string
          count: number
          created_at?: string
          field_code: string
          meeting_id: string
          municipality_id?: string
        }
        Update: {
          cell_id?: string
          count?: number
          created_at?: string
          field_code?: string
          meeting_id?: string
          municipality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_coordination_meeting_count_meeting_id_fkey"
            columns: ["meeting_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_coordination_meeting"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_coordination_meeting_option: {
        Row: {
          created_at: string
          meeting_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          meeting_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          meeting_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_coordination_meeting_option_meeting_id_fkey"
            columns: ["meeting_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_coordination_meeting"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_enterprise: {
        Row: {
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          enterprise_name: string | null
          id: string
          municipality_id: string
          owner_name: string | null
          owner_person_id: string | null
          owner_phone: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enterprise_name?: string | null
          id?: string
          municipality_id?: string
          owner_name?: string | null
          owner_person_id?: string | null
          owner_phone?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enterprise_name?: string | null
          id?: string
          municipality_id?: string
          owner_name?: string | null
          owner_person_id?: string | null
          owner_phone?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_owner_person_id_fkey"
            columns: ["owner_person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_enterprise_support: {
        Row: {
          age_group_id: string
          client_uuid: string | null
          consolidated_by_name: string | null
          consolidated_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disability_id: string | null
          entered_by_name: string | null
          entered_by_organisation: string | null
          entered_on: string | null
          enterprise_id: string
          first_support_date: string
          id: string
          municipality_id: string
          nationality_id: string
          outstanding_needs: string
          sex_id: string
          status_last_contact_id: string
          sup_guidance: boolean
          sup_guidance_dates: string | null
          sup_guidance_provider: string | null
          sup_guidance_sessions: number | null
          sup_hygiene_date: string | null
          sup_hygiene_id: string
          sup_hygiene_provider: string | null
          sup_inkind: boolean | null
          sup_inkind_description: string | null
          sup_licensing_info: boolean
          sup_licensing_info_date: string | null
          sup_licensing_info_provider: string | null
          sup_market_access: boolean
          sup_market_access_count: number | null
          sup_market_access_refs: string | null
          sup_marketing: boolean | null
          sup_marketing_description: string | null
          sup_other: string | null
          sup_peer_network: boolean
          sup_peer_network_date: string | null
          sup_peer_network_meetings: number | null
          sup_referral: boolean
          sup_referral_date: string | null
          sup_referral_entity: string | null
          sup_referral_outcome_id: string | null
          sup_referral_purpose: string | null
          sup_site_visit: boolean | null
          sup_site_visit_count: number | null
          sup_site_visit_dates: string | null
          support_types_count: number | null
          updated_at: string
        }
        Insert: {
          age_group_id: string
          client_uuid?: string | null
          consolidated_by_name?: string | null
          consolidated_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          entered_by_name?: string | null
          entered_by_organisation?: string | null
          entered_on?: string | null
          enterprise_id: string
          first_support_date: string
          id?: string
          municipality_id?: string
          nationality_id: string
          outstanding_needs: string
          sex_id: string
          status_last_contact_id: string
          sup_guidance: boolean
          sup_guidance_dates?: string | null
          sup_guidance_provider?: string | null
          sup_guidance_sessions?: number | null
          sup_hygiene_date?: string | null
          sup_hygiene_id: string
          sup_hygiene_provider?: string | null
          sup_inkind?: boolean | null
          sup_inkind_description?: string | null
          sup_licensing_info: boolean
          sup_licensing_info_date?: string | null
          sup_licensing_info_provider?: string | null
          sup_market_access: boolean
          sup_market_access_count?: number | null
          sup_market_access_refs?: string | null
          sup_marketing?: boolean | null
          sup_marketing_description?: string | null
          sup_other?: string | null
          sup_peer_network: boolean
          sup_peer_network_date?: string | null
          sup_peer_network_meetings?: number | null
          sup_referral: boolean
          sup_referral_date?: string | null
          sup_referral_entity?: string | null
          sup_referral_outcome_id?: string | null
          sup_referral_purpose?: string | null
          sup_site_visit?: boolean | null
          sup_site_visit_count?: number | null
          sup_site_visit_dates?: string | null
          support_types_count?: number | null
          updated_at?: string
        }
        Update: {
          age_group_id?: string
          client_uuid?: string | null
          consolidated_by_name?: string | null
          consolidated_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          entered_by_name?: string | null
          entered_by_organisation?: string | null
          entered_on?: string | null
          enterprise_id?: string
          first_support_date?: string
          id?: string
          municipality_id?: string
          nationality_id?: string
          outstanding_needs?: string
          sex_id?: string
          status_last_contact_id?: string
          sup_guidance?: boolean
          sup_guidance_dates?: string | null
          sup_guidance_provider?: string | null
          sup_guidance_sessions?: number | null
          sup_hygiene_date?: string | null
          sup_hygiene_id?: string
          sup_hygiene_provider?: string | null
          sup_inkind?: boolean | null
          sup_inkind_description?: string | null
          sup_licensing_info?: boolean
          sup_licensing_info_date?: string | null
          sup_licensing_info_provider?: string | null
          sup_market_access?: boolean
          sup_market_access_count?: number | null
          sup_market_access_refs?: string | null
          sup_marketing?: boolean | null
          sup_marketing_description?: string | null
          sup_other?: string | null
          sup_peer_network?: boolean
          sup_peer_network_date?: string | null
          sup_peer_network_meetings?: number | null
          sup_referral?: boolean
          sup_referral_date?: string | null
          sup_referral_entity?: string | null
          sup_referral_outcome_id?: string | null
          sup_referral_purpose?: string | null
          sup_site_visit?: boolean | null
          sup_site_visit_count?: number | null
          sup_site_visit_dates?: string | null
          support_types_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_enterprise_support_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_age_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_disability_id_fkey"
            columns: ["disability_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_disability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_enterprise_id_fkey"
            columns: ["enterprise_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_enterprise"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_sex_id_fkey"
            columns: ["sex_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_sex"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_status_last_contact_id_fkey"
            columns: ["status_last_contact_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g2_status_last_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_sup_hygiene_id_fkey"
            columns: ["sup_hygiene_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g2_sup_hygiene"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_enterprise_support_sup_referral_outcome_id_fkey"
            columns: ["sup_referral_outcome_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g2_sup_referral_outcome"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_enterprise_support_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          support_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          support_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          support_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_enterprise_support_option_support_id_fkey"
            columns: ["support_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_enterprise_support"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_guidance_completion: {
        Row: {
          age_group_id: string
          certificate_id: string
          certificate_other: string | null
          client_uuid: string | null
          completion: string | null
          created_at: string
          created_by: string | null
          cycle_reference: string | null
          cycle_year: string | null
          deleted_at: string | null
          disability_id: string | null
          enterprise_id: string
          enterprise_name: string | null
          enterprise_status_id: string
          extra_sessions: string | null
          id: string
          knowledge_check_done: boolean | null
          knowledge_score: number | null
          knowledge_score_of: number | null
          most_useful_id: string | null
          municipality_id: string
          nationality_id: string
          neighbourhood_id: string | null
          non_completion_reason_id: string
          non_completion_reason_other: string | null
          peer_network_id: string
          recorded_by_name: string | null
          recorded_by_position: string | null
          recorded_on: string | null
          referral_made_id: string
          referral_made_other: string | null
          s1_date: string | null
          s1_status_id: string | null
          s2_date: string | null
          s2_status_id: string | null
          s3_date: string | null
          s3_status_id: string | null
          s4_date: string | null
          s4_status_id: string | null
          s5_date: string | null
          s5_status_id: string | null
          sessions_attended_count: number | null
          updated_at: string
          venue_id: string | null
          venue_other: string | null
          workers_total: number | null
          workers_under_30: number | null
          workers_women: number | null
        }
        Insert: {
          age_group_id: string
          certificate_id: string
          certificate_other?: string | null
          client_uuid?: string | null
          completion?: string | null
          created_at?: string
          created_by?: string | null
          cycle_reference?: string | null
          cycle_year?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          enterprise_id: string
          enterprise_name?: string | null
          enterprise_status_id: string
          extra_sessions?: string | null
          id?: string
          knowledge_check_done?: boolean | null
          knowledge_score?: number | null
          knowledge_score_of?: number | null
          most_useful_id?: string | null
          municipality_id?: string
          nationality_id: string
          neighbourhood_id?: string | null
          non_completion_reason_id: string
          non_completion_reason_other?: string | null
          peer_network_id: string
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          referral_made_id: string
          referral_made_other?: string | null
          s1_date?: string | null
          s1_status_id?: string | null
          s2_date?: string | null
          s2_status_id?: string | null
          s3_date?: string | null
          s3_status_id?: string | null
          s4_date?: string | null
          s4_status_id?: string | null
          s5_date?: string | null
          s5_status_id?: string | null
          sessions_attended_count?: number | null
          updated_at?: string
          venue_id?: string | null
          venue_other?: string | null
          workers_total?: number | null
          workers_under_30?: number | null
          workers_women?: number | null
        }
        Update: {
          age_group_id?: string
          certificate_id?: string
          certificate_other?: string | null
          client_uuid?: string | null
          completion?: string | null
          created_at?: string
          created_by?: string | null
          cycle_reference?: string | null
          cycle_year?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          enterprise_id?: string
          enterprise_name?: string | null
          enterprise_status_id?: string
          extra_sessions?: string | null
          id?: string
          knowledge_check_done?: boolean | null
          knowledge_score?: number | null
          knowledge_score_of?: number | null
          most_useful_id?: string | null
          municipality_id?: string
          nationality_id?: string
          neighbourhood_id?: string | null
          non_completion_reason_id?: string
          non_completion_reason_other?: string | null
          peer_network_id?: string
          recorded_by_name?: string | null
          recorded_by_position?: string | null
          recorded_on?: string | null
          referral_made_id?: string
          referral_made_other?: string | null
          s1_date?: string | null
          s1_status_id?: string | null
          s2_date?: string | null
          s2_status_id?: string | null
          s3_date?: string | null
          s3_status_id?: string | null
          s4_date?: string | null
          s4_status_id?: string | null
          s5_date?: string | null
          s5_status_id?: string | null
          sessions_attended_count?: number | null
          updated_at?: string
          venue_id?: string | null
          venue_other?: string | null
          workers_total?: number | null
          workers_under_30?: number | null
          workers_women?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_guidance_completion_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_age_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_certificate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_cycle_year_fkey"
            columns: ["cycle_year"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_cycle_year"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_disability_id_fkey"
            columns: ["disability_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_disability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_enterprise_id_fkey"
            columns: ["enterprise_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_enterprise"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_enterprise_status_id_fkey"
            columns: ["enterprise_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_enterprise_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_most_useful_id_fkey"
            columns: ["most_useful_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_most_useful"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_neighbourhood"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_non_completion_reason_id_fkey"
            columns: ["non_completion_reason_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_non_completion_reason"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_peer_network_id_fkey"
            columns: ["peer_network_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_peer_network"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_referral_made_id_fkey"
            columns: ["referral_made_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_referral_made"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_s1_status_id_fkey"
            columns: ["s1_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_session_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_s2_status_id_fkey"
            columns: ["s2_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_session_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_s3_status_id_fkey"
            columns: ["s3_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_s3_hygiene"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_s4_status_id_fkey"
            columns: ["s4_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_session_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_s5_status_id_fkey"
            columns: ["s5_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_session_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_guidance_completion_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_g1_venue"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_guidance_completion_option: {
        Row: {
          completion_id: string
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          completion_id: string
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          completion_id?: string
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_guidance_completion_option_completion_id_fkey"
            columns: ["completion_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_guidance_completion"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_interaction_survey: {
        Row: {
          age_group_id: string
          change_narrative: string
          children_count: number | null
          client_uuid: string | null
          comfort_level_id: string | null
          consent_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disability_id: string
          enum_name: string
          enum_notes: string | null
          has_children_id: string
          id: string
          int_date: string
          int_place_id: string
          joint_activity_id: string | null
          mixed_presence_id: string | null
          municipality_id: string
          nationality_id: string
          neighbourhood_id: string
          new_contact_id: string | null
          opportunity_increase_id: string | null
          recontact_id: string
          recontact_other: string | null
          relations_change_id: string
          sex_id: string
          suggestions: string | null
          suitable_women_children_id: string
          survey_round_id: string
          updated_at: string
          visit_freq_id: string
        }
        Insert: {
          age_group_id: string
          change_narrative: string
          children_count?: number | null
          client_uuid?: string | null
          comfort_level_id?: string | null
          consent_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id: string
          enum_name: string
          enum_notes?: string | null
          has_children_id: string
          id?: string
          int_date: string
          int_place_id: string
          joint_activity_id?: string | null
          mixed_presence_id?: string | null
          municipality_id?: string
          nationality_id: string
          neighbourhood_id: string
          new_contact_id?: string | null
          opportunity_increase_id?: string | null
          recontact_id: string
          recontact_other?: string | null
          relations_change_id: string
          sex_id: string
          suggestions?: string | null
          suitable_women_children_id: string
          survey_round_id: string
          updated_at?: string
          visit_freq_id: string
        }
        Update: {
          age_group_id?: string
          change_narrative?: string
          children_count?: number | null
          client_uuid?: string | null
          comfort_level_id?: string | null
          consent_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string
          enum_name?: string
          enum_notes?: string | null
          has_children_id?: string
          id?: string
          int_date?: string
          int_place_id?: string
          joint_activity_id?: string | null
          mixed_presence_id?: string | null
          municipality_id?: string
          nationality_id?: string
          neighbourhood_id?: string
          new_contact_id?: string | null
          opportunity_increase_id?: string | null
          recontact_id?: string
          recontact_other?: string | null
          relations_change_id?: string
          sex_id?: string
          suggestions?: string | null
          suitable_women_children_id?: string
          survey_round_id?: string
          updated_at?: string
          visit_freq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_interaction_survey_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_age_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_comfort_level_id_fkey"
            columns: ["comfort_level_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_comfort_level"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_consent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_disability_id_fkey"
            columns: ["disability_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_disability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_has_children_id_fkey"
            columns: ["has_children_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_has_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_int_place_id_fkey"
            columns: ["int_place_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_int_place"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_joint_activity_id_fkey"
            columns: ["joint_activity_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_joint_activity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_mixed_presence_id_fkey"
            columns: ["mixed_presence_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_mixed_presence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_neighbourhood"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_new_contact_id_fkey"
            columns: ["new_contact_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_new_contact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_opportunity_increase_id_fkey"
            columns: ["opportunity_increase_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_agree_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_recontact_id_fkey"
            columns: ["recontact_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_recontact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_relations_change_id_fkey"
            columns: ["relations_change_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_relations_change"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_sex_id_fkey"
            columns: ["sex_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_sex"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_suitable_women_children_id_fkey"
            columns: ["suitable_women_children_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_yes_fully_partly_no"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_survey_round_id_fkey"
            columns: ["survey_round_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_survey_round"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_interaction_survey_visit_freq_id_fkey"
            columns: ["visit_freq_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_imp0_visit_freq"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_interaction_survey_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          survey_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_interaction_survey_option_survey_id_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_interaction_survey"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_market: {
        Row: {
          accessibility_id: string
          accessibility_other: string | null
          announcement_days_before: number | null
          applications_accepted: number | null
          applications_declined: number | null
          applications_received: number
          cash_cost_jod: number
          cash_source_id: string | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          decline_reason: string | null
          deleted_at: string | null
          fee_basis: string | null
          fee_charged: boolean
          fee_per_stall_jod: number | null
          feedback_collected_id: string
          hygiene_check_id: string
          hygiene_check_other: string | null
          id: string
          inkind_provider: string | null
          inkind_value_jod: number | null
          is_published: boolean
          lessons: string
          location_id: string
          location_other: string | null
          market_date: string
          market_name: string
          municipality_id: string
          occasion_id: string
          occasion_other: string | null
          permit_date: string | null
          permit_reference: string | null
          phase_id: string
          recorded_by_name: string | null
          recorded_on: string | null
          reference: string | null
          refreshment_point_id: string | null
          refreshment_point_other: string | null
          selection_method_id: string
          stalls_occupied: number
          stalls_offered: number
          times_from: string | null
          times_to: string | null
          total_sales_jod: number
          total_sales_method_id: string | null
          updated_at: string
          vendor_forms: number | null
          verified_by_name: string | null
          verified_on: string | null
          visitor_forms: number | null
          visitors_estimated: number
          visitors_method_id: string | null
        }
        Insert: {
          accessibility_id: string
          accessibility_other?: string | null
          announcement_days_before?: number | null
          applications_accepted?: number | null
          applications_declined?: number | null
          applications_received: number
          cash_cost_jod: number
          cash_source_id?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          deleted_at?: string | null
          fee_basis?: string | null
          fee_charged: boolean
          fee_per_stall_jod?: number | null
          feedback_collected_id: string
          hygiene_check_id: string
          hygiene_check_other?: string | null
          id?: string
          inkind_provider?: string | null
          inkind_value_jod?: number | null
          is_published?: boolean
          lessons: string
          location_id: string
          location_other?: string | null
          market_date: string
          market_name: string
          municipality_id?: string
          occasion_id: string
          occasion_other?: string | null
          permit_date?: string | null
          permit_reference?: string | null
          phase_id: string
          recorded_by_name?: string | null
          recorded_on?: string | null
          reference?: string | null
          refreshment_point_id?: string | null
          refreshment_point_other?: string | null
          selection_method_id: string
          stalls_occupied: number
          stalls_offered: number
          times_from?: string | null
          times_to?: string | null
          total_sales_jod: number
          total_sales_method_id?: string | null
          updated_at?: string
          vendor_forms?: number | null
          verified_by_name?: string | null
          verified_on?: string | null
          visitor_forms?: number | null
          visitors_estimated: number
          visitors_method_id?: string | null
        }
        Update: {
          accessibility_id?: string
          accessibility_other?: string | null
          announcement_days_before?: number | null
          applications_accepted?: number | null
          applications_declined?: number | null
          applications_received?: number
          cash_cost_jod?: number
          cash_source_id?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          decline_reason?: string | null
          deleted_at?: string | null
          fee_basis?: string | null
          fee_charged?: boolean
          fee_per_stall_jod?: number | null
          feedback_collected_id?: string
          hygiene_check_id?: string
          hygiene_check_other?: string | null
          id?: string
          inkind_provider?: string | null
          inkind_value_jod?: number | null
          is_published?: boolean
          lessons?: string
          location_id?: string
          location_other?: string | null
          market_date?: string
          market_name?: string
          municipality_id?: string
          occasion_id?: string
          occasion_other?: string | null
          permit_date?: string | null
          permit_reference?: string | null
          phase_id?: string
          recorded_by_name?: string | null
          recorded_on?: string | null
          reference?: string | null
          refreshment_point_id?: string | null
          refreshment_point_other?: string | null
          selection_method_id?: string
          stalls_occupied?: number
          stalls_offered?: number
          times_from?: string | null
          times_to?: string | null
          total_sales_jod?: number
          total_sales_method_id?: string | null
          updated_at?: string
          vendor_forms?: number | null
          verified_by_name?: string | null
          verified_on?: string | null
          visitor_forms?: number | null
          visitors_estimated?: number
          visitors_method_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_market_accessibility_id_fkey"
            columns: ["accessibility_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_accessibility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_cash_source_id_fkey"
            columns: ["cash_source_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_cost_source"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_feedback_collected_id_fkey"
            columns: ["feedback_collected_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_feedback_collected"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_hygiene_check_id_fkey"
            columns: ["hygiene_check_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_hygiene_check"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_occasion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_phase"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_refreshment_point_id_fkey"
            columns: ["refreshment_point_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_refreshment_point"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_selection_method_id_fkey"
            columns: ["selection_method_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_selection_method"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_total_sales_method_id_fkey"
            columns: ["total_sales_method_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_total_sales_method"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_market_visitors_method_id_fkey"
            columns: ["visitors_method_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h1_visitors_method"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_market_count: {
        Row: {
          cell_id: string
          count: number
          created_at: string
          field_code: string
          market_id: string
          municipality_id: string
        }
        Insert: {
          cell_id: string
          count: number
          created_at?: string
          field_code: string
          market_id: string
          municipality_id?: string
        }
        Update: {
          cell_id?: string
          count?: number
          created_at?: string
          field_code?: string
          market_id?: string
          municipality_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_market_count_market_id_fkey"
            columns: ["market_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_market"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_market_option: {
        Row: {
          created_at: string
          market_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          market_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          market_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_market_option_market_id_fkey"
            columns: ["market_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_market"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_milestone_checklist_item: {
        Row: {
          created_at: string
          detail: string | null
          evidence_ref: string | null
          field_code: string
          item_no: number
          municipality_id: string
          status_date: string | null
          status_id: string
          verification_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          evidence_ref?: string | null
          field_code: string
          item_no: number
          municipality_id?: string
          status_date?: string | null
          status_id: string
          verification_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          evidence_ref?: string | null
          field_code?: string
          item_no?: number
          municipality_id?: string
          status_date?: string | null
          status_id?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_milestone_checklist_item_verification_id_fkey"
            columns: ["verification_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_milestone_verification"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_milestone_item: {
        Row: {
          field_code: string
          field_type: string
          item_no: number
          label_ar: string
          label_en: string
          list_name: string | null
          milestone_code: string
        }
        Insert: {
          field_code: string
          field_type: string
          item_no: number
          label_ar: string
          label_en: string
          list_name?: string | null
          milestone_code: string
        }
        Update: {
          field_code?: string
          field_type?: string
          item_no?: number
          label_ar?: string
          label_en?: string
          list_name?: string | null
          milestone_code?: string
        }
        Relationships: []
      }
      khld_milestone_rule: {
        Row: {
          created_at: string
          critical_items: number[] | null
          decided_by: string | null
          decided_on: string | null
          milestone_code: string
          municipality_id: string
          note_ar: string | null
          note_en: string | null
          source_items: number[]
          source_rule_ar: string
          source_rule_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          critical_items?: number[] | null
          decided_by?: string | null
          decided_on?: string | null
          milestone_code: string
          municipality_id?: string
          note_ar?: string | null
          note_en?: string | null
          source_items: number[]
          source_rule_ar: string
          source_rule_en: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          critical_items?: number[] | null
          decided_by?: string | null
          decided_on?: string | null
          milestone_code?: string
          municipality_id?: string
          note_ar?: string | null
          note_en?: string | null
          source_items?: number[]
          source_rule_ar?: string
          source_rule_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_milestone_rule_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_milestone_verification: {
        Row: {
          action_days_since_launch: number | null
          attended_count: number | null
          calendar_horizon_id: string | null
          client_uuid: string | null
          committee_coordinator_name: string | null
          community_coordinator_name: string | null
          coordinator_decision_date: string | null
          coordinator_decision_no: string | null
          coordinator_officer_name: string | null
          council_decision_id: string | null
          council_decision_other: string | null
          countersign_date: string | null
          countersign_name: string | null
          created_at: string
          created_by: string | null
          database_format_id: string | null
          deleted_at: string | null
          duplication_avoided_id: string | null
          duplication_avoided_other: string | null
          focal_point_id: string | null
          focal_point_other: string | null
          founding_meeting_date: string | null
          founding_meeting_venue: string | null
          gaps: string
          id: string
          intro_meetings: number | null
          invited_count: number | null
          last_updated: string | null
          launch_date: string | null
          meeting_cycle_id: string | null
          meetings_held: number | null
          meetings_with_minutes: number | null
          milestone_code: string
          municipality_id: string
          orgs_joined: string | null
          orgs_withdrew: string | null
          period_covered_from: string | null
          period_covered_to: string | null
          protocol_ref: string | null
          recognition_delivered: number | null
          registered_count: number | null
          registered_pwd: number | null
          registered_refugees: number | null
          registered_women: number | null
          registered_youth: number | null
          requests_approved: number | null
          requests_declined: number | null
          requests_received: number | null
          signed_on: string | null
          stakeholder_updated: string | null
          tracking_format_id: string | null
          updated_at: string
          verif_by: string
          verif_date: string
          verif_round_id: string | null
        }
        Insert: {
          action_days_since_launch?: number | null
          attended_count?: number | null
          calendar_horizon_id?: string | null
          client_uuid?: string | null
          committee_coordinator_name?: string | null
          community_coordinator_name?: string | null
          coordinator_decision_date?: string | null
          coordinator_decision_no?: string | null
          coordinator_officer_name?: string | null
          council_decision_id?: string | null
          council_decision_other?: string | null
          countersign_date?: string | null
          countersign_name?: string | null
          created_at?: string
          created_by?: string | null
          database_format_id?: string | null
          deleted_at?: string | null
          duplication_avoided_id?: string | null
          duplication_avoided_other?: string | null
          focal_point_id?: string | null
          focal_point_other?: string | null
          founding_meeting_date?: string | null
          founding_meeting_venue?: string | null
          gaps: string
          id?: string
          intro_meetings?: number | null
          invited_count?: number | null
          last_updated?: string | null
          launch_date?: string | null
          meeting_cycle_id?: string | null
          meetings_held?: number | null
          meetings_with_minutes?: number | null
          milestone_code: string
          municipality_id?: string
          orgs_joined?: string | null
          orgs_withdrew?: string | null
          period_covered_from?: string | null
          period_covered_to?: string | null
          protocol_ref?: string | null
          recognition_delivered?: number | null
          registered_count?: number | null
          registered_pwd?: number | null
          registered_refugees?: number | null
          registered_women?: number | null
          registered_youth?: number | null
          requests_approved?: number | null
          requests_declined?: number | null
          requests_received?: number | null
          signed_on?: string | null
          stakeholder_updated?: string | null
          tracking_format_id?: string | null
          updated_at?: string
          verif_by: string
          verif_date: string
          verif_round_id?: string | null
        }
        Update: {
          action_days_since_launch?: number | null
          attended_count?: number | null
          calendar_horizon_id?: string | null
          client_uuid?: string | null
          committee_coordinator_name?: string | null
          community_coordinator_name?: string | null
          coordinator_decision_date?: string | null
          coordinator_decision_no?: string | null
          coordinator_officer_name?: string | null
          council_decision_id?: string | null
          council_decision_other?: string | null
          countersign_date?: string | null
          countersign_name?: string | null
          created_at?: string
          created_by?: string | null
          database_format_id?: string | null
          deleted_at?: string | null
          duplication_avoided_id?: string | null
          duplication_avoided_other?: string | null
          focal_point_id?: string | null
          focal_point_other?: string | null
          founding_meeting_date?: string | null
          founding_meeting_venue?: string | null
          gaps?: string
          id?: string
          intro_meetings?: number | null
          invited_count?: number | null
          last_updated?: string | null
          launch_date?: string | null
          meeting_cycle_id?: string | null
          meetings_held?: number | null
          meetings_with_minutes?: number | null
          milestone_code?: string
          municipality_id?: string
          orgs_joined?: string | null
          orgs_withdrew?: string | null
          period_covered_from?: string | null
          period_covered_to?: string | null
          protocol_ref?: string | null
          recognition_delivered?: number | null
          registered_count?: number | null
          registered_pwd?: number | null
          registered_refugees?: number | null
          registered_women?: number | null
          registered_youth?: number | null
          requests_approved?: number | null
          requests_declined?: number | null
          requests_received?: number | null
          signed_on?: string | null
          stakeholder_updated?: string | null
          tracking_format_id?: string | null
          updated_at?: string
          verif_by?: string
          verif_date?: string
          verif_round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_milestone_verification_calendar_horizon_id_fkey"
            columns: ["calendar_horizon_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_b1_calendar_horizon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_council_decision_id_fkey"
            columns: ["council_decision_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a1_council_decision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_database_format_id_fkey"
            columns: ["database_format_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f1_database_format"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_duplication_avoided_id_fkey"
            columns: ["duplication_avoided_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_e1_duplication_avoided"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_focal_point_id_fkey"
            columns: ["focal_point_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f1_focal_point"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_meeting_cycle_id_fkey"
            columns: ["meeting_cycle_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_e1_meeting_cycle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_tracking_format_id_fkey"
            columns: ["tracking_format_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a1_tracking_format"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_milestone_verification_verif_round_id_fkey"
            columns: ["verif_round_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_a1_verif_round"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_milestone_verification_count: {
        Row: {
          cell_id: string
          count: number
          created_at: string
          field_code: string
          municipality_id: string
          verification_id: string
        }
        Insert: {
          cell_id: string
          count: number
          created_at?: string
          field_code: string
          municipality_id?: string
          verification_id: string
        }
        Update: {
          cell_id?: string
          count?: number
          created_at?: string
          field_code?: string
          municipality_id?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_milestone_verification_count_verification_id_fkey"
            columns: ["verification_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_milestone_verification"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_milestone_verification_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          verification_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          verification_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_milestone_verification_option_verification_id_fkey"
            columns: ["verification_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_milestone_verification"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_partner: {
        Row: {
          client_uuid: string | null
          contact: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          municipality_id: string
          name: string
          partner_type_id: string | null
          partner_type_other: string | null
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          municipality_id?: string
          name: string
          partner_type_id?: string | null
          partner_type_other?: string | null
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          contact?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          municipality_id?: string
          name?: string
          partner_type_id?: string | null
          partner_type_other?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_partner_type_id_fkey"
            columns: ["partner_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_partner_type"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_partner_survey: {
        Row: {
          client_uuid: string | null
          continue_intent_id: string
          continue_intent_other: string | null
          coord_notes: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          duplication_id: string
          engagement_since: string
          focal_point_id: string
          id: string
          improve_suggestion: string
          meetings_attended: number
          municipality_id: string
          overall_rating_id: string
          partner_id: string
          q_communication_id: string
          q_followup_id: string
          q_improved_id: string
          q_joint_planning_id: string
          q_roles_id: string
          q_transparency_id: string
          resp_contact: string | null
          resp_date: string
          resp_name: string
          resp_sex_id: string | null
          survey_round_id: string
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          continue_intent_id: string
          continue_intent_other?: string | null
          coord_notes?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duplication_id: string
          engagement_since: string
          focal_point_id: string
          id?: string
          improve_suggestion: string
          meetings_attended: number
          municipality_id?: string
          overall_rating_id: string
          partner_id: string
          q_communication_id: string
          q_followup_id: string
          q_improved_id: string
          q_joint_planning_id: string
          q_roles_id: string
          q_transparency_id: string
          resp_contact?: string | null
          resp_date: string
          resp_name: string
          resp_sex_id?: string | null
          survey_round_id: string
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          continue_intent_id?: string
          continue_intent_other?: string | null
          coord_notes?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duplication_id?: string
          engagement_since?: string
          focal_point_id?: string
          id?: string
          improve_suggestion?: string
          meetings_attended?: number
          municipality_id?: string
          overall_rating_id?: string
          partner_id?: string
          q_communication_id?: string
          q_followup_id?: string
          q_improved_id?: string
          q_joint_planning_id?: string
          q_roles_id?: string
          q_transparency_id?: string
          resp_contact?: string | null
          resp_date?: string
          resp_name?: string
          resp_sex_id?: string | null
          survey_round_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_partner_survey_continue_intent_id_fkey"
            columns: ["continue_intent_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so10_continue_intent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_duplication_id_fkey"
            columns: ["duplication_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so10_duplication"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_focal_point_id_fkey"
            columns: ["focal_point_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so10_focal_point"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_overall_rating_id_fkey"
            columns: ["overall_rating_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so10_overall_rating"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_partner_id_fkey"
            columns: ["partner_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_partner"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_partner_survey_q_communication_id_fkey"
            columns: ["q_communication_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_agree_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_q_followup_id_fkey"
            columns: ["q_followup_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_agree_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_q_improved_id_fkey"
            columns: ["q_improved_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_agree_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_q_joint_planning_id_fkey"
            columns: ["q_joint_planning_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_agree_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_q_roles_id_fkey"
            columns: ["q_roles_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_agree_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_q_transparency_id_fkey"
            columns: ["q_transparency_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_agree_scale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_resp_sex_id_fkey"
            columns: ["resp_sex_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_sex"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_partner_survey_survey_round_id_fkey"
            columns: ["survey_round_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so10_survey_round"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_partner_survey_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          survey_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_partner_survey_option_survey_id_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_partner_survey"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_producer_survey: {
        Row: {
          age_group_id: string
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disability_id: string | null
          enumerator: string
          exposure_id: string
          first_organised_market_id: string
          guidance_received_id: string
          id: string
          int_date: string
          made_sales_id: string
          markets_count: number
          mode_id: string
          municipality_id: string
          nationality_id: string
          neighbourhood_id: string | null
          new_customers_id: string
          notes: string | null
          overall_opportunity_id: string
          participate_again_id: string
          production_change_id: string
          quote: string | null
          recontact_id: string
          recontact_other: string | null
          repeat_orders_id: string
          respondent_is_vendor_id: string
          sales_last_market_id: string
          sex_id: string
          still_active_id: string
          stop_reason_id: string
          stop_reason_other: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          age_group_id: string
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          enumerator: string
          exposure_id: string
          first_organised_market_id: string
          guidance_received_id: string
          id?: string
          int_date: string
          made_sales_id: string
          markets_count: number
          mode_id: string
          municipality_id?: string
          nationality_id: string
          neighbourhood_id?: string | null
          new_customers_id: string
          notes?: string | null
          overall_opportunity_id: string
          participate_again_id: string
          production_change_id: string
          quote?: string | null
          recontact_id: string
          recontact_other?: string | null
          repeat_orders_id: string
          respondent_is_vendor_id: string
          sales_last_market_id: string
          sex_id: string
          still_active_id: string
          stop_reason_id: string
          stop_reason_other?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          age_group_id?: string
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          enumerator?: string
          exposure_id?: string
          first_organised_market_id?: string
          guidance_received_id?: string
          id?: string
          int_date?: string
          made_sales_id?: string
          markets_count?: number
          mode_id?: string
          municipality_id?: string
          nationality_id?: string
          neighbourhood_id?: string | null
          new_customers_id?: string
          notes?: string | null
          overall_opportunity_id?: string
          participate_again_id?: string
          production_change_id?: string
          quote?: string | null
          recontact_id?: string
          recontact_other?: string | null
          repeat_orders_id?: string
          respondent_is_vendor_id?: string
          sales_last_market_id?: string
          sex_id?: string
          still_active_id?: string
          stop_reason_id?: string
          stop_reason_other?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_producer_survey_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_age_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_disability_id_fkey"
            columns: ["disability_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_disability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_exposure_id_fkey"
            columns: ["exposure_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_exposure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_first_organised_market_id_fkey"
            columns: ["first_organised_market_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_first_organised_market"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_guidance_received_id_fkey"
            columns: ["guidance_received_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_guidance_received"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_made_sales_id_fkey"
            columns: ["made_sales_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_made_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_mode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_neighbourhood"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_new_customers_id_fkey"
            columns: ["new_customers_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_new_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_overall_opportunity_id_fkey"
            columns: ["overall_opportunity_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_overall_opportunity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_participate_again_id_fkey"
            columns: ["participate_again_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_participate_again"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_production_change_id_fkey"
            columns: ["production_change_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_production_change"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_recontact_id_fkey"
            columns: ["recontact_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_recontact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_repeat_orders_id_fkey"
            columns: ["repeat_orders_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_repeat_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_respondent_is_vendor_id_fkey"
            columns: ["respondent_is_vendor_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_respondent_is_vendor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_sales_last_market_id_fkey"
            columns: ["sales_last_market_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_sales_band"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_sex_id_fkey"
            columns: ["sex_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_sex"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_still_active_id_fkey"
            columns: ["still_active_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_still_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_stop_reason_id_fkey"
            columns: ["stop_reason_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so40_stop_reason"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_producer_survey_vendor_id_fkey"
            columns: ["vendor_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_vendor"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_producer_survey_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          survey_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_producer_survey_option_survey_id_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_producer_survey"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_question_list: {
        Row: {
          kind: string
          list_name: string
          question_code: string
          table_name: string
        }
        Insert: {
          kind: string
          list_name: string
          question_code: string
          table_name: string
        }
        Update: {
          kind?: string
          list_name?: string
          question_code?: string
          table_name?: string
        }
        Relationships: []
      }
      khld_reference_counter: {
        Row: {
          last_no: number
          municipality_id: string
          prefix: string
          year: number
        }
        Insert: {
          last_no?: number
          municipality_id: string
          prefix: string
          year: number
        }
        Update: {
          last_no?: number
          municipality_id?: string
          prefix?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "khld_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_user_feedback: {
        Row: {
          activity_id: string
          activity_suitable_id: string
          activity_suitable_other: string | null
          age_group_id: string
          client_uuid: string | null
          collected_by: string | null
          collection_mode_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disability_id: string | null
          feedback_date: string
          feel_safe_id: string
          feel_welcome_id: string
          first_visit: boolean
          id: string
          improve_most: string
          liked_most: string | null
          municipality_id: string
          nationality_id: string
          overall_satisfaction_id: string
          participate_freely_id: string
          sex_id: string
          suitable_women_children_id: string
          suitable_women_children_other: string | null
          timing_convenient_id: string
          timing_convenient_other: string | null
          updated_at: string
          would_return_id: string
        }
        Insert: {
          activity_id: string
          activity_suitable_id: string
          activity_suitable_other?: string | null
          age_group_id: string
          client_uuid?: string | null
          collected_by?: string | null
          collection_mode_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          feedback_date: string
          feel_safe_id: string
          feel_welcome_id: string
          first_visit: boolean
          id?: string
          improve_most: string
          liked_most?: string | null
          municipality_id?: string
          nationality_id: string
          overall_satisfaction_id: string
          participate_freely_id: string
          sex_id: string
          suitable_women_children_id: string
          suitable_women_children_other?: string | null
          timing_convenient_id: string
          timing_convenient_other?: string | null
          updated_at?: string
          would_return_id: string
        }
        Update: {
          activity_id?: string
          activity_suitable_id?: string
          activity_suitable_other?: string | null
          age_group_id?: string
          client_uuid?: string | null
          collected_by?: string | null
          collection_mode_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string | null
          feedback_date?: string
          feel_safe_id?: string
          feel_welcome_id?: string
          first_visit?: boolean
          id?: string
          improve_most?: string
          liked_most?: string | null
          municipality_id?: string
          nationality_id?: string
          overall_satisfaction_id?: string
          participate_freely_id?: string
          sex_id?: string
          suitable_women_children_id?: string
          suitable_women_children_other?: string | null
          timing_convenient_id?: string
          timing_convenient_other?: string | null
          updated_at?: string
          would_return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_user_feedback_activity_id_fkey"
            columns: ["activity_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_activity"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_user_feedback_activity_suitable_id_fkey"
            columns: ["activity_suitable_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_activity_suitable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_age_group_id_fkey"
            columns: ["age_group_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_age_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_collection_mode_id_fkey"
            columns: ["collection_mode_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_collection_mode"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_disability_id_fkey"
            columns: ["disability_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_disability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_feel_safe_id_fkey"
            columns: ["feel_safe_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_feel_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_feel_welcome_id_fkey"
            columns: ["feel_welcome_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_yes_fully_partly_no"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_overall_satisfaction_id_fkey"
            columns: ["overall_satisfaction_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_overall_satisfaction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_participate_freely_id_fkey"
            columns: ["participate_freely_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_participate_freely"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_sex_id_fkey"
            columns: ["sex_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_sex"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_suitable_women_children_id_fkey"
            columns: ["suitable_women_children_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_suitable_women_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_timing_convenient_id_fkey"
            columns: ["timing_convenient_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_timing_convenient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_would_return_id_fkey"
            columns: ["would_return_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_would_return"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_user_feedback_option: {
        Row: {
          created_at: string
          feedback_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_user_feedback_option_feedback_id_fkey"
            columns: ["feedback_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_user_feedback"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_user_feedback_rating: {
        Row: {
          created_at: string
          feedback_id: string
          item_id: string
          municipality_id: string
          rating_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          item_id: string
          municipality_id?: string
          rating_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          item_id?: string
          municipality_id?: string
          rating_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_user_feedback_rating_feedback_id_fkey"
            columns: ["feedback_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_user_feedback"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_user_feedback_rating_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_facility_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_user_feedback_rating_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so20_facility_rating"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_vendor: {
        Row: {
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          municipality_id: string
          person_id: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          municipality_id?: string
          person_id: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          municipality_id?: string
          person_id?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_vendor_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_vendor_registration: {
        Row: {
          attended_id: string
          attended_other: string | null
          client_uuid: string | null
          commitment_signed_id: string
          consent_id: string
          consent_recorded_by: string | null
          consent_recorded_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disability_id: string
          enterprise_id: string | null
          first_organised_market: boolean
          health_certificate_id: string
          health_certificate_other: string | null
          id: string
          licensed_id: string
          licensed_other: string | null
          market_id: string
          municipality_id: string
          nationality_id: string
          neighbourhood_id: string
          nominated_by_id: string
          notes: string | null
          registered_by_name: string | null
          registered_by_organisation: string | null
          registered_on: string | null
          sales_band_id: string | null
          signed_by: string | null
          signed_on: string | null
          stall_fee_jod: number | null
          stall_free: boolean
          stall_number: string
          updated_at: string
          vendor_id: string
          vendor_type_id: string
          vendor_type_other: string | null
        }
        Insert: {
          attended_id: string
          attended_other?: string | null
          client_uuid?: string | null
          commitment_signed_id: string
          consent_id: string
          consent_recorded_by?: string | null
          consent_recorded_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id: string
          enterprise_id?: string | null
          first_organised_market: boolean
          health_certificate_id: string
          health_certificate_other?: string | null
          id?: string
          licensed_id: string
          licensed_other?: string | null
          market_id: string
          municipality_id?: string
          nationality_id: string
          neighbourhood_id: string
          nominated_by_id: string
          notes?: string | null
          registered_by_name?: string | null
          registered_by_organisation?: string | null
          registered_on?: string | null
          sales_band_id?: string | null
          signed_by?: string | null
          signed_on?: string | null
          stall_fee_jod?: number | null
          stall_free: boolean
          stall_number: string
          updated_at?: string
          vendor_id: string
          vendor_type_id: string
          vendor_type_other?: string | null
        }
        Update: {
          attended_id?: string
          attended_other?: string | null
          client_uuid?: string | null
          commitment_signed_id?: string
          consent_id?: string
          consent_recorded_by?: string | null
          consent_recorded_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string
          enterprise_id?: string | null
          first_organised_market?: boolean
          health_certificate_id?: string
          health_certificate_other?: string | null
          id?: string
          licensed_id?: string
          licensed_other?: string | null
          market_id?: string
          municipality_id?: string
          nationality_id?: string
          neighbourhood_id?: string
          nominated_by_id?: string
          notes?: string | null
          registered_by_name?: string | null
          registered_by_organisation?: string | null
          registered_on?: string | null
          sales_band_id?: string | null
          signed_by?: string | null
          signed_on?: string | null
          stall_fee_jod?: number | null
          stall_free?: boolean
          stall_number?: string
          updated_at?: string
          vendor_id?: string
          vendor_type_id?: string
          vendor_type_other?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_vendor_registration_attended_id_fkey"
            columns: ["attended_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h2_attended"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_commitment_signed_id_fkey"
            columns: ["commitment_signed_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h2_commitment_signed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h2_consent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_disability_id_fkey"
            columns: ["disability_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_disability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_enterprise_id_fkey"
            columns: ["enterprise_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_enterprise"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_health_certificate_id_fkey"
            columns: ["health_certificate_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h2_health_certificate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_licensed_id_fkey"
            columns: ["licensed_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h2_licensed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_market_id_fkey"
            columns: ["market_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_market"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_neighbourhood"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_nominated_by_id_fkey"
            columns: ["nominated_by_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h2_nominated_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_sales_band_id_fkey"
            columns: ["sales_band_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_sales_band"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_vendor_id_fkey"
            columns: ["vendor_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_vendor"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_vendor_registration_vendor_type_id_fkey"
            columns: ["vendor_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_h2_vendor_type"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_vendor_registration_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          registration_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          registration_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_vendor_registration_option_registration_id_fkey"
            columns: ["registration_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_vendor_registration"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_volunteer: {
        Row: {
          affiliation_id: string
          affiliation_other: string | null
          client_uuid: string | null
          consent_data: boolean
          consent_data_recorded_by: string | null
          consent_data_recorded_on: string | null
          consent_photo: boolean
          consent_photo_recorded_by: string | null
          consent_photo_recorded_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          disability_id: string
          entered_by_name: string | null
          entered_on: string | null
          guardian_consent_date: string | null
          guardian_consent_given: boolean | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          hours_per_month: number | null
          how_heard_id: string | null
          how_heard_other: string | null
          id: string
          municipality_id: string
          nationality_id: string
          neighbourhood_id: string
          occupation_status_id: string | null
          person_id: string
          phone_alternative: string | null
          prior_experience_id: string | null
          prior_experience_other: string | null
          reference: string | null
          reg_channel_id: string
          reg_date: string
          registered_by_name: string | null
          registered_by_organisation: string | null
          registered_by_position: string | null
          registered_on: string | null
          safety_commitment: boolean
          safety_commitment_recorded_by: string | null
          safety_commitment_recorded_on: string | null
          signed_by: string | null
          signed_on: string | null
          transport_id: string
          updated_at: string
        }
        Insert: {
          affiliation_id: string
          affiliation_other?: string | null
          client_uuid?: string | null
          consent_data: boolean
          consent_data_recorded_by?: string | null
          consent_data_recorded_on?: string | null
          consent_photo: boolean
          consent_photo_recorded_by?: string | null
          consent_photo_recorded_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id: string
          entered_by_name?: string | null
          entered_on?: string | null
          guardian_consent_date?: string | null
          guardian_consent_given?: boolean | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          hours_per_month?: number | null
          how_heard_id?: string | null
          how_heard_other?: string | null
          id?: string
          municipality_id?: string
          nationality_id: string
          neighbourhood_id: string
          occupation_status_id?: string | null
          person_id: string
          phone_alternative?: string | null
          prior_experience_id?: string | null
          prior_experience_other?: string | null
          reference?: string | null
          reg_channel_id: string
          reg_date: string
          registered_by_name?: string | null
          registered_by_organisation?: string | null
          registered_by_position?: string | null
          registered_on?: string | null
          safety_commitment: boolean
          safety_commitment_recorded_by?: string | null
          safety_commitment_recorded_on?: string | null
          signed_by?: string | null
          signed_on?: string | null
          transport_id: string
          updated_at?: string
        }
        Update: {
          affiliation_id?: string
          affiliation_other?: string | null
          client_uuid?: string | null
          consent_data?: boolean
          consent_data_recorded_by?: string | null
          consent_data_recorded_on?: string | null
          consent_photo?: boolean
          consent_photo_recorded_by?: string | null
          consent_photo_recorded_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          disability_id?: string
          entered_by_name?: string | null
          entered_on?: string | null
          guardian_consent_date?: string | null
          guardian_consent_given?: boolean | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          hours_per_month?: number | null
          how_heard_id?: string | null
          how_heard_other?: string | null
          id?: string
          municipality_id?: string
          nationality_id?: string
          neighbourhood_id?: string
          occupation_status_id?: string | null
          person_id?: string
          phone_alternative?: string | null
          prior_experience_id?: string | null
          prior_experience_other?: string | null
          reference?: string | null
          reg_channel_id?: string
          reg_date?: string
          registered_by_name?: string | null
          registered_by_organisation?: string | null
          registered_by_position?: string | null
          registered_on?: string | null
          safety_commitment?: boolean
          safety_commitment_recorded_by?: string | null
          safety_commitment_recorded_on?: string | null
          signed_by?: string | null
          signed_on?: string | null
          transport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_volunteer_affiliation_id_fkey"
            columns: ["affiliation_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f2_affiliation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_disability_id_fkey"
            columns: ["disability_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_disability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_how_heard_id_fkey"
            columns: ["how_heard_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f2_how_heard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_neighbourhood"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_occupation_status_id_fkey"
            columns: ["occupation_status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f2_occupation_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_prior_experience_id_fkey"
            columns: ["prior_experience_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f2_prior_experience"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_reg_channel_id_fkey"
            columns: ["reg_channel_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f2_reg_channel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_f2_transport"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_volunteer_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_volunteer_option_volunteer_id_fkey"
            columns: ["volunteer_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_volunteer"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_volunteer_participation: {
        Row: {
          action_day_id: string | null
          activity_id: string | null
          campaign_id: string | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          hours: number | null
          id: string
          kind: string
          market_id: string | null
          municipality_id: string
          notes: string | null
          participated_on: string
          reference_text: string | null
          updated_at: string
          verified: boolean
          volunteer_id: string
        }
        Insert: {
          action_day_id?: string | null
          activity_id?: string | null
          campaign_id?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hours?: number | null
          id?: string
          kind: string
          market_id?: string | null
          municipality_id?: string
          notes?: string | null
          participated_on: string
          reference_text?: string | null
          updated_at?: string
          verified?: boolean
          volunteer_id: string
        }
        Update: {
          action_day_id?: string | null
          activity_id?: string | null
          campaign_id?: string | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          hours?: number | null
          id?: string
          kind?: string
          market_id?: string | null
          municipality_id?: string
          notes?: string | null
          participated_on?: string
          reference_text?: string | null
          updated_at?: string
          verified?: boolean
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_volunteer_participation_action_day_id_fkey"
            columns: ["action_day_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_action_day"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_volunteer_participation_activity_id_fkey"
            columns: ["activity_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_activity"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_volunteer_participation_campaign_id_fkey"
            columns: ["campaign_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_campaign"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_volunteer_participation_market_id_fkey"
            columns: ["market_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_market"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "khld_volunteer_participation_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_participation_volunteer_id_fkey"
            columns: ["volunteer_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_volunteer"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_volunteer_tracking: {
        Row: {
          client_uuid: string | null
          continue_intent_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          inactive_reason_id: string | null
          inactive_reason_other: string | null
          leadership_role_id: string | null
          leadership_role_other: string | null
          municipality_id: string
          notes: string | null
          period_from: string
          period_to: string | null
          recognition_given_id: string
          recognition_given_other: string | null
          status_end_period_id: string
          updated_at: string
          verified_by_name: string | null
          verified_on: string | null
          volunteer_id: string
        }
        Insert: {
          client_uuid?: string | null
          continue_intent_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          inactive_reason_id?: string | null
          inactive_reason_other?: string | null
          leadership_role_id?: string | null
          leadership_role_other?: string | null
          municipality_id?: string
          notes?: string | null
          period_from: string
          period_to?: string | null
          recognition_given_id: string
          recognition_given_other?: string | null
          status_end_period_id: string
          updated_at?: string
          verified_by_name?: string | null
          verified_on?: string | null
          volunteer_id: string
        }
        Update: {
          client_uuid?: string | null
          continue_intent_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          inactive_reason_id?: string | null
          inactive_reason_other?: string | null
          leadership_role_id?: string | null
          leadership_role_other?: string | null
          municipality_id?: string
          notes?: string | null
          period_from?: string
          period_to?: string | null
          recognition_given_id?: string
          recognition_given_other?: string | null
          status_end_period_id?: string
          updated_at?: string
          verified_by_name?: string | null
          verified_on?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_volunteer_tracking_continue_intent_id_fkey"
            columns: ["continue_intent_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so30_continue_intent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_tracking_inactive_reason_id_fkey"
            columns: ["inactive_reason_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so30_inactive_reason"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_tracking_leadership_role_id_fkey"
            columns: ["leadership_role_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so30_leadership_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_tracking_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_tracking_recognition_given_id_fkey"
            columns: ["recognition_given_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so30_recognition_given"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_tracking_status_end_period_id_fkey"
            columns: ["status_end_period_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_so30_status_end_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_volunteer_tracking_volunteer_id_fkey"
            columns: ["volunteer_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_volunteer"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_volunteer_tracking_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          tracking_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          tracking_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_volunteer_tracking_option_tracking_id_fkey"
            columns: ["tracking_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_volunteer_tracking"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      khld_works_item: {
        Row: {
          accessibility_met_id: string
          accessibility_met_other: string | null
          actual_start: string | null
          addition_justification: string | null
          client_uuid: string | null
          completed_on: string | null
          cost_jod: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          facility_type_id: string
          facility_type_other: string | null
          handover_id: string
          handover_other: string | null
          id: string
          maintenance_owner_id: string
          maintenance_owner_other: string | null
          modality_id: string
          municipality_id: string
          on_priority_list_id: string
          planned_start: string
          priority_rank: number | null
          quantity: string | null
          quantity_unit: string | null
          reference: string | null
          remarks: string | null
          report_date: string
          safety_by_name: string | null
          safety_check_id: string
          safety_on: string | null
          status_id: string
          status_other: string | null
          updated_at: string
          verified_by_name: string | null
          verified_on: string | null
        }
        Insert: {
          accessibility_met_id: string
          accessibility_met_other?: string | null
          actual_start?: string | null
          addition_justification?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          cost_jod: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          facility_type_id: string
          facility_type_other?: string | null
          handover_id: string
          handover_other?: string | null
          id?: string
          maintenance_owner_id: string
          maintenance_owner_other?: string | null
          modality_id: string
          municipality_id?: string
          on_priority_list_id: string
          planned_start: string
          priority_rank?: number | null
          quantity?: string | null
          quantity_unit?: string | null
          reference?: string | null
          remarks?: string | null
          report_date: string
          safety_by_name?: string | null
          safety_check_id: string
          safety_on?: string | null
          status_id: string
          status_other?: string | null
          updated_at?: string
          verified_by_name?: string | null
          verified_on?: string | null
        }
        Update: {
          accessibility_met_id?: string
          accessibility_met_other?: string | null
          actual_start?: string | null
          addition_justification?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          cost_jod?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          facility_type_id?: string
          facility_type_other?: string | null
          handover_id?: string
          handover_other?: string | null
          id?: string
          maintenance_owner_id?: string
          maintenance_owner_other?: string | null
          modality_id?: string
          municipality_id?: string
          on_priority_list_id?: string
          planned_start?: string
          priority_rank?: number | null
          quantity?: string | null
          quantity_unit?: string | null
          reference?: string | null
          remarks?: string | null
          report_date?: string
          safety_by_name?: string | null
          safety_check_id?: string
          safety_on?: string | null
          status_id?: string
          status_other?: string | null
          updated_at?: string
          verified_by_name?: string | null
          verified_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khld_works_item_accessibility_met_id_fkey"
            columns: ["accessibility_met_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_accessibility_met"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_facility_type_id_fkey"
            columns: ["facility_type_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_facility_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_handover"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_maintenance_owner_id_fkey"
            columns: ["maintenance_owner_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_maintenance_owner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_modality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_on_priority_list_id_fkey"
            columns: ["on_priority_list_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_on_priority_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_safety_check_id_fkey"
            columns: ["safety_check_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_safety_check"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "khld_works_item_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ref_khld_c1_status"
            referencedColumns: ["id"]
          }
        ]
      }
      khld_works_item_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          works_item_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          works_item_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          works_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khld_works_item_option_works_item_id_fkey"
            columns: ["works_item_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "khld_works_item"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      linkage_request: {
        Row: {
          activity_type_id: string
          client_uuid: string | null
          closed_reason: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          initiative_title: string
          main_product: string | null
          matched_initiative_id: string | null
          matched_linkage_id: string | null
          municipality_id: string
          person_id: string
          request: string
          requested_on: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["linkage_request_status_t"]
          updated_at: string
        }
        Insert: {
          activity_type_id: string
          client_uuid?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_title: string
          main_product?: string | null
          matched_initiative_id?: string | null
          matched_linkage_id?: string | null
          municipality_id?: string
          person_id: string
          request: string
          requested_on?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["linkage_request_status_t"]
          updated_at?: string
        }
        Update: {
          activity_type_id?: string
          client_uuid?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          initiative_title?: string
          main_product?: string | null
          matched_initiative_id?: string | null
          matched_linkage_id?: string | null
          municipality_id?: string
          person_id?: string
          request?: string
          requested_on?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["linkage_request_status_t"]
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
            foreignKeyName: "linkage_request_initiative_municipality_fkey"
            columns: ["matched_initiative_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_linkage_municipality_fkey"
            columns: ["matched_linkage_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "market_linkage"
            referencedColumns: ["id", "municipality_id"]
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
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkage_request_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
            foreignKeyName: "market_linkage_initiative_municipality_fkey"
            columns: ["initiative_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_linkage_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_linkage_partnership_municipality_fkey"
            columns: ["partnership_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id", "municipality_id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
          {
            foreignKeyName: "mentorship_session_initiative_municipality_fkey"
            columns: ["initiative_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "production_initiative"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      municipality: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name_ar: string | null
          name_en: string
          programme_ar: string | null
          programme_en: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en: string
          programme_ar?: string | null
          programme_en?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name_ar?: string | null
          name_en?: string
          programme_ar?: string | null
          programme_en?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      objective: {
        Row: {
          code: string
          created_at: string
          id: string
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          name_ar?: string | null
          name_en?: string
          result_statement_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      office_service: {
        Row: {
          adviser: string | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          notes?: string | null
          person_id?: string
          service_date?: string
          service_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_service_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_service_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "ref_office_service_type"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          name?: string
          phone?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          partnership_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contribution_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contribution_partnership_municipality_fkey"
            columns: ["partnership_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id", "municipality_id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          partner_id?: string
          partner_type_id?: string
          partner_type_other?: string | null
          partnership_type?: Database["public"]["Enums"]["partnership_type_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_partner_municipality_fkey"
            columns: ["partner_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "partner"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      partnership_role: {
        Row: {
          created_at: string
          municipality_id: string
          partnership_id: string
          role_id: string
          role_other: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          partnership_id: string
          role_id: string
          role_other?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          partnership_id?: string
          role_id?: string
          role_other?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_role_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_role_partnership_municipality_fkey"
            columns: ["partnership_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      person: {
        Row: {
          age_recorded: number | null
          age_unrecorded_reason: string | null
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
          national_id: string | null
          nationality_id: string | null
          notes: string | null
          phone: string | null
          sex: Database["public"]["Enums"]["sex_t"] | null
          unhcr_number: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          age_recorded?: number | null
          age_unrecorded_reason?: string | null
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
          national_id?: string | null
          nationality_id?: string | null
          notes?: string | null
          phone?: string | null
          sex?: Database["public"]["Enums"]["sex_t"] | null
          unhcr_number?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          age_recorded?: number | null
          age_unrecorded_reason?: string | null
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
          national_id?: string | null
          nationality_id?: string | null
          notes?: string | null
          phone?: string | null
          sex?: Database["public"]["Enums"]["sex_t"] | null
          unhcr_number?: string | null
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
          }
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
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_initiative_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
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
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
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
      ref_compliance_obstacle: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
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
      ref_khld_a1_coordinator_assigned: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_council_decision: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_partnerships_concluded: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_periodic_updates: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_stakeholder_count: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_tracking_format: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_verif_round: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a1_zaha_coordination: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_attendees_breakdown: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_contributions_pledged: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_convened_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_meeting_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_minutes_prepared: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_new_partners: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_orgs_by_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_pillars_discussed: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_prev_followup: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a2_venue: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_acknowledged: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_conditions: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_contribution_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_contributor_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_csr_linked: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_first_contribution: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_municipal_acceptance: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_source_meeting: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_supports_objective: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_a3_valuation_basis: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_age_group: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_agree_scale: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_b1_activity_calendar: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_b1_calendar_horizon: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_b1_communicated: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_b1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_b1_protocol_exists: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_accessibility_met: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_facility_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_handover: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_identified_how: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_maintenance_owner: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_modality: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_on_priority_list: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_resource_source: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_safety_check: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c1_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_focus: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_is_first_campaign: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_lead_organiser: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_linked_item: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_municipal_supervision: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_recognition: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_safety_briefing: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_school_linked: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_c2_volunteers_breakdown: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_checklist_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_activity_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_announcement: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_calendar_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_content_provider: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_feedback_collected: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_frequency_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_inclusion_measures: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_issues: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_location: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_organiser: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d1_target_group: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_by_age_sex: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_by_nationality: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_by_sex: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_consent_informed: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_count_method: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_duplicate_check: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_photo_consent: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_d2_register_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_disability: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_coordinator_elected: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_duplication_avoided: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_formal_recognition: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_inclusive_representation: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_meeting_cycle: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_members_by_sex: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_members_by_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_municipal_focal: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_outputs_delivered: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_tasks_covered: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_e1_written_tasks: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_database_established: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_database_format: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_focal_point: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_minors_arrangements: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_procedures_approved: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_recognition_scheme: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_recruitment_channels: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f1_safety_arrangements: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_affiliation: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_availability_days: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_availability_times: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_how_heard: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_interests: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_occupation_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_prior_experience: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_reg_channel: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_skills: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_support_needs: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f2_transport: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_called_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_linked_records: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_location: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_recognition: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_refreshments: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_roles_used: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_safety: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_theme: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_volunteer_feedback: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_f3_volunteers_breakdown: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_certificate: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_cycle_year: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_enterprise_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_further_needs: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_most_useful: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_non_completion_reason: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_peer_network: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_provider: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_referral_made: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_s3_hygiene: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g1_venue: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g2_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g2_licensing_progress: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g2_priority_group: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g2_providers: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g2_status_last_contact: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g2_sup_hygiene: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_g2_sup_referral_outcome: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_accessibility: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_announcement: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_cost_source: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_evidence_attached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_feedback_collected: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_hygiene_check: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_issues: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_location: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_occasion: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_organisers: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_parallel_activities: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_phase: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_priority_share: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_refreshment_point: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_selection_method: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_services_provided: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_total_sales_method: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h1_visitors_method: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_attended: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_commitment_signed: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_consent: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_equipment_provided: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_health_certificate: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_licensed: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_nominated_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_priority_flags: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_h2_vendor_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_accompanied_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_activities_taken: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_barriers: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_comfort_level: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_consent: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_has_children: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_int_place: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_joint_activity: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_mixed_presence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_new_contact: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_relations_change: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_survey_round: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_imp0_visit_freq: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_incident: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_nationality: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_neighbourhood: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_partner_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_product_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_recontact: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_sales_band: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_session_attendance: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_sex: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_areas_involved: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_continue_intent: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_duplication: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_evidence_ref: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_focal_point: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_obstacles: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_overall_rating: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so10_survey_round: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_activity_suitable: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_collection_mode: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_facility_item: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_facility_rating: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_feel_safe: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_how_heard: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_overall_satisfaction: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_participate_freely: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_suitable_women_children: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_timing_convenient: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so20_would_return: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_activity_types: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_continue_intent: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_inactive_reason: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_leadership_role: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_recognition_given: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_status_end_period: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_verified_against: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so30_what_would_help: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_additional_support: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_exposure: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_first_organised_market: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_guidance_received: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_improvements_wanted: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_made_sales: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_market_constraints: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_mode: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_new_channels: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_new_customers: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_overall_opportunity: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_participate_again: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_production_change: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_repeat_orders: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_respondent_is_vendor: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_sold_before_market: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_still_active: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_so40_stop_reason: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_khld_yes_fully_partly_no: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_market_improvement: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
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
      ref_nonapply_reason: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
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
      ref_practice_change: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
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
      ref_rmth_a12_event_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_a12_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_a12_organised_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_a12_partner_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_a13_delivered_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_a13_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_a13_target_group: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_a13_topic: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_assessment_result: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b1_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b1_implementer_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b1_operating_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b1_reached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b11_developed_with: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b11_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b11_modality: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b11_requirements_method: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b11_specialisation: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b12_approving_body: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b12_decision: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b12_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b12_submitter_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_b12_support_requested: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c11_academic_contribution: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c11_academic_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c11_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c11_joint_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c11_modality: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c11_private_contribution: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c11_sector: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c12_employer_evaluation: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c12_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_c12_training_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_c1: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_c2: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_c3: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_c4: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_field: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_host: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_partner_role: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_service: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e01_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e02_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e02_sector: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e02_service: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e02_stage: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e02_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e03_delivered_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e03_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e03_module: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_e03_org_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f01_enterprise_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f01_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f01_module: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f01_sector: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f01_training_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_complete: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_content_basis: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_developed_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_group: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_level: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_material: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_module: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_partner_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_f02_sector: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_imp0_capacity: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_imp0_criterion: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_imp0_engaged: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_imp0_pathway: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_imp0_round: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_imp0_stop_reason: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_imp0_verification: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_modality_ipob: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_nationality: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_project_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_reached: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_sector: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so10_current_status: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so10_event_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so10_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so10_other_step: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so10_threshold: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so10_verifiable_step: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so20_arrangement: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so20_facilitated_by: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so20_obstacle: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so20_outcome: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so20_placement_type: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so20_verification: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so20_working_time: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so2c1_evidence: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so2c1_headline: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so2c1_support_way: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so2c1_why_not: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so30_criterion: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so30_income_change: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so30_role: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so30_sector: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so30_stop_reason: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so30_support: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_so30_verification: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_support_component: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_support_rating: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_rmth_vulnerability: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
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
      ref_selling_barrier: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
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
      ref_stop_reason: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_support_need: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
          label_en?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ref_survey_activity: {
        Row: {
          allows_free_text: boolean
          code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          label_ar: string
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
          label_ar: string
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
          label_ar?: string
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
          municipality_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          end_date: string
          id?: string
          is_locked?: boolean
          municipality_id?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          end_date?: string
          id?: string
          is_locked?: boolean
          municipality_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_enterprise: {
        Row: {
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          municipality_id: string
          name: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          municipality_id?: string
          name: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          municipality_id?: string
          name?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_event: {
        Row: {
          age_18_24: number | null
          age_25_35: number | null
          age_36_45: number | null
          age_46_plus: number | null
          age_under_18: number | null
          attendees_disability: number | null
          attendees_men: number | null
          attendees_non_jordanian: number | null
          attendees_total: number | null
          attendees_women: number | null
          client_uuid: string | null
          completed_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivered_by_id: string | null
          delivered_by_other: string | null
          duration_hours: number | null
          employers_count: number | null
          end_date: string
          event_kind: string
          event_type_id: string | null
          event_type_other: string | null
          facilitator_name: string | null
          focal_point_name: string | null
          focal_point_phone: string | null
          id: string
          location: string | null
          modality_id: string | null
          municipality_id: string
          organised_by_id: string | null
          parent_event_id: string | null
          partner_names: string | null
          reference: string | null
          solely_guidance: boolean | null
          solely_guidance_decided_by: string | null
          solely_guidance_decided_on: string | null
          start_date: string
          target_group_id: string | null
          target_group_other: string | null
          title: string
          updated_at: string
        }
        Insert: {
          age_18_24?: number | null
          age_25_35?: number | null
          age_36_45?: number | null
          age_46_plus?: number | null
          age_under_18?: number | null
          attendees_disability?: number | null
          attendees_men?: number | null
          attendees_non_jordanian?: number | null
          attendees_total?: number | null
          attendees_women?: number | null
          client_uuid?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by_id?: string | null
          delivered_by_other?: string | null
          duration_hours?: number | null
          employers_count?: number | null
          end_date: string
          event_kind: string
          event_type_id?: string | null
          event_type_other?: string | null
          facilitator_name?: string | null
          focal_point_name?: string | null
          focal_point_phone?: string | null
          id?: string
          location?: string | null
          modality_id?: string | null
          municipality_id?: string
          organised_by_id?: string | null
          parent_event_id?: string | null
          partner_names?: string | null
          reference?: string | null
          solely_guidance?: boolean | null
          solely_guidance_decided_by?: string | null
          solely_guidance_decided_on?: string | null
          start_date: string
          target_group_id?: string | null
          target_group_other?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          age_18_24?: number | null
          age_25_35?: number | null
          age_36_45?: number | null
          age_46_plus?: number | null
          age_under_18?: number | null
          attendees_disability?: number | null
          attendees_men?: number | null
          attendees_non_jordanian?: number | null
          attendees_total?: number | null
          attendees_women?: number | null
          client_uuid?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivered_by_id?: string | null
          delivered_by_other?: string | null
          duration_hours?: number | null
          employers_count?: number | null
          end_date?: string
          event_kind?: string
          event_type_id?: string | null
          event_type_other?: string | null
          facilitator_name?: string | null
          focal_point_name?: string | null
          focal_point_phone?: string | null
          id?: string
          location?: string | null
          modality_id?: string | null
          municipality_id?: string
          organised_by_id?: string | null
          parent_event_id?: string | null
          partner_names?: string | null
          reference?: string | null
          solely_guidance?: boolean | null
          solely_guidance_decided_by?: string | null
          solely_guidance_decided_on?: string | null
          start_date?: string
          target_group_id?: string | null
          target_group_other?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_event_delivered_by_id_fkey"
            columns: ["delivered_by_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_a13_delivered_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_event_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_a12_event_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_event_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_modality_ipob"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_event_organised_by_id_fkey"
            columns: ["organised_by_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_a12_organised_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_event_parent_fkey"
            columns: ["parent_event_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_event"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_target_group_id_fkey"
            columns: ["target_group_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_a13_target_group"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_event_option: {
        Row: {
          created_at: string
          event_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          event_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          event_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_event_option_event_id_municipality_id_fkey"
            columns: ["event_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_event"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_implementer_support: {
        Row: {
          component_id: string
          component_other: string | null
          created_at: string
          implementer_id: string
          municipality_id: string
          rating_id: string
        }
        Insert: {
          component_id: string
          component_other?: string | null
          created_at?: string
          implementer_id: string
          municipality_id?: string
          rating_id: string
        }
        Update: {
          component_id?: string
          component_other?: string | null
          created_at?: string
          implementer_id?: string
          municipality_id?: string
          rating_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_implementer_support_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_support_component"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_implementer_support_implementer_id_municipality_id_fkey"
            columns: ["implementer_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_project_implementer"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_implementer_support_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_support_rating"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_incubation_service: {
        Row: {
          admitted_on: string
          age_years: number | null
          client_uuid: string | null
          completed_on: string | null
          counted_under_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          enterprise_id: string | null
          focal_point_name: string | null
          id: string
          incubator_id: string
          municipality_id: string
          nationality_id: string | null
          nationality_other: string | null
          person_id: string
          sector_id: string | null
          sector_other: string | null
          stage_id: string | null
          status_id: string | null
          updated_at: string
        }
        Insert: {
          admitted_on: string
          age_years?: number | null
          client_uuid?: string | null
          completed_on?: string | null
          counted_under_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enterprise_id?: string | null
          focal_point_name?: string | null
          id?: string
          incubator_id: string
          municipality_id?: string
          nationality_id?: string | null
          nationality_other?: string | null
          person_id: string
          sector_id?: string | null
          sector_other?: string | null
          stage_id?: string | null
          status_id?: string | null
          updated_at?: string
        }
        Update: {
          admitted_on?: string
          age_years?: number | null
          client_uuid?: string | null
          completed_on?: string | null
          counted_under_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enterprise_id?: string | null
          focal_point_name?: string | null
          id?: string
          incubator_id?: string
          municipality_id?: string
          nationality_id?: string | null
          nationality_other?: string | null
          person_id?: string
          sector_id?: string | null
          sector_other?: string | null
          stage_id?: string | null
          status_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_incubation_service_counted_under_fkey"
            columns: ["counted_under_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_incubation_service"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_enterprise_fkey"
            columns: ["enterprise_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_enterprise"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_incubator_fkey"
            columns: ["incubator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_incubator"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e02_sector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e02_stage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e02_status"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_incubation_service_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          service_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          service_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_incubation_service_option_service_id_municipality_id_fkey"
            columns: ["service_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_incubation_service"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_incubator: {
        Row: {
          achieved_on: string | null
          c1_date: string | null
          c1_id: string | null
          c1_location: string | null
          c2_date: string | null
          c2_id: string | null
          c2_reference: string | null
          c3_date: string | null
          c3_id: string | null
          c4_id: string | null
          c4_staff_count: number | null
          client_uuid: string | null
          completed_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          established_id: string | null
          established_id_decided_by: string | null
          established_id_decided_on: string | null
          established_other: string | null
          field_id: string | null
          field_other: string | null
          first_cohort_admitted: boolean | null
          first_cohort_count: number | null
          first_cohort_date: string | null
          host_id: string | null
          id: string
          municipality_id: string
          name: string
          partner_private: string | null
          partner_university: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          achieved_on?: string | null
          c1_date?: string | null
          c1_id?: string | null
          c1_location?: string | null
          c2_date?: string | null
          c2_id?: string | null
          c2_reference?: string | null
          c3_date?: string | null
          c3_id?: string | null
          c4_id?: string | null
          c4_staff_count?: number | null
          client_uuid?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          established_id?: string | null
          established_id_decided_by?: string | null
          established_id_decided_on?: string | null
          established_other?: string | null
          field_id?: string | null
          field_other?: string | null
          first_cohort_admitted?: boolean | null
          first_cohort_count?: number | null
          first_cohort_date?: string | null
          host_id?: string | null
          id?: string
          municipality_id?: string
          name: string
          partner_private?: string | null
          partner_university?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          achieved_on?: string | null
          c1_date?: string | null
          c1_id?: string | null
          c1_location?: string | null
          c2_date?: string | null
          c2_id?: string | null
          c2_reference?: string | null
          c3_date?: string | null
          c3_id?: string | null
          c4_id?: string | null
          c4_staff_count?: number | null
          client_uuid?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          established_id?: string | null
          established_id_decided_by?: string | null
          established_id_decided_on?: string | null
          established_other?: string | null
          field_id?: string | null
          field_other?: string | null
          first_cohort_admitted?: boolean | null
          first_cohort_count?: number | null
          first_cohort_date?: string | null
          host_id?: string | null
          id?: string
          municipality_id?: string
          name?: string
          partner_private?: string | null
          partner_university?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_incubator_c1_id_fkey"
            columns: ["c1_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_c1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubator_c2_id_fkey"
            columns: ["c2_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_c2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubator_c3_id_fkey"
            columns: ["c3_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_c3"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubator_c4_id_fkey"
            columns: ["c4_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_c4"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubator_established_id_fkey"
            columns: ["established_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubator_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_field"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubator_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_host"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_incubator_option: {
        Row: {
          created_at: string
          incubator_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          incubator_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          incubator_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_incubator_option_incubator_id_municipality_id_fkey"
            columns: ["incubator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_incubator"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_incubator_service_live: {
        Row: {
          began_on: string | null
          created_at: string
          incubator_id: string
          municipality_id: string
          service_id: string
        }
        Insert: {
          began_on?: string | null
          created_at?: string
          incubator_id: string
          municipality_id?: string
          service_id: string
        }
        Update: {
          began_on?: string | null
          created_at?: string
          incubator_id?: string
          municipality_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_incubator_service_live_incubator_id_municipality_id_fkey"
            columns: ["incubator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_incubator"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_service_live_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e01_service"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_outcome_survey: {
        Row: {
          age_years: number | null
          arrangement_id: string | null
          capacity_id: string | null
          client_uuid: string | null
          consecutive_months: number | null
          contact_date: string | null
          counted_under_id: string | null
          created_at: string
          created_by: string | null
          current_status_id: string | null
          cycle_id: string | null
          deleted_at: string | null
          earning_since_month: string | null
          employer_name: string | null
          employer_sector: string | null
          engaged_id: string | null
          enterprise_id: string | null
          enterprise_name: string | null
          enumerator_name: string | null
          event_id: string | null
          facilitated_by_id: string | null
          first_access_month: string | null
          headline_id: string | null
          id: string
          imp0_criterion_id: string | null
          imp0_stop_reason_id: string | null
          imp0_stop_reason_other: string | null
          income_change_id: string | null
          income_stopped_month: string | null
          incubator_id: string | null
          months_of_six: number | null
          municipality_id: string
          nationality_id: string | null
          nationality_other: string | null
          obstacle_id: string | null
          obstacle_other: string | null
          other_events: string | null
          pathway_cycle_id: string | null
          pathway_enterprise_id: string | null
          pathway_event_id: string | null
          pathway_id: string | null
          pathway_incubator_id: string | null
          pathway_other: string | null
          pathway_proposal_id: string | null
          person_id: string
          placement_start_month: string | null
          placement_title: string | null
          programme_id: string | null
          reached_id: string | null
          role_id: string | null
          round_id: string | null
          so10_event_type_id: string | null
          so10_threshold_id: string | null
          so20_outcome_id: string | null
          so30_criterion_id: string | null
          so30_sector_id: string | null
          so30_sector_other: string | null
          so30_stop_reason_id: string | null
          so30_stop_reason_other: string | null
          stopped_month: string | null
          survey_kind: string
          three_month_reached: boolean | null
          updated_at: string
          why_not_id: string | null
          why_not_other: string | null
          working_time_id: string | null
        }
        Insert: {
          age_years?: number | null
          arrangement_id?: string | null
          capacity_id?: string | null
          client_uuid?: string | null
          consecutive_months?: number | null
          contact_date?: string | null
          counted_under_id?: string | null
          created_at?: string
          created_by?: string | null
          current_status_id?: string | null
          cycle_id?: string | null
          deleted_at?: string | null
          earning_since_month?: string | null
          employer_name?: string | null
          employer_sector?: string | null
          engaged_id?: string | null
          enterprise_id?: string | null
          enterprise_name?: string | null
          enumerator_name?: string | null
          event_id?: string | null
          facilitated_by_id?: string | null
          first_access_month?: string | null
          headline_id?: string | null
          id?: string
          imp0_criterion_id?: string | null
          imp0_stop_reason_id?: string | null
          imp0_stop_reason_other?: string | null
          income_change_id?: string | null
          income_stopped_month?: string | null
          incubator_id?: string | null
          months_of_six?: number | null
          municipality_id?: string
          nationality_id?: string | null
          nationality_other?: string | null
          obstacle_id?: string | null
          obstacle_other?: string | null
          other_events?: string | null
          pathway_cycle_id?: string | null
          pathway_enterprise_id?: string | null
          pathway_event_id?: string | null
          pathway_id?: string | null
          pathway_incubator_id?: string | null
          pathway_other?: string | null
          pathway_proposal_id?: string | null
          person_id: string
          placement_start_month?: string | null
          placement_title?: string | null
          programme_id?: string | null
          reached_id?: string | null
          role_id?: string | null
          round_id?: string | null
          so10_event_type_id?: string | null
          so10_threshold_id?: string | null
          so20_outcome_id?: string | null
          so30_criterion_id?: string | null
          so30_sector_id?: string | null
          so30_sector_other?: string | null
          so30_stop_reason_id?: string | null
          so30_stop_reason_other?: string | null
          stopped_month?: string | null
          survey_kind: string
          three_month_reached?: boolean | null
          updated_at?: string
          why_not_id?: string | null
          why_not_other?: string | null
          working_time_id?: string | null
        }
        Update: {
          age_years?: number | null
          arrangement_id?: string | null
          capacity_id?: string | null
          client_uuid?: string | null
          consecutive_months?: number | null
          contact_date?: string | null
          counted_under_id?: string | null
          created_at?: string
          created_by?: string | null
          current_status_id?: string | null
          cycle_id?: string | null
          deleted_at?: string | null
          earning_since_month?: string | null
          employer_name?: string | null
          employer_sector?: string | null
          engaged_id?: string | null
          enterprise_id?: string | null
          enterprise_name?: string | null
          enumerator_name?: string | null
          event_id?: string | null
          facilitated_by_id?: string | null
          first_access_month?: string | null
          headline_id?: string | null
          id?: string
          imp0_criterion_id?: string | null
          imp0_stop_reason_id?: string | null
          imp0_stop_reason_other?: string | null
          income_change_id?: string | null
          income_stopped_month?: string | null
          incubator_id?: string | null
          months_of_six?: number | null
          municipality_id?: string
          nationality_id?: string | null
          nationality_other?: string | null
          obstacle_id?: string | null
          obstacle_other?: string | null
          other_events?: string | null
          pathway_cycle_id?: string | null
          pathway_enterprise_id?: string | null
          pathway_event_id?: string | null
          pathway_id?: string | null
          pathway_incubator_id?: string | null
          pathway_other?: string | null
          pathway_proposal_id?: string | null
          person_id?: string
          placement_start_month?: string | null
          placement_title?: string | null
          programme_id?: string | null
          reached_id?: string | null
          role_id?: string | null
          round_id?: string | null
          so10_event_type_id?: string | null
          so10_threshold_id?: string | null
          so20_outcome_id?: string | null
          so30_criterion_id?: string | null
          so30_sector_id?: string | null
          so30_sector_other?: string | null
          so30_stop_reason_id?: string | null
          so30_stop_reason_other?: string | null
          stopped_month?: string | null
          survey_kind?: string
          three_month_reached?: boolean | null
          updated_at?: string
          why_not_id?: string | null
          why_not_other?: string | null
          working_time_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rmth_outcome_survey_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so20_arrangement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_capacity_id_fkey"
            columns: ["capacity_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_imp0_capacity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_counted_under_fkey"
            columns: ["counted_under_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_outcome_survey"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_current_status_id_fkey"
            columns: ["current_status_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so10_current_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_cycle_fkey"
            columns: ["cycle_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_cycle"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_engaged_id_fkey"
            columns: ["engaged_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_imp0_engaged"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_enterprise_fkey"
            columns: ["enterprise_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_enterprise"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_event_fkey"
            columns: ["event_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_event"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_facilitated_by_id_fkey"
            columns: ["facilitated_by_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so20_facilitated_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_headline_id_fkey"
            columns: ["headline_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so2c1_headline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_imp0_criterion_id_fkey"
            columns: ["imp0_criterion_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_imp0_criterion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_imp0_stop_reason_id_fkey"
            columns: ["imp0_stop_reason_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_imp0_stop_reason"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_income_change_id_fkey"
            columns: ["income_change_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so30_income_change"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_incubator_fkey"
            columns: ["incubator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_incubator"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_obstacle_id_fkey"
            columns: ["obstacle_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so20_obstacle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_pathway_cycle_fkey"
            columns: ["pathway_cycle_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_cycle"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_pathway_enterprise_fkey"
            columns: ["pathway_enterprise_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_enterprise"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_pathway_event_fkey"
            columns: ["pathway_event_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_event"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_imp0_pathway"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_pathway_incubator_fkey"
            columns: ["pathway_incubator_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_incubator"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_pathway_proposal_fkey"
            columns: ["pathway_proposal_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_proposal"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_programme_fkey"
            columns: ["programme_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_programme"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_reached_id_fkey"
            columns: ["reached_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_reached"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so30_role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_imp0_round"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_so10_event_type_id_fkey"
            columns: ["so10_event_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so10_event_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_so10_threshold_id_fkey"
            columns: ["so10_threshold_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so10_threshold"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_so20_outcome_id_fkey"
            columns: ["so20_outcome_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so20_outcome"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_so30_criterion_id_fkey"
            columns: ["so30_criterion_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so30_criterion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_so30_sector_id_fkey"
            columns: ["so30_sector_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so30_sector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_so30_stop_reason_id_fkey"
            columns: ["so30_stop_reason_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so30_stop_reason"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_why_not_id_fkey"
            columns: ["why_not_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so2c1_why_not"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_working_time_id_fkey"
            columns: ["working_time_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_so20_working_time"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_outcome_survey_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
          survey_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_outcome_survey_option_survey_id_municipality_id_fkey"
            columns: ["survey_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_outcome_survey"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_project_implementer: {
        Row: {
          any_essential: boolean | null
          client_uuid: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          enters_denominator: boolean | null
          entity_name: string
          entity_type_id: string | null
          enumerator_name: string | null
          first_record_of_id: string | null
          id: string
          interviewed_on: string | null
          most_essential_component_id: string | null
          municipality_id: string
          operating_status_id: string | null
          project_titles: string | null
          project_type_id: string | null
          project_type_other: string | null
          reached_id: string | null
          received_any: boolean | null
          respondent_name: string | null
          respondent_phone: string | null
          respondent_role: string | null
          sector_id: string | null
          sector_other: string | null
          updated_at: string
          would_have_helped: string | null
        }
        Insert: {
          any_essential?: boolean | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enters_denominator?: boolean | null
          entity_name: string
          entity_type_id?: string | null
          enumerator_name?: string | null
          first_record_of_id?: string | null
          id?: string
          interviewed_on?: string | null
          most_essential_component_id?: string | null
          municipality_id?: string
          operating_status_id?: string | null
          project_titles?: string | null
          project_type_id?: string | null
          project_type_other?: string | null
          reached_id?: string | null
          received_any?: boolean | null
          respondent_name?: string | null
          respondent_phone?: string | null
          respondent_role?: string | null
          sector_id?: string | null
          sector_other?: string | null
          updated_at?: string
          would_have_helped?: string | null
        }
        Update: {
          any_essential?: boolean | null
          client_uuid?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          enters_denominator?: boolean | null
          entity_name?: string
          entity_type_id?: string | null
          enumerator_name?: string | null
          first_record_of_id?: string | null
          id?: string
          interviewed_on?: string | null
          most_essential_component_id?: string | null
          municipality_id?: string
          operating_status_id?: string | null
          project_titles?: string | null
          project_type_id?: string | null
          project_type_other?: string | null
          reached_id?: string | null
          received_any?: boolean | null
          respondent_name?: string | null
          respondent_phone?: string | null
          respondent_role?: string | null
          sector_id?: string | null
          sector_other?: string | null
          updated_at?: string
          would_have_helped?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rmth_project_implementer_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b1_implementer_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_first_record_fkey"
            columns: ["first_record_of_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_project_implementer"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_most_essential_component_id_fkey"
            columns: ["most_essential_component_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_support_component"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_operating_status_id_fkey"
            columns: ["operating_status_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b1_operating_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_project_type_id_fkey"
            columns: ["project_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_project_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_reached_id_fkey"
            columns: ["reached_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b1_reached"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_sector"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_project_implementer_option: {
        Row: {
          created_at: string
          implementer_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          implementer_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          implementer_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_project_implementer_opti_implementer_id_municipality__fkey"
            columns: ["implementer_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_project_implementer"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_project_implementer_proposal: {
        Row: {
          created_at: string
          implementer_id: string
          municipality_id: string
          proposal_id: string
        }
        Insert: {
          created_at?: string
          implementer_id: string
          municipality_id?: string
          proposal_id: string
        }
        Update: {
          created_at?: string
          implementer_id?: string
          municipality_id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_project_implementer_prop_implementer_id_municipality__fkey"
            columns: ["implementer_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_project_implementer"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_propo_proposal_id_municipality_id_fkey"
            columns: ["proposal_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_proposal"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_proposal: {
        Row: {
          approving_body_id: string | null
          client_uuid: string | null
          completed_on: string | null
          conditions: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          decided_on: string | null
          decision_id: string | null
          decision_reference: string | null
          deleted_at: string | null
          first_approved_on: string | null
          id: string
          municipality_id: string
          proposal_type_id: string | null
          proposal_type_other: string | null
          reference: string | null
          sector_id: string | null
          sector_other: string | null
          sub_sector: string | null
          submitted_by_name: string
          submitted_on: string
          submitter_type_id: string
          title: string
          updated_at: string
        }
        Insert: {
          approving_body_id?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          conditions?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          decided_on?: string | null
          decision_id?: string | null
          decision_reference?: string | null
          deleted_at?: string | null
          first_approved_on?: string | null
          id?: string
          municipality_id?: string
          proposal_type_id?: string | null
          proposal_type_other?: string | null
          reference?: string | null
          sector_id?: string | null
          sector_other?: string | null
          sub_sector?: string | null
          submitted_by_name: string
          submitted_on: string
          submitter_type_id: string
          title: string
          updated_at?: string
        }
        Update: {
          approving_body_id?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          conditions?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          decided_on?: string | null
          decision_id?: string | null
          decision_reference?: string | null
          deleted_at?: string | null
          first_approved_on?: string | null
          id?: string
          municipality_id?: string
          proposal_type_id?: string | null
          proposal_type_other?: string | null
          reference?: string | null
          sector_id?: string | null
          sector_other?: string | null
          sub_sector?: string | null
          submitted_by_name?: string
          submitted_on?: string
          submitter_type_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_proposal_approving_body_id_fkey"
            columns: ["approving_body_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b12_approving_body"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_proposal_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b12_decision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_proposal_proposal_type_id_fkey"
            columns: ["proposal_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_project_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_proposal_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_sector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_proposal_submitter_type_id_fkey"
            columns: ["submitter_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b12_submitter_type"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_proposal_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          proposal_id: string
          question_code: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          proposal_id: string
          question_code: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          proposal_id?: string
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_proposal_option_proposal_id_municipality_id_fkey"
            columns: ["proposal_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_proposal"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_reference_counter: {
        Row: {
          last_no: number
          municipality_id: string
          prefix: string
          year: number
        }
        Insert: {
          last_no?: number
          municipality_id: string
          prefix: string
          year: number
        }
        Update: {
          last_no?: number
          municipality_id?: string
          prefix?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_threshold: {
        Row: {
          created_at: string
          created_by: string | null
          decided_by: string | null
          decided_on: string | null
          deleted_at: string | null
          id: string
          key: string
          label_ar: string
          label_en: string
          municipality_id: string
          note_ar: string
          note_en: string
          open_item: string
          unit: string | null
          updated_at: string
          value_bool: boolean | null
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_by?: string | null
          decided_on?: string | null
          deleted_at?: string | null
          id?: string
          key: string
          label_ar: string
          label_en: string
          municipality_id?: string
          note_ar: string
          note_en: string
          open_item: string
          unit?: string | null
          updated_at?: string
          value_bool?: boolean | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_by?: string | null
          decided_on?: string | null
          deleted_at?: string | null
          id?: string
          key?: string
          label_ar?: string
          label_en?: string
          municipality_id?: string
          note_ar?: string
          note_en?: string
          open_item?: string
          unit?: string | null
          updated_at?: string
          value_bool?: boolean | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_training_cycle: {
        Row: {
          academic_partner_names: string | null
          academic_type_id: string | null
          client_uuid: string | null
          completed_count: number | null
          completed_on: string | null
          completed_women: number | null
          contact_hours: number | null
          created_at: string
          created_by: string | null
          cycle_kind: string
          cycle_no: number | null
          deleted_at: string | null
          delivered_by_id: string | null
          delivered_by_other: string | null
          end_date: string
          enrolled_count: number | null
          hours_per_week: number | null
          id: string
          joint_development_met: boolean | null
          joint_development_met_decided_by: string | null
          joint_development_met_decided_on: string | null
          location: string | null
          modality_id: string | null
          municipality_id: string
          private_partner_names: string | null
          programme_id: string | null
          reference: string | null
          sector_id: string | null
          sector_other: string | null
          start_date: string
          title: string | null
          updated_at: string
          weeks: number | null
        }
        Insert: {
          academic_partner_names?: string | null
          academic_type_id?: string | null
          client_uuid?: string | null
          completed_count?: number | null
          completed_on?: string | null
          completed_women?: number | null
          contact_hours?: number | null
          created_at?: string
          created_by?: string | null
          cycle_kind: string
          cycle_no?: number | null
          deleted_at?: string | null
          delivered_by_id?: string | null
          delivered_by_other?: string | null
          end_date: string
          enrolled_count?: number | null
          hours_per_week?: number | null
          id?: string
          joint_development_met?: boolean | null
          joint_development_met_decided_by?: string | null
          joint_development_met_decided_on?: string | null
          location?: string | null
          modality_id?: string | null
          municipality_id?: string
          private_partner_names?: string | null
          programme_id?: string | null
          reference?: string | null
          sector_id?: string | null
          sector_other?: string | null
          start_date: string
          title?: string | null
          updated_at?: string
          weeks?: number | null
        }
        Update: {
          academic_partner_names?: string | null
          academic_type_id?: string | null
          client_uuid?: string | null
          completed_count?: number | null
          completed_on?: string | null
          completed_women?: number | null
          contact_hours?: number | null
          created_at?: string
          created_by?: string | null
          cycle_kind?: string
          cycle_no?: number | null
          deleted_at?: string | null
          delivered_by_id?: string | null
          delivered_by_other?: string | null
          end_date?: string
          enrolled_count?: number | null
          hours_per_week?: number | null
          id?: string
          joint_development_met?: boolean | null
          joint_development_met_decided_by?: string | null
          joint_development_met_decided_on?: string | null
          location?: string | null
          modality_id?: string | null
          municipality_id?: string
          private_partner_names?: string | null
          programme_id?: string | null
          reference?: string | null
          sector_id?: string | null
          sector_other?: string | null
          start_date?: string
          title?: string | null
          updated_at?: string
          weeks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rmth_training_cycle_academic_type_id_fkey"
            columns: ["academic_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_c11_academic_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_delivered_by_id_fkey"
            columns: ["delivered_by_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e03_delivered_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_c11_modality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_programme_fkey"
            columns: ["programme_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_programme"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_c11_sector"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_training_cycle_option: {
        Row: {
          created_at: string
          cycle_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_training_cycle_option_cycle_id_municipality_id_fkey"
            columns: ["cycle_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_cycle"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_training_enrolment: {
        Row: {
          age_years: number | null
          assessment_result_id: string | null
          attendance_pct: number | null
          c12_training_type_id: string | null
          certificate_issued: boolean | null
          certificate_number: string | null
          client_uuid: string | null
          completed_on: string | null
          counted_under_id: string | null
          created_at: string
          created_by: string | null
          cycle_id: string
          deleted_at: string | null
          employer_evaluation_id: string | null
          employer_evaluation_note: string | null
          enrolment_kind: string
          enterprise_sector_id: string | null
          enterprise_sector_other: string | null
          enterprise_status_id: string | null
          f01_training_type_id: string | null
          id: string
          job_ready: boolean | null
          met_criteria: boolean | null
          met_criteria_decided_by: string | null
          met_criteria_decided_on: string | null
          municipality_id: string
          nationality_id: string | null
          nationality_other: string | null
          org_role: string | null
          org_type_id: string | null
          organisation_name: string | null
          person_id: string
          post_test: number | null
          pre_test: number | null
          trainer_name: string | null
          updated_at: string
        }
        Insert: {
          age_years?: number | null
          assessment_result_id?: string | null
          attendance_pct?: number | null
          c12_training_type_id?: string | null
          certificate_issued?: boolean | null
          certificate_number?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          counted_under_id?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          employer_evaluation_id?: string | null
          employer_evaluation_note?: string | null
          enrolment_kind: string
          enterprise_sector_id?: string | null
          enterprise_sector_other?: string | null
          enterprise_status_id?: string | null
          f01_training_type_id?: string | null
          id?: string
          job_ready?: boolean | null
          met_criteria?: boolean | null
          met_criteria_decided_by?: string | null
          met_criteria_decided_on?: string | null
          municipality_id?: string
          nationality_id?: string | null
          nationality_other?: string | null
          org_role?: string | null
          org_type_id?: string | null
          organisation_name?: string | null
          person_id: string
          post_test?: number | null
          pre_test?: number | null
          trainer_name?: string | null
          updated_at?: string
        }
        Update: {
          age_years?: number | null
          assessment_result_id?: string | null
          attendance_pct?: number | null
          c12_training_type_id?: string | null
          certificate_issued?: boolean | null
          certificate_number?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          counted_under_id?: string | null
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          employer_evaluation_id?: string | null
          employer_evaluation_note?: string | null
          enrolment_kind?: string
          enterprise_sector_id?: string | null
          enterprise_sector_other?: string | null
          enterprise_status_id?: string | null
          f01_training_type_id?: string | null
          id?: string
          job_ready?: boolean | null
          met_criteria?: boolean | null
          met_criteria_decided_by?: string | null
          met_criteria_decided_on?: string | null
          municipality_id?: string
          nationality_id?: string | null
          nationality_other?: string | null
          org_role?: string | null
          org_type_id?: string | null
          organisation_name?: string | null
          person_id?: string
          post_test?: number | null
          pre_test?: number | null
          trainer_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_training_enrolment_assessment_result_id_fkey"
            columns: ["assessment_result_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_assessment_result"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_c12_training_type_id_fkey"
            columns: ["c12_training_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_c12_training_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_counted_under_fkey"
            columns: ["counted_under_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_enrolment"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_cycle_fkey"
            columns: ["cycle_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_cycle"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_employer_evaluation_id_fkey"
            columns: ["employer_evaluation_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_c12_employer_evaluation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_enterprise_sector_id_fkey"
            columns: ["enterprise_sector_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f01_sector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_enterprise_status_id_fkey"
            columns: ["enterprise_status_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f01_enterprise_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_f01_training_type_id_fkey"
            columns: ["f01_training_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f01_training_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_nationality_id_fkey"
            columns: ["nationality_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_nationality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_org_type_id_fkey"
            columns: ["org_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_e03_org_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_training_enrolment_option: {
        Row: {
          created_at: string
          enrolment_id: string
          municipality_id: string
          option_id: string
          option_other: string | null
          question_code: string
        }
        Insert: {
          created_at?: string
          enrolment_id: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          question_code: string
        }
        Update: {
          created_at?: string
          enrolment_id?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_training_enrolment_optio_enrolment_id_municipality_id_fkey"
            columns: ["enrolment_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_enrolment"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_training_programme: {
        Row: {
          b11_modality_id: string | null
          client_uuid: string | null
          completed_on: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          developed_by_id: string | null
          developed_with_id: string | null
          development_complete_id: string | null
          development_complete_id_decided_by: string | null
          development_complete_id_decided_on: string | null
          f02_modality_id: string | null
          group_id: string | null
          id: string
          level_id: string | null
          linked_sector_id: string | null
          linked_sector_other: string | null
          municipality_id: string
          occupation: string | null
          partner_names: string | null
          partner_type_id: string | null
          programme_type: string
          reference: string | null
          requirements_document: string | null
          sector_focus_id: string | null
          sector_focus_other: string | null
          sessions_count: number | null
          source_document: string | null
          specialisation_id: string | null
          specialisation_other: string | null
          tailoring_met: boolean | null
          tailoring_met_decided_by: string | null
          tailoring_met_decided_on: string | null
          title: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          b11_modality_id?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developed_by_id?: string | null
          developed_with_id?: string | null
          development_complete_id?: string | null
          development_complete_id_decided_by?: string | null
          development_complete_id_decided_on?: string | null
          f02_modality_id?: string | null
          group_id?: string | null
          id?: string
          level_id?: string | null
          linked_sector_id?: string | null
          linked_sector_other?: string | null
          municipality_id?: string
          occupation?: string | null
          partner_names?: string | null
          partner_type_id?: string | null
          programme_type: string
          reference?: string | null
          requirements_document?: string | null
          sector_focus_id?: string | null
          sector_focus_other?: string | null
          sessions_count?: number | null
          source_document?: string | null
          specialisation_id?: string | null
          specialisation_other?: string | null
          tailoring_met?: boolean | null
          tailoring_met_decided_by?: string | null
          tailoring_met_decided_on?: string | null
          title: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          b11_modality_id?: string | null
          client_uuid?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          developed_by_id?: string | null
          developed_with_id?: string | null
          development_complete_id?: string | null
          development_complete_id_decided_by?: string | null
          development_complete_id_decided_on?: string | null
          f02_modality_id?: string | null
          group_id?: string | null
          id?: string
          level_id?: string | null
          linked_sector_id?: string | null
          linked_sector_other?: string | null
          municipality_id?: string
          occupation?: string | null
          partner_names?: string | null
          partner_type_id?: string | null
          programme_type?: string
          reference?: string | null
          requirements_document?: string | null
          sector_focus_id?: string | null
          sector_focus_other?: string | null
          sessions_count?: number | null
          source_document?: string | null
          specialisation_id?: string | null
          specialisation_other?: string | null
          tailoring_met?: boolean | null
          tailoring_met_decided_by?: string | null
          tailoring_met_decided_on?: string | null
          title?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_training_programme_b11_modality_id_fkey"
            columns: ["b11_modality_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b11_modality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_developed_by_id_fkey"
            columns: ["developed_by_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f02_developed_by"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_developed_with_id_fkey"
            columns: ["developed_with_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b11_developed_with"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_development_complete_id_fkey"
            columns: ["development_complete_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f02_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_f02_modality_id_fkey"
            columns: ["f02_modality_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_modality_ipob"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f02_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f02_level"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_linked_sector_id_fkey"
            columns: ["linked_sector_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_sector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_partner_type_id_fkey"
            columns: ["partner_type_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f02_partner_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_sector_focus_id_fkey"
            columns: ["sector_focus_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_f02_sector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_programme_specialisation_id_fkey"
            columns: ["specialisation_id"]
            isOneToOne: false
            referencedRelation: "ref_rmth_b11_specialisation"
            referencedColumns: ["id"]
          }
        ]
      }
      rmth_training_programme_option: {
        Row: {
          created_at: string
          municipality_id: string
          option_id: string
          option_other: string | null
          programme_id: string
          question_code: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          option_id: string
          option_other?: string | null
          programme_id: string
          question_code: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          option_id?: string
          option_other?: string | null
          programme_id?: string
          question_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_training_programme_optio_programme_id_municipality_id_fkey"
            columns: ["programme_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_programme"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
      }
      rmth_training_programme_proposal: {
        Row: {
          created_at: string
          municipality_id: string
          programme_id: string
          proposal_id: string
        }
        Insert: {
          created_at?: string
          municipality_id?: string
          programme_id: string
          proposal_id: string
        }
        Update: {
          created_at?: string
          municipality_id?: string
          programme_id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rmth_training_programme_propo_programme_id_municipality_id_fkey"
            columns: ["programme_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_training_programme"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_propos_proposal_id_municipality_id_fkey"
            columns: ["proposal_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "rmth_proposal"
            referencedColumns: ["id", "municipality_id"]
          }
        ]
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
          municipality_id: string
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
          municipality_id?: string
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
          municipality_id?: string
          person_id?: string
          registered_on?: string
          session_id?: string
          submitted_by_participant?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolment_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_session"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrolment_session_municipality_fkey"
            columns: ["session_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "training_session"
            referencedColumns: ["id", "municipality_id"]
          }
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
          municipality_id: string
          origin: string
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
          municipality_id?: string
          origin?: string
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
          municipality_id?: string
          origin?: string
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
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_partnership_municipality_fkey"
            columns: ["delivered_by_partnership_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "partnership"
            referencedColumns: ["id", "municipality_id"]
          },
          {
            foreignKeyName: "training_session_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "ref_training_topic"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      v_ind_a1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_a1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_a1_3: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_b1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_b1_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_b1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_c1_3: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_d0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_d0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_e0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_e0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_f0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_3: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_g0_4: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_imp_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_a1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_a2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_a3: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_b1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_c1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_c2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_d1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_d2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_e1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_f1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_f2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_f3: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_g1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_g2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_h1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_h2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_imp_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_so1_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_so2_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_so3_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_khld_so4_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_a1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_a1_3: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_b1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_b1_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_b1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_c1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_c1_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_c1_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_e0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_e0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_e0_3: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_f0_1: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_f0_2: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_imp_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_so1_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_so2_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_ind_rmth_so3_0: {
        Row: {
          actual: number | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_indicator_actual: {
        Row: {
          actual: number | null
          code: string | null
          denominator: number | null
          municipality_id: string | null
          period_code: string | null
        }
        Relationships: []
      }
      v_indicator_disaggregated: {
        Row: {
          age_band: string | null
          code: string | null
          disability_status: string | null
          municipality_id: string | null
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
          municipality_id: string | null
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
        Relationships: [
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      v_khld_indicator_status: {
        Row: {
          code: string | null
          detail: string | null
          full_code: string | null
          milestone_code: string | null
          municipality_id: string | null
          reason: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      v_khld_indicator_unique: {
        Row: {
          code: string | null
          municipality_id: string | null
          period_code: string | null
          unique_actual: number | null
        }
        Relationships: []
      }
      v_khld_milestone_quarter: {
        Row: {
          established_on: string | null
          milestone_code: string | null
          municipality_id: string | null
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
          municipality_id: string | null
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
      v_public_activity_type: {
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
      v_public_khld_whats_on: {
        Row: {
          description: string | null
          id: string | null
          kind: string | null
          municipality_slug: string | null
          on_date: string | null
          place_ar: string | null
          place_en: string | null
          time_from: string | null
          time_to: string | null
          title: string | null
          type_ar: string | null
          type_en: string | null
        }
        Relationships: []
      }
      v_public_municipality: {
        Row: {
          code: string | null
          name_ar: string | null
          name_en: string | null
          programme_ar: string | null
          programme_en: string | null
          slug: string | null
        }
        Insert: {
          code?: string | null
          name_ar?: string | null
          name_en?: string | null
          programme_ar?: string | null
          programme_en?: string | null
          slug?: string | null
        }
        Update: {
          code?: string | null
          name_ar?: string | null
          name_en?: string | null
          programme_ar?: string | null
          programme_en?: string | null
          slug?: string | null
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
          municipality_id: string | null
          municipality_slug: string | null
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
          municipality_id: string | null
          person_id: string | null
          subject: string | null
          village: string | null
        }
        Relationships: []
      }
      v_rmth_indicator_status: {
        Row: {
          code: string | null
          full_code: string | null
          missing_keys: string[] | null
          municipality_id: string | null
          reason: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
      v_rmth_indicator_unique: {
        Row: {
          code: string | null
          municipality_id: string | null
          period_code: string | null
          unique_actual: number | null
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
          municipality_id: string | null
          name: string | null
          start_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      actor_display_name: { Args: { p_actor: string }; Returns: string }
      age_band: {
        Args: { p: Database["public"]["Tables"]["person"]["Row"] }
        Returns: string
      }
      applicant_prefill: {
        Args: {
          p_date_of_birth?: string
          p_municipality_slug?: string
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
          p_municipality_slug?: string
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
      attach_or_create_linkage: {
        Args: {
          p_activity_type_id: string
          p_create_new_initiative: boolean
          p_initiative_id: string
          p_initiative_title: string
          p_linked_on: string
          p_main_product: string
          p_partnership_id: string
          p_person_id: string
          p_request: string
          p_scope: string
        }
        Returns: Json
      }
      attach_standard_triggers: {
        Args: { p_allow_hard_delete?: boolean; p_table: string }
        Returns: undefined
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
      can_see_municipality: {
        Args: { p_municipality: string }
        Returns: boolean
      }
      can_write: { Args: never; Returns: boolean }
      count_markets_attended: { Args: { p_person_id: string }; Returns: number }
      create_direct_linkage: {
        Args: {
          p_activity_type_id?: string
          p_create_new_initiative?: boolean
          p_initiative_id?: string
          p_initiative_title?: string
          p_linked_on?: string
          p_main_product?: string
          p_national_id: string
          p_note?: string
          p_partnership_id: string
          p_scope: string
        }
        Returns: Json
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role_t"]
      }
      evidence_file_limit_bytes: { Args: never; Returns: number }
      evidence_included_bytes: { Args: never; Returns: number }
      evidence_municipality: { Args: { p_name: string }; Returns: string }
      evidence_quota_bytes: { Args: never; Returns: number }
      evidence_usage: { Args: never; Returns: Json }
      followup_indicator_reach: {
        Args: {
          p_status: Database["public"]["Enums"]["record_status_t"]
          p_survey_id: string
        }
        Returns: string[]
      }
      followup_prefill: { Args: { p_national_id: string }; Returns: Json }
      followup_prefill_for_staff: {
        Args: { p_national_id: string }
        Returns: Json
      }
      followup_view_statuses: { Args: { p_view: string }; Returns: string[] }
      indicator_figures: {
        Args: {
          p_age_bands?: string[]
          p_disability?: string[]
          p_municipality_id?: string
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
      is_super_admin: { Args: never; Returns: boolean }
      khld_age_band: { Args: { p_age: number }; Returns: string }
      khld_age_band_on: {
        Args: { p: Database["public"]["Tables"]["person"]["Row"]; p_on: string }
        Returns: string
      }
      khld_age_on: {
        Args: { p: Database["public"]["Tables"]["person"]["Row"]; p_on: string }
        Returns: number
      }
      khld_attendance_figures: {
        Args: { p_attendance_id: string }
        Returns: Json
      }
      khld_checklist_status: {
        Args: { p_list: string; p_status_id: string }
        Returns: string
      }
      khld_ensure_enterprise: {
        Args: { p: Json; p_owner: string }
        Returns: string
      }
      khld_ensure_partner: { Args: { p: Json }; Returns: string }
      khld_ensure_person: { Args: { p: Json }; Returns: string }
      khld_ensure_vendor: { Args: { p_person: string }; Returns: string }
      khld_milestone_status: {
        Args: { p_verification_id: string }
        Returns: Json
      }
      khld_next_reference: {
        Args: {
          p_municipality_id: string
          p_prefix: string
          p_width: number
          p_year: number
        }
        Returns: string
      }
      khld_person_lookup: {
        Args: { p_id_number: string; p_id_type: string }
        Returns: {
          age_recorded: number
          date_of_birth: string
          deleted_at: string
          deleted_by: string
          full_name: string
          id: string
          national_id: string
          phone: string
          sex: Database["public"]["Enums"]["sex_t"]
          unhcr_number: string
        }[]
      }
      match_linkage_request: {
        Args: {
          p_create_new_initiative?: boolean
          p_initiative_id?: string
          p_linked_on?: string
          p_partnership_id: string
          p_request_id: string
          p_review_note?: string
          p_scope: string
        }
        Returns: Json
      }
      my_applications: {
        Args: {
          p_date_of_birth?: string
          p_municipality_slug?: string
          p_national_id: string
          p_phone?: string
        }
        Returns: Json
      }
      my_municipality: { Args: never; Returns: string }
      my_person_id: { Args: never; Returns: string }
      overview_counts: {
        Args: {
          p_age_bands?: string[]
          p_disability?: string[]
          p_municipality_id?: string
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
      partner_restore_candidate: {
        Args: { p_name: string; p_unit?: string }
        Returns: {
          deleted_at: string
          deleted_by: string
          id: string
          name: string
          unit: string
        }[]
      }
      partner_restore_impact: {
        Args: { p_municipality_id?: string; p_partner_id: string }
        Returns: {
          code: string
          delta: number
          period_code: string
          recomputed: boolean
        }[]
      }
      person_restore_candidate: {
        Args: { p_national_id: string }
        Returns: {
          deleted_at: string
          deleted_by: string
          full_name: string
          id: string
          national_id: string
          village: string
        }[]
      }
      person_restore_impact: {
        Args: { p_municipality_id?: string; p_person_id: string }
        Returns: {
          code: string
          delta: number
          period_code: string
          recomputed: boolean
        }[]
      }
      request_linkage: {
        Args: {
          p_activity_type_id: string
          p_client_uuid?: string
          p_date_of_birth?: string
          p_initiative_title: string
          p_main_product?: string
          p_municipality_slug?: string
          p_national_id: string
          p_phone?: string
          p_request: string
        }
        Returns: Json
      }
      restore_partner: { Args: { p_partner_id: string }; Returns: Json }
      restore_person: { Args: { p_person_id: string }; Returns: Json }
      review_followup: {
        Args: {
          p_action: string
          p_confirm?: boolean
          p_note?: string
          p_survey_id: string
        }
        Returns: Json
      }
      rmth_ensure_person: { Args: { p: Json }; Returns: string }
      rmth_next_reference: {
        Args: { p_municipality_id: string; p_prefix: string; p_year: number }
        Returns: string
      }
      rmth_threshold_bool: {
        Args: { p_key: string; p_municipality_id: string }
        Returns: boolean
      }
      rmth_threshold_numeric: {
        Args: { p_key: string; p_municipality_id: string }
        Returns: number
      }
      rmth_threshold_text: {
        Args: { p_key: string; p_municipality_id: string }
        Returns: string
      }
      save_followup_section_a: {
        Args: {
          p_q10?: string
          p_q11_options?: string[]
          p_q11_other?: string
          p_q12?: string
          p_q13?: string
          p_q14?: string
          p_q15_count?: number
          p_q15_options?: string[]
          p_q15_other?: string
          p_q16?: string
          p_q7?: string
          p_q8?: string
          p_q9_options?: string[]
          p_q9_other?: string
          p_survey_id: string
        }
        Returns: Json
      }
      save_followup_section_b: {
        Args: {
          p_q17?: string
          p_q18?: string
          p_q19_options?: string[]
          p_q19_other?: string
          p_q19_when?: string
          p_q20_options?: string[]
          p_q20_other?: string
          p_q21_free_text?: string
          p_q21_options?: string[]
          p_q22?: string
          p_q23?: Json
          p_q24_options?: string[]
          p_q24_other?: string
          p_q25?: string
          p_q26_total?: number
          p_q26_under30?: number
          p_q26_women?: number
          p_survey_id: string
        }
        Returns: Json
      }
      save_followup_section_c: {
        Args: {
          p_q27_options?: string[]
          p_q27_other?: string
          p_q28_options?: string[]
          p_q28_other?: string
          p_q29?: string
          p_q30?: number
          p_q31?: string
          p_q32?: string
          p_q33_options?: string[]
          p_q33_other?: string
          p_q34?: string
          p_q35?: Json
          p_q36_options?: string[]
          p_q36_other?: string
          p_survey_id: string
        }
        Returns: Json
      }
      save_followup_section_d: {
        Args: {
          p_q37?: string
          p_q38?: string
          p_q39_options?: string[]
          p_q39_other?: string
          p_q39_when?: string
          p_q40?: string
          p_survey_id: string
        }
        Returns: Json
      }
      save_followup_section_e: {
        Args: {
          p_q41_options?: string[]
          p_q41_other?: string
          p_q42?: boolean
          p_q43?: string
          p_survey_id: string
        }
        Returns: Json
      }
      save_khld_record: { Args: { p: Json; p_table: string }; Returns: Json }
      save_rmth_record: { Args: { p: Json; p_table: string }; Returns: Json }
      set_acting_municipality: {
        Args: { p_municipality_id: string }
        Returns: Json
      }
      snapshot_period: {
        Args: { p_municipality_id?: string; p_period_code: string }
        Returns: number
      }
      start_followup: {
        Args: {
          p_client_uuid?: string
          p_contact_date: string
          p_contact_mode: Database["public"]["Enums"]["contact_mode_t"]
          p_enumerator_name: string
          p_national_id: string
          p_respondent: Database["public"]["Enums"]["respondent_t"]
          p_round: Database["public"]["Enums"]["followup_round_t"]
        }
        Returns: Json
      }
      submit_followup: {
        Args: { p_confirm?: boolean; p_survey_id: string }
        Returns: Json
      }
      sync_auto_contribution: {
        Args: {
          p_description: string
          p_entity_id: string
          p_entity_type: string
          p_on: string
          p_partnership_id: string
          p_type: string
        }
        Returns: undefined
      }
      training_session_delete_impact: {
        Args: { p_session_id: string }
        Returns: {
          completions: number
          eligibility_lost: number
          keep_existing_advisory: number
          live_enrolments: number
        }[]
      }
      withdrawn_predecessor: {
        Args: { p_a: string; p_b: string; p_kind: string }
        Returns: {
          how_many: number
          withdrawn_at: string
          withdrawn_by: string
        }[]
      }
    }
    Enums: {
      advisory_track_t: "market" | "home_based"
      app_role_t:
        | "coordinator"
        | "data_entry"
        | "enumerator"
        | "partner_viewer"
        | "participant"
        | "super_admin"
      contact_mode_t: "telephone" | "site_visit" | "municipal_office"
      followup_round_t: "six_month" | "twelve_month" | "annual"
      initiative_status_t: "planned" | "operating" | "paused" | "stopped"
      link_status_t: "proposed" | "under_review" | "active" | "ended"
      linkage_request_status_t:
        | "submitted"
        | "under_review"
        | "matched"
        | "closed"
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
    Enums: {
      advisory_track_t: ["market", "home_based"],
      app_role_t: [
        "coordinator",
        "data_entry",
        "enumerator",
        "partner_viewer",
        "participant",
        "super_admin"
      ],
      contact_mode_t: ["telephone", "site_visit", "municipal_office"],
      followup_round_t: ["six_month", "twelve_month", "annual"],
      initiative_status_t: ["planned", "operating", "paused", "stopped"],
      link_status_t: ["proposed", "under_review", "active", "ended"],
      linkage_request_status_t: [
        "submitted",
        "under_review",
        "matched",
        "closed"
      ],
      partnership_type_t: ["training", "production_support"],
      record_status_t: ["draft", "submitted", "approved", "rejected"],
      respondent_t: ["participant", "household_member", "not_reached"],
      sex_t: ["female", "male"],
      tri_status_t: ["done", "in_progress", "not_started"],
    },
  },
} as const
