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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          alias: string
          calle: string
          ciudad: string | null
          comuna: string
          created_at: string | null
          customer_id: string
          depto: string | null
          id: string
          is_default: boolean | null
          numero: string
          observaciones: string | null
          updated_at: string | null
        }
        Insert: {
          alias?: string
          calle: string
          ciudad?: string | null
          comuna: string
          created_at?: string | null
          customer_id: string
          depto?: string | null
          id?: string
          is_default?: boolean | null
          numero: string
          observaciones?: string | null
          updated_at?: string | null
        }
        Update: {
          alias?: string
          calle?: string
          ciudad?: string | null
          comuna?: string
          created_at?: string | null
          customer_id?: string
          depto?: string | null
          id?: string
          is_default?: boolean | null
          numero?: string
          observaciones?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_addresses_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
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
          observaciones: string | null
          opened_at: string | null
          opening_cash: number
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          observaciones?: string | null
          opened_at?: string | null
          opening_cash?: number
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          observaciones?: string | null
          opened_at?: string | null
          opening_cash?: number
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      category_variants: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_variants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_items: {
        Row: {
          allow_customization: boolean
          allow_variant_change: boolean
          category_id: string
          combo_product_id: string
          created_at: string
          default_product_id: string | null
          default_variant_id: string | null
          display_order: number
          id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          allow_customization?: boolean
          allow_variant_change?: boolean
          category_id: string
          combo_product_id: string
          created_at?: string
          default_product_id?: string | null
          default_variant_id?: string | null
          display_order?: number
          id?: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          allow_customization?: boolean
          allow_variant_change?: boolean
          category_id?: string
          combo_product_id?: string
          created_at?: string
          default_product_id?: string | null
          default_variant_id?: string | null
          display_order?: number
          id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_combo_product_id_fkey"
            columns: ["combo_product_id"]
            isOneToOne: false
            referencedRelation: "combo_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_default_product_id_fkey"
            columns: ["default_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_default_variant_id_fkey"
            columns: ["default_variant_id"]
            isOneToOne: false
            referencedRelation: "category_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_products: {
        Row: {
          active: boolean
          base_price: number
          combo_discount: number
          created_at: string
          id: string
          included_variants: boolean
          pricing_mode: string
          product_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number
          combo_discount?: number
          created_at?: string
          id?: string
          included_variants?: boolean
          pricing_mode?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number
          combo_discount?: number
          created_at?: string
          id?: string
          included_variants?: boolean
          pricing_mode?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          apellidos: string | null
          cantidad_runas: number | null
          created_at: string | null
          created_by_user_id: string | null
          email: string | null
          estado_cliente: Database["public"]["Enums"]["estado_cliente"] | null
          fecha_nacimiento: string | null
          id: string
          motivo_estado: string | null
          name: string | null
          nombres: string | null
          phone: string | null
          rut: string | null
          ultima_compra: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          valor_cliente: number | null
        }
        Insert: {
          apellido?: string | null
          apellidos?: string | null
          cantidad_runas?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string | null
          estado_cliente?: Database["public"]["Enums"]["estado_cliente"] | null
          fecha_nacimiento?: string | null
          id?: string
          motivo_estado?: string | null
          name?: string | null
          nombres?: string | null
          phone?: string | null
          rut?: string | null
          ultima_compra?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          valor_cliente?: number | null
        }
        Update: {
          apellido?: string | null
          apellidos?: string | null
          cantidad_runas?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string | null
          estado_cliente?: Database["public"]["Enums"]["estado_cliente"] | null
          fecha_nacimiento?: string | null
          id?: string
          motivo_estado?: string | null
          name?: string | null
          nombres?: string | null
          phone?: string | null
          rut?: string | null
          ultima_compra?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          valor_cliente?: number | null
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          delivery_fee: number
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          delivery_fee?: number
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          delivery_fee?: number
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
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
      order_audits: {
        Row: {
          created_at: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          order_id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          combo_data: Json | null
          created_at: string | null
          created_by_user_id: string | null
          customer_id: string | null
          delivery_address: string | null
          delivery_comuna: string | null
          delivery_distance: number | null
          delivery_fee: number | null
          delivery_number: string | null
          delivery_zone_id: string | null
          discount: number | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          items: Json
          nombre_resumen: string | null
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
          combo_data?: Json | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_comuna?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
          delivery_zone_id?: string | null
          discount?: number | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          items: Json
          nombre_resumen?: string | null
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
          combo_data?: Json | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_comuna?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
          delivery_zone_id?: string | null
          discount?: number | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          items?: Json
          nombre_resumen?: string | null
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
            foreignKeyName: "orders_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_password_reset_codes_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_password_reset_codes_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_extras: {
        Row: {
          active: boolean | null
          category_id: string | null
          created_at: string | null
          id: string
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_extras_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifiers: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          price: number | null
          product_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          price?: number | null
          product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          price?: number | null
          product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_modifiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variant_options: {
        Row: {
          active: boolean
          category_variant_id: string
          created_at: string
          id: string
          is_default: boolean
          is_enabled: boolean | null
          price: number
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_variant_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean | null
          price?: number
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_variant_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean | null
          price?: number
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_options_category_variant_id_fkey"
            columns: ["category_variant_id"]
            isOneToOne: false
            referencedRelation: "category_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          prices: Json
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          prices: Json
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          prices?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      runas_transactions: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          id: string
          motivo: string | null
          order_id: string | null
          origen: Database["public"]["Enums"]["origen_movimiento"] | null
          responsable_id: string | null
          runas: number
          type: Database["public"]["Enums"]["runa_movement_type"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          motivo?: string | null
          order_id?: string | null
          origen?: Database["public"]["Enums"]["origen_movimiento"] | null
          responsable_id?: string | null
          runas: number
          type?: Database["public"]["Enums"]["runa_movement_type"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          motivo?: string | null
          order_id?: string | null
          origen?: Database["public"]["Enums"]["origen_movimiento"] | null
          responsable_id?: string | null
          runas?: number
          type?: Database["public"]["Enums"]["runa_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "runas_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runas_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runas_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_kitchen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runas_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          pass_hash: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          pass_hash: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
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
      app_orders_delivery: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_comuna: string | null
          delivery_number: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null
          id: string | null
          order_number: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          total: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      app_orders_kitchen: {
        Row: {
          created_at: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null
          id: string | null
          items: Json | null
          nombre_resumen: string | null
          notes: string | null
          order_number: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"] | null
          id?: string | null
          items?: Json | null
          nombre_resumen?: string | null
          notes?: string | null
          order_number?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"] | null
          id?: string | null
          items?: Json | null
          nombre_resumen?: string | null
          notes?: string | null
          order_number?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_public_users: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_jwt: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      authenticate_user: {
        Args: { _password: string; _username: string }
        Returns: {
          active: boolean
          email: string
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          username: string
        }[]
      }
      cleanup_expired_reset_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_simple_hash: {
        Args: { password: string }
        Returns: string
      }
      set_user_password: {
        Args: { new_password: string; user_uuid: string }
        Returns: boolean
      }
      verify_password: {
        Args: { hash: string; password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "Administrador"
        | "Caja"
        | "Cocina"
        | "Reparto"
        | "Viewer"
        | "Preparador"
        | "Cajero"
      cash_movement_type: "ingreso" | "egreso"
      estado_cliente: "Activo" | "Inactivo" | "Bloqueado"
      fulfillment_type: "retiro" | "delivery"
      order_status:
        | "Pendiente"
        | "En preparación"
        | "En pausa"
        | "Listo"
        | "Entregado"
        | "Cancelado"
      origen_movimiento: "POS" | "Web" | "Manual"
      payment_method: "efectivo" | "mp" | "pos" | "mixto"
      runa_movement_type: "acumulacion" | "canje" | "ajuste" | "promo"
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
      app_role: [
        "Administrador",
        "Caja",
        "Cocina",
        "Reparto",
        "Viewer",
        "Preparador",
        "Cajero",
      ],
      cash_movement_type: ["ingreso", "egreso"],
      estado_cliente: ["Activo", "Inactivo", "Bloqueado"],
      fulfillment_type: ["retiro", "delivery"],
      order_status: [
        "Pendiente",
        "En preparación",
        "En pausa",
        "Listo",
        "Entregado",
        "Cancelado",
      ],
      origen_movimiento: ["POS", "Web", "Manual"],
      payment_method: ["efectivo", "mp", "pos", "mixto"],
      runa_movement_type: ["acumulacion", "canje", "ajuste", "promo"],
    },
  },
} as const
