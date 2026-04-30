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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          page: string | null
          user_agent: string | null
          user_email: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          page?: string | null
          user_agent?: string | null
          user_email: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          page?: string | null
          user_agent?: string | null
          user_email?: string
        }
        Relationships: []
      }
      company_memory: {
        Row: {
          category: string
          channel: string | null
          created_at: string
          employee_name: string | null
          id: string
          notes: string | null
          origin: string
          product_id: string | null
          product_name: string | null
          reason: string | null
          related_id: string | null
          related_type: string | null
          sku: string | null
          summary: string
          user_email: string
        }
        Insert: {
          category: string
          channel?: string | null
          created_at?: string
          employee_name?: string | null
          id?: string
          notes?: string | null
          origin: string
          product_id?: string | null
          product_name?: string | null
          reason?: string | null
          related_id?: string | null
          related_type?: string | null
          sku?: string | null
          summary: string
          user_email: string
        }
        Update: {
          category?: string
          channel?: string | null
          created_at?: string
          employee_name?: string | null
          id?: string
          notes?: string | null
          origin?: string
          product_id?: string | null
          product_name?: string | null
          reason?: string | null
          related_id?: string | null
          related_type?: string | null
          sku?: string | null
          summary?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_routines: {
        Row: {
          created_at: string
          day_of_month_end: number | null
          day_of_month_start: number | null
          day_of_week: number | null
          description: string | null
          exclude_weekends: boolean
          frequency: string
          id: string
          is_active: boolean
          person_name: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month_end?: number | null
          day_of_month_start?: number | null
          day_of_week?: number | null
          description?: string | null
          exclude_weekends?: boolean
          frequency: string
          id?: string
          is_active?: boolean
          person_name: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month_end?: number | null
          day_of_month_start?: number | null
          day_of_week?: number | null
          description?: string | null
          exclude_weekends?: boolean
          frequency?: string
          id?: string
          is_active?: boolean
          person_name?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          is_auto_generated: boolean
          person_name: string
          routine_id: string | null
          scheduled_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_auto_generated?: boolean
          person_name: string
          routine_id?: string | null
          scheduled_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_auto_generated?: boolean
          person_name?: string
          routine_id?: string | null
          scheduled_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "crm_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_history: {
        Row: {
          action_type: string
          block_type: string
          created_at: string
          id: string
          justification: string | null
          product_id: string | null
          product_name: string
          user_email: string | null
        }
        Insert: {
          action_type: string
          block_type: string
          created_at?: string
          id?: string
          justification?: string | null
          product_id?: string | null
          product_name: string
          user_email?: string | null
        }
        Update: {
          action_type?: string
          block_type?: string
          created_at?: string
          id?: string
          justification?: string | null
          product_id?: string | null
          product_name?: string
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          command: string
          created_at: string | null
          id: string
          new_quantity: number
          panel_type: string
          previous_quantity: number
          product_id: string
          quantity: number
          type: string
        }
        Insert: {
          command: string
          created_at?: string | null
          id?: string
          new_quantity: number
          panel_type?: string
          previous_quantity: number
          product_id: string
          quantity: number
          type: string
        }
        Update: {
          command?: string
          created_at?: string | null
          id?: string
          new_quantity?: number
          panel_type?: string
          previous_quantity?: number
          product_id?: string
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_costs: {
        Row: {
          ad_type: string | null
          additional_cost: number
          cost: number
          created_at: string
          current_margin_value: number | null
          dimensions: string | null
          ean: string | null
          full_price: number | null
          id: string
          item_number: number | null
          notes: string | null
          platform: string
          product_name: string
          profit_margin_percent: number | null
          sale_price: number | null
          sku: string | null
          stock: number | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          ad_type?: string | null
          additional_cost?: number
          cost?: number
          created_at?: string
          current_margin_value?: number | null
          dimensions?: string | null
          ean?: string | null
          full_price?: number | null
          id?: string
          item_number?: number | null
          notes?: string | null
          platform: string
          product_name: string
          profit_margin_percent?: number | null
          sale_price?: number | null
          sku?: string | null
          stock?: number | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          ad_type?: string | null
          additional_cost?: number
          cost?: number
          created_at?: string
          current_margin_value?: number | null
          dimensions?: string | null
          ean?: string | null
          full_price?: number | null
          id?: string
          item_number?: number | null
          notes?: string | null
          platform?: string
          product_name?: string
          profit_margin_percent?: number | null
          sale_price?: number | null
          sku?: string | null
          stock?: number | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          created_at: string | null
          id: string
          min_stock: number
          name: string
          panel_type: string
          quantity: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          min_stock?: number
          name: string
          panel_type?: string
          quantity?: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string | null
          id?: string
          min_stock?: number
          name?: string
          panel_type?: string
          quantity?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          items: Json
          observations: string | null
          panel_type: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          observations?: string | null
          panel_type?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          observations?: string | null
          panel_type?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_type: string
          product_name: string | null
          purchased_at: string
          status: string
          transaction_id: string | null
          user_email: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          product_name?: string | null
          purchased_at?: string
          status?: string
          transaction_id?: string | null
          user_email: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          product_name?: string | null
          purchased_at?: string
          status?: string
          transaction_id?: string | null
          user_email?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_email: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_email: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      saved_calculations: {
        Row: {
          cost: number
          created_at: string
          id: string
          platform: string
          product_name: string
          profit_margin_percent: number
          profit_margin_value: number
          sale_price: number
          user_email: string
        }
        Insert: {
          cost: number
          created_at?: string
          id?: string
          platform: string
          product_name: string
          profit_margin_percent: number
          profit_margin_value: number
          sale_price: number
          user_email: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          platform?: string
          product_name?: string
          profit_margin_percent?: number
          profit_margin_value?: number
          sale_price?: number
          user_email?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      stock_requests: {
        Row: {
          approved_quantity: number | null
          created_at: string
          current_stock: number
          expires_at: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string
          requested_by: string
          responded_at: string | null
          status: string
          supervisor_email: string | null
          unit: string
        }
        Insert: {
          approved_quantity?: number | null
          created_at?: string
          current_stock?: number
          expires_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          requested_by: string
          responded_at?: string | null
          status?: string
          supervisor_email?: string | null
          unit?: string
        }
        Update: {
          approved_quantity?: number | null
          created_at?: string
          current_stock?: number
          expires_at?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          requested_by?: string
          responded_at?: string | null
          status?: string
          supervisor_email?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_permissions: {
        Row: {
          created_at: string
          id: string
          page_path: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          user_email?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users_with_purchases: {
        Args: never
        Returns: {
          created_at: string
          email: string
          expires_at: string
          last_sign_in_at: string
          plan_type: string
          product_name: string
          purchase_id: string
          purchased_at: string
          status: string
          user_id: string
        }[]
      }
      get_my_email: { Args: never; Returns: string }
      get_registered_emails: {
        Args: never
        Returns: {
          email: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "production"
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
      app_role: ["admin", "production"],
    },
  },
} as const
