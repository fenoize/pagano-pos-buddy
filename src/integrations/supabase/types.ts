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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      cash_movements: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          note: string | null
          session_id: string | null
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          note?: string | null
          session_id?: string | null
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          note?: string | null
          session_id?: string | null
          type?: Database["public"]["Enums"]["cash_movement_type"]
        }
        Relationships: []
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closing_cash: number | null
          id: string
          opened_at: string | null
          opening_cash: number
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          opened_at?: string | null
          opening_cash?: number
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          opened_at?: string | null
          opening_cash?: number
          user_id?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      customers: {
        Row: {
          apellido: string | null
          cantidad_runas: number | null
          comuna: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          id: string
          name: string | null
          numeracion: string | null
          phone: string | null
          rut: string | null
          ultima_compra: string | null
          updated_at: string | null
          valor_cliente: number | null
        }
        Insert: {
          apellido?: string | null
          cantidad_runas?: number | null
          comuna?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          name?: string | null
          numeracion?: string | null
          phone?: string | null
          rut?: string | null
          ultima_compra?: string | null
          updated_at?: string | null
          valor_cliente?: number | null
        }
        Update: {
          apellido?: string | null
          cantidad_runas?: number | null
          comuna?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          id?: string
          name?: string | null
          numeracion?: string | null
          phone?: string | null
          rut?: string | null
          ultima_compra?: string | null
          updated_at?: string | null
          valor_cliente?: number | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          ingredient: string
          stock: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          ingredient: string
          stock?: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          ingredient?: string
          stock?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          delivery_address: string | null
          delivery_comuna: string | null
          delivery_distance: number | null
          delivery_fee: number | null
          delivery_number: string | null
          discount: number | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          items: Json
          notes: string | null
          order_number: number
          payment_efectivo: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_mp: number | null
          payment_pos: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_comuna?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
          discount?: number | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          items: Json
          notes?: string | null
          order_number?: number
          payment_efectivo?: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_mp?: number | null
          payment_pos?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_comuna?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
          discount?: number | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          items?: Json
          notes?: string | null
          order_number?: number
          payment_efectivo?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_mp?: number | null
          payment_pos?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          prices: Json
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          prices: Json
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          prices?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          pass_hash: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          pass_hash: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          pass_hash?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "Administrador" | "Caja" | "Cocina" | "Reparto" | "Viewer"
      cash_movement_type: "ingreso" | "egreso"
      fulfillment_type: "retiro" | "delivery"
      order_status:
        | "Pendiente"
        | "En preparación"
        | "En pausa"
        | "Listo"
        | "Entregado"
        | "Cancelado"
      payment_method: "efectivo" | "mp" | "pos" | "mixto"
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
      app_role: ["Administrador", "Caja", "Cocina", "Reparto", "Viewer"],
      cash_movement_type: ["ingreso", "egreso"],
      fulfillment_type: ["retiro", "delivery"],
      order_status: [
        "Pendiente",
        "En preparación",
        "En pausa",
        "Listo",
        "Entregado",
        "Cancelado",
      ],
      payment_method: ["efectivo", "mp", "pos", "mixto"],
    },
  },
} as const
