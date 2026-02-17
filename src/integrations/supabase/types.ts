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
      admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          password_hash: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          password_hash?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_auth: {
        Row: {
          created_at: string
          customer_id: string
          email: string
          id: string
          last_login: string | null
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email: string
          id?: string
          last_login?: string | null
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string
          id?: string
          last_login?: string | null
          password_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_auth_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_phone_history: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          label: string | null
          last_used_at: string
          phone_number: string
          use_count: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          label?: string | null
          last_used_at?: string
          phone_number: string
          use_count?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          label?: string | null
          last_used_at?: string
          phone_number?: string
          use_count?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          parent_id: string | null
          plain_password: string | null
          points: number | null
          points_blocked: boolean | null
          position: Database["public"]["Enums"]["customer_position"] | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          parent_id?: string | null
          plain_password?: string | null
          points?: number | null
          points_blocked?: boolean | null
          position?: Database["public"]["Enums"]["customer_position"] | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          parent_id?: string | null
          plain_password?: string | null
          points?: number | null
          points_blocked?: boolean | null
          position?: Database["public"]["Enums"]["customer_position"] | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      digiflazz_price_cache: {
        Row: {
          brand: string | null
          buyer_product_status: boolean | null
          buyer_sku_code: string
          category: string | null
          cmd: string | null
          created_at: string
          description: string | null
          end_cut_off: string | null
          id: string
          multi: boolean | null
          price: number
          product_name: string
          seller_name: string | null
          seller_product_status: boolean | null
          start_cut_off: string | null
          stock: number | null
          type: string | null
          unlimited_stock: boolean | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          buyer_product_status?: boolean | null
          buyer_sku_code: string
          category?: string | null
          cmd?: string | null
          created_at?: string
          description?: string | null
          end_cut_off?: string | null
          id?: string
          multi?: boolean | null
          price?: number
          product_name: string
          seller_name?: string | null
          seller_product_status?: boolean | null
          start_cut_off?: string | null
          stock?: number | null
          type?: string | null
          unlimited_stock?: boolean | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          buyer_product_status?: boolean | null
          buyer_sku_code?: string
          category?: string | null
          cmd?: string | null
          created_at?: string
          description?: string | null
          end_cut_off?: string | null
          id?: string
          multi?: boolean | null
          price?: number
          product_name?: string
          seller_name?: string | null
          seller_product_status?: boolean | null
          start_cut_off?: string | null
          stock?: number | null
          type?: string | null
          unlimited_stock?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
          ip_address: string | null
          success: boolean | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      merchant_auth: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login: string | null
          merchant_id: string
          password_hash: string
          role: Database["public"]["Enums"]["merchant_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login?: string | null
          merchant_id: string
          password_hash: string
          role?: Database["public"]["Enums"]["merchant_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          merchant_id?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["merchant_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_auth_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_products: {
        Row: {
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          merchant_id: string
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          merchant_id: string
          name: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          merchant_id?: string
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_transactions: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_points_earned: number
          id: string
          laryzo_fee: number
          merchant_id: string
          notes: string | null
          price: number
          product_id: string | null
          product_name: string
          qty: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_points_earned?: number
          id?: string
          laryzo_fee?: number
          merchant_id: string
          notes?: string | null
          price?: number
          product_id?: string | null
          product_name: string
          qty?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_points_earned?: number
          id?: string
          laryzo_fee?: number
          merchant_id?: string
          notes?: string | null
          price?: number
          product_id?: string | null
          product_name?: string
          qty?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merchant_products"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          business_address: string | null
          business_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          business_address?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          business_address?: string | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_id: string
          digiflazz_message: string | null
          digiflazz_sn: string | null
          digiflazz_status: string | null
          id: string
          input_value: string | null
          points_earned: number
          points_used: number
          processed_at: string | null
          product_id: string
          ref_id: string | null
          shipping_address: string | null
          shipping_status: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_id: string
          digiflazz_message?: string | null
          digiflazz_sn?: string | null
          digiflazz_status?: string | null
          id?: string
          input_value?: string | null
          points_earned?: number
          points_used?: number
          processed_at?: string | null
          product_id: string
          ref_id?: string | null
          shipping_address?: string | null
          shipping_status?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_id?: string
          digiflazz_message?: string | null
          digiflazz_sn?: string | null
          digiflazz_status?: string | null
          id?: string
          input_value?: string | null
          points_earned?: number
          points_used?: number
          processed_at?: string | null
          product_id?: string
          ref_id?: string | null
          shipping_address?: string | null
          shipping_status?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      point_history: {
        Row: {
          created_at: string | null
          from_customer: string | null
          id: string
          level: number | null
          points: number | null
          product_code: string | null
          to_customer: string | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_customer?: string | null
          id?: string
          level?: number | null
          points?: number | null
          product_code?: string | null
          to_customer?: string | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_customer?: string | null
          id?: string
          level?: number | null
          points?: number | null
          product_code?: string | null
          to_customer?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_history_from_customer_fkey"
            columns: ["from_customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_history_to_customer_fkey"
            columns: ["to_customer"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cost_price: number
          created_at: string
          description: string | null
          digiflazz_sku: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          point_price: number
          ppob_type: string | null
          requires_input: string | null
          requires_shipping: boolean
          stock: number
          type: string
          updated_at: string
        }
        Insert: {
          cost_price?: number
          created_at?: string
          description?: string | null
          digiflazz_sku?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          point_price?: number
          ppob_type?: string | null
          requires_input?: string | null
          requires_shipping?: boolean
          stock?: number
          type: string
          updated_at?: string
        }
        Update: {
          cost_price?: number
          created_at?: string
          description?: string | null
          digiflazz_sku?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          point_price?: number
          ppob_type?: string | null
          requires_input?: string | null
          requires_shipping?: boolean
          stock?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      satellite_api_keys: {
        Row: {
          client_name: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          last_used_at: string | null
          request_count: number | null
        }
        Insert: {
          client_name: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          last_used_at?: string | null
          request_count?: number | null
        }
        Update: {
          client_name?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          last_used_at?: string | null
          request_count?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string | null
          customer_id: string | null
          harga_konsumen: number | null
          harga_pokok: number | null
          id: string
          margin: number | null
          product_code: string | null
          product_name: string | null
          product_type: string | null
          qty: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          harga_konsumen?: number | null
          harga_pokok?: number | null
          id?: string
          margin?: number | null
          product_code?: string | null
          product_name?: string | null
          product_type?: string | null
          qty?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          harga_konsumen?: number | null
          harga_pokok?: number | null
          id?: string
          margin?: number | null
          product_code?: string | null
          product_name?: string | null
          product_type?: string | null
          qty?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string | null
          ref_id: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          ref_id?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          ref_id?: string | null
          success?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      orders_customer_view: {
        Row: {
          created_at: string | null
          customer_id: string | null
          digiflazz_message: string | null
          digiflazz_sn: string | null
          digiflazz_status: string | null
          id: string | null
          input_value: string | null
          points_earned: number | null
          points_used: number | null
          processed_at: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          ref_id: string | null
          shipping_address: string | null
          shipping_status: string | null
          status: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products_public: {
        Row: {
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          point_price: number | null
          ppob_type: string | null
          requires_input: string | null
          requires_shipping: boolean | null
          stock: number | null
          type: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          point_price?: number | null
          ppob_type?: string | null
          requires_input?: string | null
          requires_shipping?: boolean | null
          stock?: number | null
          type?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          point_price?: number | null
          ppob_type?: string | null
          requires_input?: string | null
          requires_shipping?: boolean | null
          stock?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_current_customer_id: { Args: never; Returns: string }
      get_current_merchant_id: { Args: never; Returns: string }
      increment_customer_points: {
        Args: { customer_uuid: string; points_to_add: number }
        Returns: boolean
      }
      is_authenticated_admin: { Args: never; Returns: boolean }
      is_authenticated_customer: { Args: never; Returns: boolean }
      is_authenticated_merchant: { Args: never; Returns: boolean }
      is_merchant_super_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      admin_role: "admin" | "super_admin"
      customer_position: "left" | "right"
      merchant_role: "super_admin" | "admin"
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
      admin_role: ["admin", "super_admin"],
      customer_position: ["left", "right"],
      merchant_role: ["super_admin", "admin"],
    },
  },
} as const
