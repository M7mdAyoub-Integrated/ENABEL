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
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "activity_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          {
            foreignKeyName: "advisory_enrolment_session_municipality_fkey"
            columns: ["session_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "advisory_session"
            referencedColumns: ["id", "municipality_id"]
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
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "advisory_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_acting_municipality_id_fkey"
            columns: ["acting_municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "app_user_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "attachment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "audit_log_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "case_study_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "coordination_meeting_partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "exhibition_registration_exhibition_id_fkey"
            columns: ["exhibition_id"]
            isOneToOne: false
            referencedRelation: "v_upcoming_exhibitions"
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
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "exhibition_registration_product_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          {
            foreignKeyName: "exhibition_registration_product_registration_municipality_fkey"
            columns: ["registration_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "exhibition_registration"
            referencedColumns: ["id", "municipality_id"]
          },
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
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_answer_option_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_buyer_connection_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_safety_item_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "followup_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "guidance_record_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_snapshot_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_target_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
            foreignKeyName: "linkage_request_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "v_public_activity_type"
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
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "linkage_request_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "market_linkage_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "mentorship_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "milestone_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "objective_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "office_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partner_contribution_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "partnership_role_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "person_activity_type_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "v_public_activity_type"
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
            foreignKeyName: "production_initiative_activity_type_id_fkey"
            columns: ["activity_type_id"]
            isOneToOne: false
            referencedRelation: "v_public_activity_type"
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
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "production_initiative_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "promotional_action_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "reporting_period_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_enterprise_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_event_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
          },
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
          },
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
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "rmth_incubation_service_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_incubation_service_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
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
          },
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
          },
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
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_incubator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          },
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
          },
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
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
            foreignKeyName: "rmth_outcome_survey_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_outcome_survey_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
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
          },
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
          },
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
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_project_implementer_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
          },
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
          },
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
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_proposal_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
          },
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
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_reference_counter_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_threshold_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_cycle_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
          },
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
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
          {
            foreignKeyName: "rmth_training_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_missing_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rmth_training_enrolment_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_public"
            referencedColumns: ["id"]
          },
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
          },
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
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "rmth_training_programme_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
          },
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
          },
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
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_enrolment_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
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
          {
            foreignKeyName: "training_enrolment_session_municipality_fkey"
            columns: ["session_id", "municipality_id"]
            isOneToOne: false
            referencedRelation: "training_session"
            referencedColumns: ["id", "municipality_id"]
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
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "training_session_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
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
          },
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
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_a1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_b1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_c1_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_d0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_e0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_f0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_1"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_2"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_3"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_g0_4"
            referencedColumns: ["municipality_id"]
          },
          {
            foreignKeyName: "indicator_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "v_ind_imp_0"
            referencedColumns: ["municipality_id"]
          },
        ]
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
        Args: { p_partner_id: string }
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
        Args: { p_person_id: string }
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
      rmth_ensure_person: {
        Args: { p: Json }
        Returns: string
      }
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
      save_rmth_record: {
        Args: { p: Json; p_table: string }
        Returns: Json
      }
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
        "super_admin",
      ],
      contact_mode_t: ["telephone", "site_visit", "municipal_office"],
      followup_round_t: ["six_month", "twelve_month", "annual"],
      initiative_status_t: ["planned", "operating", "paused", "stopped"],
      link_status_t: ["proposed", "under_review", "active", "ended"],
      linkage_request_status_t: [
        "submitted",
        "under_review",
        "matched",
        "closed",
      ],
      partnership_type_t: ["training", "production_support"],
      record_status_t: ["draft", "submitted", "approved", "rejected"],
      respondent_t: ["participant", "household_member", "not_reached"],
      sex_t: ["female", "male"],
      tri_status_t: ["done", "in_progress", "not_started"],
    },
  },
} as const
