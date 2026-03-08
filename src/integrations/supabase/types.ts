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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          id: string
          name: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          app_name: string
          created_at: string | null
          hoa_email: string | null
          hoa_hours: string | null
          hoa_phone: string | null
          id: string
          logo_url: string | null
          subdiv_name: string
          theme: string
          updated_at: string | null
        }
        Insert: {
          app_name?: string
          created_at?: string | null
          hoa_email?: string | null
          hoa_hours?: string | null
          hoa_phone?: string | null
          id?: string
          logo_url?: string | null
          subdiv_name?: string
          theme?: string
          updated_at?: string | null
        }
        Update: {
          app_name?: string
          created_at?: string | null
          hoa_email?: string | null
          hoa_hours?: string | null
          hoa_phone?: string | null
          id?: string
          logo_url?: string | null
          subdiv_name?: string
          theme?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_code: string
          cancelled_date: string | null
          created_at: string | null
          end_date: string
          id: string
          rate: number
          slot_id: string
          space_name: string
          start_date: string
          status: string
          user_block_lot: string | null
          user_email: string
          user_id: string
          user_name: string
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_name: string
          vehicle_plate: string
        }
        Insert: {
          booking_code: string
          cancelled_date?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          rate: number
          slot_id: string
          space_name: string
          start_date: string
          status?: string
          user_block_lot?: string | null
          user_email: string
          user_id: string
          user_name: string
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_name: string
          vehicle_plate: string
        }
        Update: {
          booking_code?: string
          cancelled_date?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          rate?: number
          slot_id?: string
          space_name?: string
          start_date?: string
          status?: string
          user_block_lot?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_name?: string
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          id: string
          method: string
          receipt_issued: boolean | null
          receipt_number: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          id?: string
          method: string
          receipt_issued?: boolean | null
          receipt_number?: string | null
          transaction_date: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          id?: string
          method?: string
          receipt_issued?: boolean | null
          receipt_number?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      penalties: {
        Row: {
          amount: number
          applied_date: string
          booking_id: string
          created_at: string | null
          id: string
          notes: string | null
          overstay_days: number
        }
        Insert: {
          amount: number
          applied_date: string
          booking_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          overstay_days: number
        }
        Update: {
          amount?: number
          applied_date?: string
          booking_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          overstay_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "penalties_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          block_lot: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          residence_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          block_lot?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          residence_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          block_lot?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          residence_type?: string | null
        }
        Relationships: []
      }
      spaces: {
        Row: {
          address: string
          created_at: string | null
          id: string
          name: string
          rate: number
          slots: number
          sort_order: number
        }
        Insert: {
          address?: string
          created_at?: string | null
          id?: string
          name: string
          rate?: number
          slots?: number
          sort_order?: number
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          name?: string
          rate?: number
          slots?: number
          sort_order?: number
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          name: string
          plate: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          plate: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          plate?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      booking_summary: {
        Row: {
          base_fee: number | null
          booking_code: string | null
          cancelled_date: string | null
          created_at: string | null
          end_date: string | null
          id: string | null
          penalty_amount: number | null
          penalty_days: number | null
          rate: number | null
          slot_id: string | null
          space_name: string | null
          start_date: string | null
          status: string | null
          total_paid: number | null
          user_block_lot: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_plate: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_occupied_slots: {
        Args: never
        Returns: {
          slot_id: string
        }[]
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
