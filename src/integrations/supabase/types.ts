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
          comuna_id: string | null
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
          comuna_id?: string | null
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
          comuna_id?: string | null
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
            foreignKeyName: "addresses_comuna_id_fkey"
            columns: ["comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_addresses_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
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
          account_id: string | null
          amount: number
          category: string | null
          created_at: string | null
          id: string
          note: string | null
          session_id: string | null
          synced_to_finance: boolean | null
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          session_id?: string | null
          synced_to_finance?: boolean | null
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          session_id?: string | null
          synced_to_finance?: boolean | null
          type?: Database["public"]["Enums"]["cash_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_session_audits: {
        Row: {
          cash_session_id: string
          changed_at: string
          changed_by_user_id: string | null
          field_name: string
          id: string
          new_totals: Json | null
          new_value: string | null
          old_totals: Json | null
          old_value: string | null
          order_id: string
          reason: string | null
        }
        Insert: {
          cash_session_id: string
          changed_at?: string
          changed_by_user_id?: string | null
          field_name: string
          id?: string
          new_totals?: Json | null
          new_value?: string | null
          old_totals?: Json | null
          old_value?: string | null
          order_id: string
          reason?: string | null
        }
        Update: {
          cash_session_id?: string
          changed_at?: string
          changed_by_user_id?: string | null
          field_name?: string
          id?: string
          new_totals?: Json | null
          new_value?: string | null
          old_totals?: Json | null
          old_value?: string | null
          order_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_session_audits_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_session_audits_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_session_audits_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_session_audits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_session_audits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_kitchen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_session_audits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_export_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "cash_session_audits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_session_audits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          accept_app_orders: boolean | null
          closed_at: string | null
          closing_cash: number | null
          id: string
          observaciones: string | null
          opened_at: string | null
          opening_cash: number
          user_id: string
        }
        Insert: {
          accept_app_orders?: boolean | null
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          observaciones?: string | null
          opened_at?: string | null
          opening_cash?: number
          user_id: string
        }
        Update: {
          accept_app_orders?: boolean | null
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
          display_order: number
          id: string
          is_default: boolean
          name: string
          show_in_app: boolean | null
          show_in_pos: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          name: string
          show_in_app?: boolean | null
          show_in_pos?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_default?: boolean
          name?: string
          show_in_app?: boolean | null
          show_in_pos?: boolean | null
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
      comunas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
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
      coupon_allowed_categories: {
        Row: {
          category_id: string
          coupon_id: string
        }
        Insert: {
          category_id: string
          coupon_id: string
        }
        Update: {
          category_id?: string
          coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_allowed_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_allowed_categories_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_allowed_extras: {
        Row: {
          coupon_id: string
          extra_id: string
        }
        Insert: {
          coupon_id: string
          extra_id: string
        }
        Update: {
          coupon_id?: string
          extra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_allowed_extras_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_allowed_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "product_extras"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_allowed_modifiers: {
        Row: {
          coupon_id: string
          modifier_id: string
        }
        Insert: {
          coupon_id: string
          modifier_id: string
        }
        Update: {
          coupon_id?: string
          modifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_allowed_modifiers_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_allowed_modifiers_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "product_modifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_allowed_products: {
        Row: {
          coupon_id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_allowed_products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_allowed_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_allowed_variants: {
        Row: {
          category_variant_id: string
          coupon_id: string
        }
        Insert: {
          category_variant_id: string
          coupon_id: string
        }
        Update: {
          category_variant_id?: string
          coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_allowed_variants_category_variant_id_fkey"
            columns: ["category_variant_id"]
            isOneToOne: false
            referencedRelation: "category_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_allowed_variants_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_applications: {
        Row: {
          applied_at: string
          applied_by: string | null
          coupon_id: string
          discount_delivery: number
          discount_products: number
          id: string
          order_id: string
          payload: Json | null
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          coupon_id: string
          discount_delivery?: number
          discount_products?: number
          id?: string
          order_id: string
          payload?: Json | null
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          coupon_id?: string
          discount_delivery?: number
          discount_products?: number
          id?: string
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_applications_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_applications_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_applications_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_kitchen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_export_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "coupon_applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_applications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_excluded_categories: {
        Row: {
          category_id: string
          coupon_id: string
        }
        Insert: {
          category_id: string
          coupon_id: string
        }
        Update: {
          category_id?: string
          coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_excluded_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_excluded_categories_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_excluded_extras: {
        Row: {
          coupon_id: string
          extra_id: string
        }
        Insert: {
          coupon_id: string
          extra_id: string
        }
        Update: {
          coupon_id?: string
          extra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_excluded_extras_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_excluded_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "product_extras"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_excluded_modifiers: {
        Row: {
          coupon_id: string
          modifier_id: string
        }
        Insert: {
          coupon_id: string
          modifier_id: string
        }
        Update: {
          coupon_id?: string
          modifier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_excluded_modifiers_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_excluded_modifiers_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "product_modifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_excluded_products: {
        Row: {
          coupon_id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_excluded_products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_excluded_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_excluded_variants: {
        Row: {
          category_variant_id: string
          coupon_id: string
        }
        Insert: {
          category_variant_id: string
          coupon_id: string
        }
        Update: {
          category_variant_id?: string
          coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_excluded_variants_category_variant_id_fkey"
            columns: ["category_variant_id"]
            isOneToOne: false
            referencedRelation: "category_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_excluded_variants_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          customer_id: string
          used_count: number
        }
        Insert: {
          coupon_id: string
          customer_id: string
          used_count?: number
        }
        Update: {
          coupon_id?: string
          customer_id?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "coupon_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          affects_delivery: boolean
          affects_products: boolean
          affects_tip: boolean
          allow_manual_line_selection: boolean
          allow_stack: boolean
          amount: number
          apply_to_combo_children: boolean
          apply_to_discounted: boolean
          code: string
          created_at: string
          created_by: string | null
          date_end: string | null
          date_start: string | null
          delivery_amount: number | null
          delivery_mode: string | null
          description: string | null
          id: string
          is_active: boolean
          max_spend: number | null
          min_spend: number | null
          roles_allowed: string[] | null
          time_windows: Json | null
          type: string
          usage_limit_per_customer: number | null
          usage_limit_total: number | null
        }
        Insert: {
          affects_delivery?: boolean
          affects_products?: boolean
          affects_tip?: boolean
          allow_manual_line_selection?: boolean
          allow_stack?: boolean
          amount: number
          apply_to_combo_children?: boolean
          apply_to_discounted?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          delivery_amount?: number | null
          delivery_mode?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_spend?: number | null
          min_spend?: number | null
          roles_allowed?: string[] | null
          time_windows?: Json | null
          type: string
          usage_limit_per_customer?: number | null
          usage_limit_total?: number | null
        }
        Update: {
          affects_delivery?: boolean
          affects_products?: boolean
          affects_tip?: boolean
          allow_manual_line_selection?: boolean
          allow_stack?: boolean
          amount?: number
          apply_to_combo_children?: boolean
          apply_to_discounted?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          date_end?: string | null
          date_start?: string | null
          delivery_amount?: number | null
          delivery_mode?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_spend?: number | null
          min_spend?: number | null
          roles_allowed?: string[] | null
          time_windows?: Json | null
          type?: string
          usage_limit_per_customer?: number | null
          usage_limit_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_accounts: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean
          id: string
          last_login: string | null
          pass_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean
          id?: string
          last_login?: string | null
          pass_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean
          id?: string
          last_login?: string | null
          pass_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_badges: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      customer_badges_awarded: {
        Row: {
          awarded_at: string
          badge_id: string
          customer_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          customer_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_badges_awarded_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "customer_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_badges_awarded_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_badges_awarded_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_email_verifications: {
        Row: {
          created_at: string
          customer_account_id: string
          expires_at: string
          id: string
          token_hash: string
          used: boolean
        }
        Insert: {
          created_at?: string
          customer_account_id: string
          expires_at: string
          id?: string
          token_hash: string
          used?: boolean
        }
        Update: {
          created_at?: string
          customer_account_id?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_email_verifications_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_level_definitions: {
        Row: {
          benefits: Json | null
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          level_code: string
          level_name: string
          level_order: number
          max_points: number | null
          min_points: number
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_code: string
          level_name: string
          level_order: number
          max_points?: number | null
          min_points: number
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_code?: string
          level_name?: string
          level_order?: number
          max_points?: number | null
          min_points?: number
        }
        Relationships: []
      }
      customer_password_resets: {
        Row: {
          code_hash: string
          created_at: string
          customer_account_id: string
          expires_at: string
          id: string
          ip_address: unknown
          used: boolean
        }
        Insert: {
          code_hash: string
          created_at?: string
          customer_account_id: string
          expires_at: string
          id?: string
          ip_address?: unknown
          used?: boolean
        }
        Update: {
          code_hash?: string
          created_at?: string
          customer_account_id?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_password_resets_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_runa_subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          end_date: string | null
          id: string
          is_active: boolean
          last_executed_at: string | null
          next_execution_date: string | null
          notes: string | null
          runas_amount: number
          start_date: string | null
          subscription_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          next_execution_date?: string | null
          notes?: string | null
          runas_amount?: number
          start_date?: string | null
          subscription_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          next_execution_date?: string | null
          notes?: string | null
          runas_amount?: number
          start_date?: string | null
          subscription_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_runa_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_runa_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_runa_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_runa_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_id: string | null
          apellido: string | null
          apellidos: string | null
          auth_user_id: string | null
          avatar_url: string | null
          cantidad_runas: number | null
          created_at: string | null
          created_by_user_id: string | null
          email: string | null
          estado_cliente: Database["public"]["Enums"]["estado_cliente"] | null
          fecha_nacimiento: string | null
          id: string
          marketing_consent_date: string | null
          marketing_consent_source: string | null
          marketing_opt_in: boolean
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
          account_id?: string | null
          apellido?: string | null
          apellidos?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          cantidad_runas?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string | null
          estado_cliente?: Database["public"]["Enums"]["estado_cliente"] | null
          fecha_nacimiento?: string | null
          id?: string
          marketing_consent_date?: string | null
          marketing_consent_source?: string | null
          marketing_opt_in?: boolean
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
          account_id?: string | null
          apellido?: string | null
          apellidos?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          cantidad_runas?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          email?: string | null
          estado_cliente?: Database["public"]["Enums"]["estado_cliente"] | null
          fecha_nacimiento?: string | null
          id?: string
          marketing_consent_date?: string | null
          marketing_consent_source?: string | null
          marketing_opt_in?: boolean
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
        Relationships: [
          {
            foreignKeyName: "customers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_cash_pending: {
        Row: {
          amount: number
          collected_at: string
          created_at: string | null
          delivery_person_id: string
          deposited_at: string | null
          deposited_to_session_id: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          collected_at?: string
          created_at?: string | null
          delivery_person_id: string
          deposited_at?: string | null
          deposited_to_session_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          collected_at?: string
          created_at?: string | null
          delivery_person_id?: string
          deposited_at?: string | null
          deposited_to_session_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_payments: {
        Row: {
          account_id: string | null
          base_amount: number
          company_pays_tax: boolean
          created_at: string
          delivery_person_id: string
          expense_id: string | null
          gross_amount: number
          has_invoice: boolean
          id: string
          net_amount: number
          notes: string | null
          order_id: string
          paid_by: string | null
          payment_date: string | null
          shift_bonus: number
          status: string
          tax_amount: number
          tax_expense_id: string | null
          tax_percentage: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          base_amount?: number
          company_pays_tax?: boolean
          created_at?: string
          delivery_person_id: string
          expense_id?: string | null
          gross_amount?: number
          has_invoice?: boolean
          id?: string
          net_amount?: number
          notes?: string | null
          order_id: string
          paid_by?: string | null
          payment_date?: string | null
          shift_bonus?: number
          status?: string
          tax_amount?: number
          tax_expense_id?: string | null
          tax_percentage?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          base_amount?: number
          company_pays_tax?: boolean
          created_at?: string
          delivery_person_id?: string
          expense_id?: string | null
          gross_amount?: number
          has_invoice?: boolean
          id?: string
          net_amount?: number
          notes?: string | null
          order_id?: string
          paid_by?: string | null
          payment_date?: string | null
          shift_bonus?: number
          status?: string
          tax_amount?: number
          tax_expense_id?: string | null
          tax_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "finance_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_kitchen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_export_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_payments_tax_expense_id_fkey"
            columns: ["tax_expense_id"]
            isOneToOne: false
            referencedRelation: "finance_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_settings: {
        Row: {
          assignment_mode: string
          auto_zone_detection: boolean | null
          created_at: string
          id: string
          map_provider: string
          mapbox_token: string | null
          store_address: string | null
          store_lat: number | null
          store_lng: number | null
          updated_at: string
        }
        Insert: {
          assignment_mode?: string
          auto_zone_detection?: boolean | null
          created_at?: string
          id?: string
          map_provider?: string
          mapbox_token?: string | null
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string
        }
        Update: {
          assignment_mode?: string
          auto_zone_detection?: boolean | null
          created_at?: string
          id?: string
          map_provider?: string
          mapbox_token?: string | null
          store_address?: string | null
          store_lat?: number | null
          store_lng?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          active: boolean
          calculation_mode: string | null
          created_at: string
          delivery_fee: number
          description: string | null
          driver_payment_amount: number | null
          driver_payment_mode: string | null
          driver_payment_per_km: number | null
          driver_payment_percentage: number | null
          id: string
          min_fee: number | null
          name: string
          polygon: Json | null
          price_per_km: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          calculation_mode?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          driver_payment_amount?: number | null
          driver_payment_mode?: string | null
          driver_payment_per_km?: number | null
          driver_payment_percentage?: number | null
          id?: string
          min_fee?: number | null
          name: string
          polygon?: Json | null
          price_per_km?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          calculation_mode?: string | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          driver_payment_amount?: number | null
          driver_payment_mode?: string | null
          driver_payment_per_km?: number | null
          driver_payment_percentage?: number | null
          id?: string
          min_fee?: number | null
          name?: string
          polygon?: Json | null
          price_per_km?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      finance_accounts: {
        Row: {
          balance: number
          code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          balance?: number
          code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expense_categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          include_vat: boolean | null
          is_active: boolean | null
          name: string
          requires_document: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          include_vat?: boolean | null
          is_active?: boolean | null
          name: string
          requires_document?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          include_vat?: boolean | null
          is_active?: boolean | null
          name?: string
          requires_document?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_expenses: {
        Row: {
          account_id: string
          amount: number
          attachment_url: string | null
          cash_movement_id: string | null
          cash_session_id: string | null
          category: string
          created_at: string
          currency: string
          document_number: string | null
          document_type: string | null
          expense_date: string
          expense_type: string
          fixed_subtype: string | null
          id: string
          notes: string | null
          payment_method: string | null
          recurring_id: string | null
          registered_by: string | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          attachment_url?: string | null
          cash_movement_id?: string | null
          cash_session_id?: string | null
          category: string
          created_at?: string
          currency?: string
          document_number?: string | null
          document_type?: string | null
          expense_date?: string
          expense_type: string
          fixed_subtype?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          recurring_id?: string | null
          registered_by?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          attachment_url?: string | null
          cash_movement_id?: string | null
          cash_session_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          document_number?: string | null
          document_type?: string | null
          expense_date?: string
          expense_type?: string
          fixed_subtype?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          recurring_id?: string | null
          registered_by?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_cash_movement_id_fkey"
            columns: ["cash_movement_id"]
            isOneToOne: false
            referencedRelation: "cash_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "finance_recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_fixed_expenses: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          department: string
          document_type: string | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          is_variable_amount: boolean
          name: string
          notes: string | null
          payment_day: number | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          department: string
          document_type?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_variable_amount?: boolean
          name: string
          notes?: string | null
          payment_day?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          department?: string
          document_type?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_variable_amount?: boolean
          name?: string
          notes?: string | null
          payment_day?: number | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_fixed_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_recurring_expenses: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_settings: {
        Row: {
          alerta_cierre_financiero: boolean | null
          alerta_egreso_sobre_monto: boolean | null
          aplicar_redondeo: boolean | null
          banco_principal: string | null
          ciudad: string | null
          comuna: string | null
          correo_contable: string | null
          correos_notificacion: string | null
          created_at: string | null
          dia_corte_mensual: number | null
          dia_corte_semanal: string | null
          direccion_tributaria: string | null
          exigir_documento_sobre_monto: boolean | null
          fecha_inicio_actividades: string | null
          giro: string | null
          id: string
          moneda: string | null
          monto_alerta_egreso: number | null
          monto_aprobacion_oc: number | null
          monto_exigir_documento: number | null
          monto_max_caja_chica: number | null
          monto_min_orden_compra: number | null
          nombre_fantasia: string | null
          pais: string | null
          periodo_cierre: string | null
          razon_social: string | null
          regla_redondeo: string | null
          rut: string | null
          telefono_contable: string | null
          updated_at: string | null
          usuarios_aprobadores_oc: string[] | null
        }
        Insert: {
          alerta_cierre_financiero?: boolean | null
          alerta_egreso_sobre_monto?: boolean | null
          aplicar_redondeo?: boolean | null
          banco_principal?: string | null
          ciudad?: string | null
          comuna?: string | null
          correo_contable?: string | null
          correos_notificacion?: string | null
          created_at?: string | null
          dia_corte_mensual?: number | null
          dia_corte_semanal?: string | null
          direccion_tributaria?: string | null
          exigir_documento_sobre_monto?: boolean | null
          fecha_inicio_actividades?: string | null
          giro?: string | null
          id?: string
          moneda?: string | null
          monto_alerta_egreso?: number | null
          monto_aprobacion_oc?: number | null
          monto_exigir_documento?: number | null
          monto_max_caja_chica?: number | null
          monto_min_orden_compra?: number | null
          nombre_fantasia?: string | null
          pais?: string | null
          periodo_cierre?: string | null
          razon_social?: string | null
          regla_redondeo?: string | null
          rut?: string | null
          telefono_contable?: string | null
          updated_at?: string | null
          usuarios_aprobadores_oc?: string[] | null
        }
        Update: {
          alerta_cierre_financiero?: boolean | null
          alerta_egreso_sobre_monto?: boolean | null
          aplicar_redondeo?: boolean | null
          banco_principal?: string | null
          ciudad?: string | null
          comuna?: string | null
          correo_contable?: string | null
          correos_notificacion?: string | null
          created_at?: string | null
          dia_corte_mensual?: number | null
          dia_corte_semanal?: string | null
          direccion_tributaria?: string | null
          exigir_documento_sobre_monto?: boolean | null
          fecha_inicio_actividades?: string | null
          giro?: string | null
          id?: string
          moneda?: string | null
          monto_alerta_egreso?: number | null
          monto_aprobacion_oc?: number | null
          monto_exigir_documento?: number | null
          monto_max_caja_chica?: number | null
          monto_min_orden_compra?: number | null
          nombre_fantasia?: string | null
          pais?: string | null
          periodo_cierre?: string | null
          razon_social?: string | null
          regla_redondeo?: string | null
          rut?: string | null
          telefono_contable?: string | null
          updated_at?: string | null
          usuarios_aprobadores_oc?: string[] | null
        }
        Relationships: []
      }
      financial_closures: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_end: string
          date_start: string
          filters: Json | null
          fixed_expenses: number | null
          id: string
          is_locked: boolean
          margin_amount: number | null
          margin_percent: number | null
          non_recurring_fixed_expenses: number | null
          notes: string | null
          period_type: string
          recurring_fixed_expenses: number | null
          total_app: number | null
          total_balance: number | null
          total_cash: number | null
          total_expenses: number | null
          total_pos: number | null
          total_tax: number | null
          total_transfer: number | null
          totals: Json
          tz: string
          updated_at: string | null
          variable_expenses: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_end: string
          date_start: string
          filters?: Json | null
          fixed_expenses?: number | null
          id?: string
          is_locked?: boolean
          margin_amount?: number | null
          margin_percent?: number | null
          non_recurring_fixed_expenses?: number | null
          notes?: string | null
          period_type: string
          recurring_fixed_expenses?: number | null
          total_app?: number | null
          total_balance?: number | null
          total_cash?: number | null
          total_expenses?: number | null
          total_pos?: number | null
          total_tax?: number | null
          total_transfer?: number | null
          totals?: Json
          tz?: string
          updated_at?: string | null
          variable_expenses?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_end?: string
          date_start?: string
          filters?: Json | null
          fixed_expenses?: number | null
          id?: string
          is_locked?: boolean
          margin_amount?: number | null
          margin_percent?: number | null
          non_recurring_fixed_expenses?: number | null
          notes?: string | null
          period_type?: string
          recurring_fixed_expenses?: number | null
          total_app?: number | null
          total_balance?: number | null
          total_cash?: number | null
          total_expenses?: number | null
          total_pos?: number | null
          total_tax?: number | null
          total_transfer?: number | null
          totals?: Json
          tz?: string
          updated_at?: string | null
          variable_expenses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      marketing_app_promotions: {
        Row: {
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_type: string
          cta_url: string | null
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          priority: number
          product_id: string | null
          start_date: string | null
          subtitle: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_type?: string
          cta_url?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          product_id?: string | null
          start_date?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_type?: string
          cta_url?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          product_id?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_app_promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_app_promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_app_promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_promo_analytics: {
        Row: {
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          order_id: string | null
          promo_id: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          promo_id: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          promo_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_promo_analytics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_kitchen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_export_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "marketing_app_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_promo_analytics_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "marketing_promo_metrics"
            referencedColumns: ["promo_id"]
          },
        ]
      }
      marketing_push_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          error_count: number | null
          id: string
          message: string
          recipients_count: number | null
          scheduled_at: string | null
          segment: string
          send_type: string
          sent_at: string | null
          sent_count: number | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          id?: string
          message: string
          recipients_count?: number | null
          scheduled_at?: string | null
          segment?: string
          send_type?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          id?: string
          message?: string
          recipients_count?: number | null
          scheduled_at?: string | null
          segment?: string
          send_type?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_push_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_push_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string
          channel: string
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          payload: Json
          sent_at: string | null
          status: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "notification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          customer_id: string
          delivery_push_enabled: boolean
          id: string
          marketing_push_enabled: boolean
          onesignal_subscribed: boolean
          order_push_enabled: boolean
          permission_prompted_at: string | null
          runas_push_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_push_enabled?: boolean
          id?: string
          marketing_push_enabled?: boolean
          onesignal_subscribed?: boolean
          order_push_enabled?: boolean
          permission_prompted_at?: string | null
          runas_push_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_push_enabled?: boolean
          id?: string
          marketing_push_enabled?: boolean
          onesignal_subscribed?: boolean
          order_push_enabled?: boolean
          permission_prompted_at?: string | null
          runas_push_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      online_order_settings: {
        Row: {
          app_delivery_enabled: boolean
          app_orders_enabled: boolean
          app_pickup_enabled: boolean
          created_at: string
          id: string
          mp_client_id: string | null
          mp_client_secret: string | null
          mp_enabled: boolean
          mp_mode: string
          mp_payment_enabled: boolean | null
          mp_public_key: string | null
          runas_payment_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          app_delivery_enabled?: boolean
          app_orders_enabled?: boolean
          app_pickup_enabled?: boolean
          created_at?: string
          id?: string
          mp_client_id?: string | null
          mp_client_secret?: string | null
          mp_enabled?: boolean
          mp_mode?: string
          mp_payment_enabled?: boolean | null
          mp_public_key?: string | null
          runas_payment_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          app_delivery_enabled?: boolean
          app_orders_enabled?: boolean
          app_pickup_enabled?: boolean
          created_at?: string
          id?: string
          mp_client_id?: string | null
          mp_client_secret?: string | null
          mp_enabled?: boolean
          mp_mode?: string
          mp_payment_enabled?: boolean | null
          mp_public_key?: string | null
          runas_payment_enabled?: boolean | null
          updated_at?: string
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
      order_delivery_audit: {
        Row: {
          changed_at: string
          changed_by_user_id: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          order_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by_user_id?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by_user_id?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_delivery_audit_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delivery_audit_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delivery_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delivery_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_kitchen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delivery_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_export_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_delivery_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_delivery_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_session_id: string | null
          combo_data: Json | null
          created_at: string | null
          created_by_user_id: string | null
          customer_id: string | null
          delivery_address: string | null
          delivery_assigned_at: string | null
          delivery_comuna: string | null
          delivery_comuna_id: string | null
          delivery_delivered_at: string | null
          delivery_distance: number | null
          delivery_fee: number | null
          delivery_number: string | null
          delivery_payment_amount: number | null
          delivery_person_id: string | null
          delivery_person_name: string | null
          delivery_reference: string | null
          delivery_zone_id: string | null
          delivery_zone_name: string | null
          discount: number | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          items: Json
          nombre_resumen: string | null
          notes: string | null
          order_number: number
          payment_aplicacion: number | null
          payment_efectivo: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_mp: number | null
          payment_pos: number | null
          payment_runas: number | null
          pickup_mode: string | null
          source: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at: string | null
        }
        Insert: {
          cash_session_id?: string | null
          combo_data?: Json | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_assigned_at?: string | null
          delivery_comuna?: string | null
          delivery_comuna_id?: string | null
          delivery_delivered_at?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
          delivery_payment_amount?: number | null
          delivery_person_id?: string | null
          delivery_person_name?: string | null
          delivery_reference?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name?: string | null
          discount?: number | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          items: Json
          nombre_resumen?: string | null
          notes?: string | null
          order_number?: number
          payment_aplicacion?: number | null
          payment_efectivo?: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_mp?: number | null
          payment_pos?: number | null
          payment_runas?: number | null
          pickup_mode?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          total: number
          updated_at?: string | null
        }
        Update: {
          cash_session_id?: string | null
          combo_data?: Json | null
          created_at?: string | null
          created_by_user_id?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          delivery_assigned_at?: string | null
          delivery_comuna?: string | null
          delivery_comuna_id?: string | null
          delivery_delivered_at?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
          delivery_payment_amount?: number | null
          delivery_person_id?: string | null
          delivery_person_name?: string | null
          delivery_reference?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name?: string | null
          discount?: number | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          items?: Json
          nombre_resumen?: string | null
          notes?: string | null
          order_number?: number
          payment_aplicacion?: number | null
          payment_efectivo?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_mp?: number | null
          payment_pos?: number | null
          payment_runas?: number | null
          pickup_mode?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_comuna_id_fkey"
            columns: ["delivery_comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      payment_methods: {
        Row: {
          affects_cash_flow: boolean | null
          counts_as_real_sale: boolean
          created_at: string | null
          display_name: string
          display_order: number
          icon: string
          id: string
          internal_only: boolean | null
          is_active: boolean
          name: string
          requires_change: boolean
          requires_operation_number: boolean
          requires_receipt: boolean
          updated_at: string | null
        }
        Insert: {
          affects_cash_flow?: boolean | null
          counts_as_real_sale?: boolean
          created_at?: string | null
          display_name: string
          display_order?: number
          icon?: string
          id?: string
          internal_only?: boolean | null
          is_active?: boolean
          name: string
          requires_change?: boolean
          requires_operation_number?: boolean
          requires_receipt?: boolean
          updated_at?: string | null
        }
        Update: {
          affects_cash_flow?: boolean | null
          counts_as_real_sale?: boolean
          created_at?: string | null
          display_name?: string
          display_order?: number
          icon?: string
          id?: string
          internal_only?: boolean | null
          is_active?: boolean
          name?: string
          requires_change?: boolean
          requires_operation_number?: boolean
          requires_receipt?: boolean
          updated_at?: string | null
        }
        Relationships: []
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
          display_order: number
          id: string
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category_id?: string | null
          created_at?: string | null
          display_order?: number
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
          raw_material_id: string | null
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
          raw_material_id?: string | null
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
          raw_material_id?: string | null
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
          {
            foreignKeyName: "product_variant_options_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
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
          raw_material_id: string | null
          show_in_app: boolean | null
          show_in_pos: boolean | null
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
          raw_material_id?: string | null
          show_in_app?: boolean | null
          show_in_pos?: boolean | null
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
          raw_material_id?: string | null
          show_in_app?: boolean | null
          show_in_pos?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string | null
          id: string
          purchase_id: string | null
          qty: number
          qty_pending: number | null
          qty_received: number | null
          raw_material_id: string | null
          total_cost: number | null
          unit_cost: number
          uom_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          purchase_id?: string | null
          qty: number
          qty_pending?: number | null
          qty_received?: number | null
          raw_material_id?: string | null
          total_cost?: number | null
          unit_cost: number
          uom_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          purchase_id?: string | null
          qty?: number
          qty_pending?: number | null
          qty_received?: number | null
          raw_material_id?: string | null
          total_cost?: number | null
          unit_cost?: number
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["po_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["po_status"] | null
          purchase_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["po_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["po_status"] | null
          purchase_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["po_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["po_status"] | null
          purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_status_history_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          po_number: string | null
          received_date: string | null
          request_id: string | null
          sent_at: string | null
          sent_method: string | null
          sent_to_contact_id: string | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number | null
          supplier_id: string | null
          tax: number | null
          total: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
          received_date?: string | null
          request_id?: string | null
          sent_at?: string | null
          sent_method?: string | null
          sent_to_contact_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number | null
          supplier_id?: string | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
          received_date?: string | null
          request_id?: string | null
          sent_at?: string | null
          sent_method?: string | null
          sent_to_contact_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number | null
          supplier_id?: string | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_sent_to_contact_id_fkey"
            columns: ["sent_to_contact_id"]
            isOneToOne: false
            referencedRelation: "supplier_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request_items: {
        Row: {
          created_at: string
          estimated_total: number | null
          estimated_unit_cost: number
          id: string
          notes: string | null
          qty: number
          raw_material_id: string
          request_id: string
          supplier_id: string
          uom_id: string
        }
        Insert: {
          created_at?: string
          estimated_total?: number | null
          estimated_unit_cost?: number
          id?: string
          notes?: string | null
          qty: number
          raw_material_id: string
          request_id: string
          supplier_id: string
          uom_id: string
        }
        Update: {
          created_at?: string
          estimated_total?: number | null
          estimated_unit_cost?: number
          id?: string
          notes?: string | null
          qty?: number
          raw_material_id?: string
          request_id?: string
          supplier_id?: string
          uom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          pr_number: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["purchase_request_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          pr_number: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["purchase_request_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          pr_number?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["purchase_request_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_config: {
        Row: {
          app_description: string
          app_name: string
          app_short_name: string
          app_type: string
          background_color: string
          created_at: string
          icon_192_url: string | null
          icon_512_url: string | null
          icon_maskable_url: string | null
          id: string
          portal_icon_url: string | null
          portal_subtitle: string | null
          splash_background_color: string | null
          splash_logo_url: string | null
          splash_text: string | null
          theme_color: string
          updated_at: string
        }
        Insert: {
          app_description?: string
          app_name?: string
          app_short_name?: string
          app_type?: string
          background_color?: string
          created_at?: string
          icon_192_url?: string | null
          icon_512_url?: string | null
          icon_maskable_url?: string | null
          id?: string
          portal_icon_url?: string | null
          portal_subtitle?: string | null
          splash_background_color?: string | null
          splash_logo_url?: string | null
          splash_text?: string | null
          theme_color?: string
          updated_at?: string
        }
        Update: {
          app_description?: string
          app_name?: string
          app_short_name?: string
          app_type?: string
          background_color?: string
          created_at?: string
          icon_192_url?: string | null
          icon_512_url?: string | null
          icon_maskable_url?: string | null
          id?: string
          portal_icon_url?: string | null
          portal_subtitle?: string | null
          splash_background_color?: string | null
          splash_logo_url?: string | null
          splash_text?: string | null
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          avg_cost: number | null
          base_uom_id: string | null
          category: string | null
          code: string | null
          conversion_to_base: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          last_cost: number | null
          min_stock: number | null
          name: string
          uom_id: string | null
          updated_at: string | null
        }
        Insert: {
          avg_cost?: number | null
          base_uom_id?: string | null
          category?: string | null
          code?: string | null
          conversion_to_base?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_cost?: number | null
          min_stock?: number | null
          name: string
          uom_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_cost?: number | null
          base_uom_id?: string | null
          category?: string | null
          code?: string | null
          conversion_to_base?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_cost?: number | null
          min_stock?: number | null
          name?: string
          uom_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_base_uom_id_fkey"
            columns: ["base_uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_materials_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "unit_of_measures"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_optional: boolean
          notes: string | null
          quantity_per_unit: number
          raw_material_id: string
          recipe_id: string
          uom_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_optional?: boolean
          notes?: string | null
          quantity_per_unit: number
          raw_material_id: string
          recipe_id: string
          uom_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_optional?: boolean
          notes?: string | null
          quantity_per_unit?: number
          raw_material_id?: string
          recipe_id?: string
          uom_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category_variant_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          preparation_notes: string | null
          product_id: string
          updated_at: string
          yield_quantity: number
          yield_uom_id: string | null
        }
        Insert: {
          category_variant_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          preparation_notes?: string | null
          product_id: string
          updated_at?: string
          yield_quantity?: number
          yield_uom_id?: string | null
        }
        Update: {
          category_variant_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          preparation_notes?: string | null
          product_id?: string
          updated_at?: string
          yield_quantity?: number
          yield_uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_category_variant_id_fkey"
            columns: ["category_variant_id"]
            isOneToOne: false
            referencedRelation: "category_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_yield_uom_id_fkey"
            columns: ["yield_uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      runa_auto_config: {
        Row: {
          config_key: string
          config_value: Json
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          id?: string
          updated_at?: string
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
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
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
            referencedRelation: "delivery_export_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "runas_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
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
      staff_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_balances: {
        Row: {
          avg_cost: number
          qty_on_hand: number
          raw_material_id: string
          updated_at: string | null
          warehouse_id: string
        }
        Insert: {
          avg_cost?: number
          qty_on_hand?: number
          raw_material_id: string
          updated_at?: string | null
          warehouse_id: string
        }
        Update: {
          avg_cost?: number
          qty_on_hand?: number
          raw_material_id?: string
          updated_at?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_balances_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_lots: {
        Row: {
          created_at: string | null
          exp_date: string | null
          id: string
          lot_code: string | null
          raw_material_id: string | null
        }
        Insert: {
          created_at?: string | null
          exp_date?: string | null
          id?: string
          lot_code?: string | null
          raw_material_id?: string | null
        }
        Update: {
          created_at?: string | null
          exp_date?: string | null
          id?: string
          lot_code?: string | null
          raw_material_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_lots_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_moves: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          move_type: Database["public"]["Enums"]["stock_move_type"]
          notes: string | null
          qty_in: number
          qty_out: number
          raw_material_id: string | null
          related_lot_id: string | null
          related_order_id: string | null
          related_purchase_id: string | null
          unit_cost: number | null
          uom_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          move_type: Database["public"]["Enums"]["stock_move_type"]
          notes?: string | null
          qty_in?: number
          qty_out?: number
          raw_material_id?: string | null
          related_lot_id?: string | null
          related_order_id?: string | null
          related_purchase_id?: string | null
          unit_cost?: number | null
          uom_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          move_type?: Database["public"]["Enums"]["stock_move_type"]
          notes?: string | null
          qty_in?: number
          qty_out?: number
          raw_material_id?: string | null
          related_lot_id?: string | null
          related_order_id?: string | null
          related_purchase_id?: string | null
          unit_cost?: number | null
          uom_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_related_lot_id_fkey"
            columns: ["related_lot_id"]
            isOneToOne: false
            referencedRelation: "stock_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "app_orders_kitchen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_export_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "stock_moves_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_related_purchase_id_fkey"
            columns: ["related_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "unit_of_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          receive_payments: boolean | null
          receive_purchase_orders: boolean | null
          supplier_id: string
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          receive_payments?: boolean | null
          receive_purchase_orders?: boolean | null
          supplier_id: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          receive_payments?: boolean | null
          receive_purchase_orders?: boolean | null
          supplier_id?: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payables: {
        Row: {
          amount_paid: number | null
          amount_total: number
          created_at: string | null
          document_date: string | null
          document_number: string | null
          document_type: string | null
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          purchase_order_id: string | null
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          amount_total: number
          created_at?: string | null
          document_date?: string | null
          document_number?: string | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          purchase_order_id?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          amount_total?: number
          created_at?: string | null
          document_date?: string | null
          document_number?: string | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          purchase_order_id?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payables_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payables_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account_holder: string | null
          bank_account_holder_rut: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_name: string | null
          ciudad_fiscal: string | null
          comuna_fiscal: string | null
          created_at: string | null
          direccion_fiscal: string | null
          email: string | null
          giro: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_terms_days: number | null
          payment_terms_type: string | null
          phone: string | null
          preferred_contact_method: string | null
          razon_social: string | null
          rut: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account_holder?: string | null
          bank_account_holder_rut?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          ciudad_fiscal?: string | null
          comuna_fiscal?: string | null
          created_at?: string | null
          direccion_fiscal?: string | null
          email?: string | null
          giro?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          payment_terms_type?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          razon_social?: string | null
          rut?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account_holder?: string | null
          bank_account_holder_rut?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          ciudad_fiscal?: string | null
          comuna_fiscal?: string | null
          created_at?: string | null
          direccion_fiscal?: string | null
          email?: string | null
          giro?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          payment_terms_type?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          razon_social?: string | null
          rut?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tv_screen_configs: {
        Row: {
          columns: number | null
          created_at: string
          font_size: string | null
          hide_header_fullscreen: boolean | null
          id: string
          is_default: boolean
          name: string
          show_clock: boolean
          show_logo: boolean
          slider_interval_seconds: number
          sound_enabled: boolean
          template: string
          theme: string | null
          updated_at: string
        }
        Insert: {
          columns?: number | null
          created_at?: string
          font_size?: string | null
          hide_header_fullscreen?: boolean | null
          id?: string
          is_default?: boolean
          name: string
          show_clock?: boolean
          show_logo?: boolean
          slider_interval_seconds?: number
          sound_enabled?: boolean
          template?: string
          theme?: string | null
          updated_at?: string
        }
        Update: {
          columns?: number | null
          created_at?: string
          font_size?: string | null
          hide_header_fullscreen?: boolean | null
          id?: string
          is_default?: boolean
          name?: string
          show_clock?: boolean
          show_logo?: boolean
          slider_interval_seconds?: number
          sound_enabled?: boolean
          template?: string
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      unit_of_measures: {
        Row: {
          base_unit: string | null
          code: string
          conversion_factor: number | null
          created_at: string | null
          id: string
          is_base: boolean
          name: string
        }
        Insert: {
          base_unit?: string | null
          code: string
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_base?: boolean
          name: string
        }
        Update: {
          base_unit?: string | null
          code?: string
          conversion_factor?: number | null
          created_at?: string | null
          id?: string
          is_base?: boolean
          name?: string
        }
        Relationships: []
      }
      units_of_measure: {
        Row: {
          abbreviation: string
          base_unit_id: string | null
          code: string
          conversion_factor: number | null
          created_at: string
          id: string
          is_active: boolean
          is_base_unit: boolean
          name: string
          updated_at: string
        }
        Insert: {
          abbreviation: string
          base_unit_id?: string | null
          code: string
          conversion_factor?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_base_unit?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string
          base_unit_id?: string | null
          code?: string
          conversion_factor?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_base_unit?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_of_measure_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          can_do_delivery: boolean
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
          can_do_delivery?: boolean
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
          can_do_delivery?: boolean
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
      warehouses: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          notes?: string | null
          updated_at?: string | null
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
      customer_levels: {
        Row: {
          benefits: Json | null
          cantidad_runas: number | null
          color: string | null
          customer_id: string | null
          icon: string | null
          level_code: string | null
          level_name: string | null
          min_points: number | null
          next_level_name: string | null
          next_level_points: number | null
        }
        Relationships: []
      }
      debug_policies: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown
          qual_expression: string | null
          roles: unknown[] | null
          tablename: unknown
        }
        Relationships: []
      }
      delivery_export_v: {
        Row: {
          created_at_cl: string | null
          direccion_completa: string | null
          monto_delivery: number | null
          order_id: string | null
          order_number: string | null
        }
        Insert: {
          created_at_cl?: never
          direccion_completa?: never
          monto_delivery?: never
          order_id?: string | null
          order_number?: never
        }
        Update: {
          created_at_cl?: never
          direccion_completa?: never
          monto_delivery?: never
          order_id?: string | null
          order_number?: never
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_assigned_at: string | null
          delivery_comuna: string | null
          delivery_comuna_id: string | null
          delivery_delivered_at: string | null
          delivery_distance: number | null
          delivery_fee: number | null
          delivery_number: string | null
          delivery_person_id: string | null
          delivery_person_name: string | null
          delivery_reference: string | null
          delivery_zone_id: string | null
          delivery_zone_name: string | null
          discount: number | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"] | null
          id: string | null
          items: Json | null
          minutes_since_created: number | null
          nombre_resumen: string | null
          notes: string | null
          order_number: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_levels"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_comuna_id_fkey"
            columns: ["delivery_comuna_id"]
            isOneToOne: false
            referencedRelation: "comunas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "app_public_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      marketing_promo_metrics: {
        Row: {
          conversion_rate: number | null
          ctr: number | null
          first_event: string | null
          is_active: boolean | null
          last_event: string | null
          promo_id: string | null
          promo_title: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_revenue: number | null
          total_views: number | null
          unique_clickers: number | null
          unique_converters: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_stock_quick: {
        Args: {
          p_current_stock: number
          p_new_stock: number
          p_notes: string
          p_raw_material_id: string
          p_user_id: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      assign_orders_to_sessions: { Args: never; Returns: undefined }
      auth_jwt: { Args: never; Returns: Json }
      authenticate_customer: {
        Args: { p_email: string; p_password: string }
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
      check_and_award_badge: {
        Args: { p_badge_code: string; p_customer_id: string }
        Returns: boolean
      }
      check_notification_allowed: {
        Args: { p_customer_id: string; p_type: string }
        Returns: boolean
      }
      cleanup_expired_reset_codes: { Args: never; Returns: undefined }
      convert_uom_to_base: {
        Args: {
          p_from_uom_id: string
          p_quantity: number
          p_raw_material_id: string
        }
        Returns: number
      }
      create_order_with_context: {
        Args: { p_order_data: Json; p_user_id: string }
        Returns: Json
      }
      create_staff_session: {
        Args: { _user_id: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      deduct_from_recipe: {
        Args: {
          p_order_id: string
          p_quantity: number
          p_recipe_id: string
          p_warehouse_id: string
        }
        Returns: undefined
      }
      deduct_inventory_from_order: {
        Args: { p_order_id: string; p_warehouse_id?: string }
        Returns: Json
      }
      delivery_export_range: {
        Args: { _end: string; _start: string; _tz?: string }
        Returns: {
          direccion: string
          fecha_hora: string
          monto_delivery: string
          numero_orden: string
        }[]
      }
      delivery_export_range_with_time: {
        Args: {
          _delivery_person_id?: string
          _end: string
          _start: string
          _tz?: string
        }
        Returns: {
          direccion: string
          fecha_hora: string
          monto_delivery: string
          numero_orden: string
          repartidor_id: string
          repartidor_nombre: string
        }[]
      }
      ensure_stock_balance: {
        Args: {
          p_lot_id?: string
          p_raw_material_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      finance_generate_closure: {
        Args: {
          _created_by: string
          _end: string
          _notes: string
          _period_type: string
          _start: string
          _tz?: string
        }
        Returns: string
      }
      finance_generate_closure_v2: {
        Args: {
          _created_by?: string
          _end: string
          _filters?: Json
          _notes?: string
          _period_type: string
          _start: string
          _tz?: string
        }
        Returns: string
      }
      finance_get_daily_data: {
        Args: { _end: string; _start: string; _tz?: string }
        Returns: {
          cogs: number
          day: string
          discounts: number
          gross_sales: number
          net_sales: number
          orders_count: number
        }[]
      }
      finance_get_kpis: {
        Args: { _end: string; _start: string; _tz?: string }
        Returns: Json
      }
      finance_normalize_range: {
        Args: { _end: string; _start: string; _tz?: string }
        Returns: {
          ts_end: string
          ts_start: string
        }[]
      }
      generate_po_number: { Args: never; Returns: string }
      generate_simple_hash: { Args: { password: string }; Returns: string }
      get_active_staff_user_id: { Args: never; Returns: string }
      get_current_customer_id: { Args: never; Returns: string }
      get_current_staff_user_from_token: { Args: never; Returns: string }
      get_current_staff_user_id: { Args: never; Returns: string }
      get_customer_addresses_with_context: {
        Args: { p_customer_id: string; p_user_id: string }
        Returns: Json
      }
      get_customer_order_stats_with_context: {
        Args: { p_customer_id: string; p_user_id: string }
        Returns: Json
      }
      get_customer_orders_with_context: {
        Args: {
          p_customer_id: string
          p_date_from?: string
          p_date_to?: string
          p_fulfillment?: string
          p_limit?: number
          p_page?: number
          p_status?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_fixed_expenses_for_closure: {
        Args: { _end: string; _start: string }
        Returns: {
          amount: number
          category: string
          department: string
          id: string
          name: string
          prorated_amount: number
        }[]
      }
      get_material_base_uom: {
        Args: { p_raw_material_id: string }
        Returns: string
      }
      get_onesignal_config: {
        Args: never
        Returns: {
          app_id: string
          enabled: boolean
          web_site_name: string
        }[]
      }
      get_online_order_settings:
        | { Args: never; Returns: Json }
        | { Args: { p_user_id?: string }; Returns: Json }
      get_runas_history_with_context: {
        Args: {
          p_customer_id: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_origen?: string
          p_page?: number
          p_type?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_stock_balances: {
        Args: { p_warehouse_id: string }
        Returns: {
          qty_on_hand: number
          raw_material_id: string
        }[]
      }
      get_store_status: { Args: never; Returns: Json }
      get_supplier_pending_amount: {
        Args: { p_supplier_id: string }
        Returns: number
      }
      get_top_recurring_expenses_for_closure: {
        Args: { _end: string; _limit?: number; _start: string }
        Returns: {
          category: string
          expense_count: number
          recurring_id: string
          recurring_name: string
          total_amount: number
        }[]
      }
      get_user_id_from_current_session: { Args: never; Returns: string }
      has_active_staff_session: { Args: never; Returns: boolean }
      has_orders_in_last_4_weeks: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_cash_movement_with_context: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_category?: string
          p_note?: string
          p_session_id: string
          p_synced_to_finance?: boolean
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      insert_runas_transaction_with_context: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_motivo?: string
          p_order_id: string
          p_origen?: string
          p_runas: number
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      insert_stock_adjustment: {
        Args: {
          p_notes: string
          p_qty_in: number
          p_qty_out: number
          p_raw_material_id: string
          p_user_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      invalidate_staff_session: { Args: { _token: string }; Returns: boolean }
      is_active_admin: { Args: never; Returns: boolean }
      is_active_staff: { Args: never; Returns: boolean }
      is_active_staff_with_token: { Args: never; Returns: boolean }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_cashier_or_admin: { Args: never; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_customer_owner: { Args: { p_customer_id: string }; Returns: boolean }
      is_delivery_courier: { Args: never; Returns: boolean }
      is_staff_admin: { Args: never; Returns: boolean }
      is_user_admin: { Args: { p_user_id: string }; Returns: boolean }
      process_auto_runas: { Args: never; Returns: Json }
      process_purchase_receipt: {
        Args: {
          p_expiry_date?: string
          p_lot_number?: string
          p_purchase_id: string
          p_quantity: number
          p_raw_material_id: string
          p_unit_cost: number
          p_uom_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      process_stock_adjustment: {
        Args: {
          p_adjusted_by_user_id: string
          p_adjustment_qty: number
          p_lot_id: string
          p_raw_material_id: string
          p_reason: string
          p_warehouse_id: string
        }
        Returns: string
      }
      process_stock_transfer: {
        Args: {
          p_from_warehouse_id: string
          p_lot_id: string
          p_notes: string
          p_quantity: number
          p_raw_material_id: string
          p_to_warehouse_id: string
          p_transferred_by_user_id: string
          p_uom_id: string
        }
        Returns: string[]
      }
      refresh_staff_token: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          new_token: string
        }[]
      }
      register_customer: {
        Args: {
          p_apellidos?: string
          p_email: string
          p_marketing_opt_in?: boolean
          p_nombres: string
          p_password: string
          p_phone?: string
        }
        Returns: Json
      }
      request_customer_password_reset: {
        Args: { p_email: string; p_ip_address?: unknown }
        Returns: Json
      }
      reset_customer_password: {
        Args: { p_code: string; p_email: string; p_new_password: string }
        Returns: Json
      }
      set_customer_context: {
        Args: { p_account_id: string; p_customer_id: string }
        Returns: undefined
      }
      set_staff_context: { Args: { p_user_id: string }; Returns: undefined }
      set_user_password: {
        Args: { new_password: string; user_uuid: string }
        Returns: boolean
      }
      staff_has_permission: { Args: { perm: string }; Returns: boolean }
      update_customer_runas: {
        Args: { p_cantidad_runas: number; p_customer_id: string }
        Returns: undefined
      }
      update_online_order_settings:
        | { Args: { p_settings: Json }; Returns: Json }
        | { Args: { p_settings: Json; p_user_id?: string }; Returns: Json }
      update_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
          p_user_id: string
        }
        Returns: Json
      }
      validate_staff_token: {
        Args: { _token: string }
        Returns: {
          expires_at: string
          is_valid: boolean
          user_id: string
        }[]
      }
      validate_staff_token_v2: {
        Args: { _token: string }
        Returns: {
          is_admin: boolean
          user_id: string
        }[]
      }
      verify_customer_email: { Args: { p_token: string }; Returns: Json }
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
        | "TV"
      cash_movement_type: "ingreso" | "egreso"
      estado_cliente: "Activo" | "Inactivo" | "Bloqueado"
      fulfillment_type: "retiro" | "delivery"
      order_status:
        | "PendientePago"
        | "Pendiente"
        | "En preparación"
        | "En pausa"
        | "Listo"
        | "Entregado"
        | "Cancelado"
        | "En camino"
      origen_movimiento: "POS" | "Web" | "Manual" | "Edición"
      payment_method:
        | "efectivo"
        | "mp"
        | "pos"
        | "mixto"
        | "aplicacion"
        | "runas"
      po_status:
        | "draft"
        | "sent"
        | "received"
        | "rejected"
        | "approved"
        | "partial"
        | "cancelled"
      purchase_request_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "cancelled"
      runa_movement_type: "acumulacion" | "canje" | "ajuste" | "promo"
      stock_move_type:
        | "purchase"
        | "sale"
        | "adjustment"
        | "transfer_in"
        | "transfer_out"
        | "waste"
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
        "TV",
      ],
      cash_movement_type: ["ingreso", "egreso"],
      estado_cliente: ["Activo", "Inactivo", "Bloqueado"],
      fulfillment_type: ["retiro", "delivery"],
      order_status: [
        "PendientePago",
        "Pendiente",
        "En preparación",
        "En pausa",
        "Listo",
        "Entregado",
        "Cancelado",
        "En camino",
      ],
      origen_movimiento: ["POS", "Web", "Manual", "Edición"],
      payment_method: ["efectivo", "mp", "pos", "mixto", "aplicacion", "runas"],
      po_status: [
        "draft",
        "sent",
        "received",
        "rejected",
        "approved",
        "partial",
        "cancelled",
      ],
      purchase_request_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "cancelled",
      ],
      runa_movement_type: ["acumulacion", "canje", "ajuste", "promo"],
      stock_move_type: [
        "purchase",
        "sale",
        "adjustment",
        "transfer_in",
        "transfer_out",
        "waste",
      ],
    },
  },
} as const
