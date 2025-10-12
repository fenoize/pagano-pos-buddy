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
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          display_order: number
          id: string
          is_default: boolean
          name: string
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
      customer_password_resets: {
        Row: {
          code_hash: string
          created_at: string
          customer_account_id: string
          expires_at: string
          id: string
          ip_address: unknown | null
          used: boolean
        }
        Insert: {
          code_hash: string
          created_at?: string
          customer_account_id: string
          expires_at: string
          id?: string
          ip_address?: unknown | null
          used?: boolean
        }
        Update: {
          code_hash?: string
          created_at?: string
          customer_account_id?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
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
          delivery_comuna: string | null
          delivery_comuna_id: string | null
          delivery_distance: number | null
          delivery_fee: number | null
          delivery_number: string | null
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
          delivery_comuna?: string | null
          delivery_comuna_id?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
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
          delivery_comuna?: string | null
          delivery_comuna_id?: string | null
          delivery_distance?: number | null
          delivery_fee?: number | null
          delivery_number?: string | null
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
          counts_as_real_sale: boolean
          created_at: string | null
          display_name: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          requires_change: boolean
          requires_operation_number: boolean
          requires_receipt: boolean
          updated_at: string | null
        }
        Insert: {
          counts_as_real_sale?: boolean
          created_at?: string | null
          display_name: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          requires_change?: boolean
          requires_operation_number?: boolean
          requires_receipt?: boolean
          updated_at?: string | null
        }
        Update: {
          counts_as_real_sale?: boolean
          created_at?: string | null
          display_name?: string
          display_order?: number
          icon?: string
          id?: string
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
      purchase_items: {
        Row: {
          created_at: string | null
          id: string
          purchase_id: string | null
          qty: number
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
            referencedRelation: "unit_of_measures"
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
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          po_number: string | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number | null
          supplier_id: string | null
          tax: number | null
          total: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number | null
          supplier_id?: string | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          po_number?: string | null
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
          theme_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          min_stock: number | null
          name: string
          uom_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number | null
          name: string
          uom_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number | null
          name?: string
          uom_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "unit_of_measures"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          qty_required: number
          raw_material_id: string | null
          uom_id: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          qty_required: number
          raw_material_id?: string | null
          uom_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          qty_required?: number
          raw_material_id?: string | null
          uom_id?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "unit_of_measures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variant_options"
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
      suppliers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          rut: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          rut?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          rut?: string | null
          updated_at?: string | null
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
          cantidad_runas: number | null
          customer_id: string | null
          level_code: string | null
          level_name: string | null
          min_points: number | null
          next_level_points: number | null
        }
        Insert: {
          cantidad_runas?: number | null
          customer_id?: string | null
          level_code?: never
          level_name?: never
          min_points?: never
          next_level_points?: never
        }
        Update: {
          cantidad_runas?: number | null
          customer_id?: string | null
          level_code?: never
          level_name?: never
          min_points?: never
          next_level_points?: never
        }
        Relationships: []
      }
      debug_policies: {
        Row: {
          cmd: string | null
          permissive: string | null
          policyname: unknown | null
          qual_expression: string | null
          roles: unknown[] | null
          tablename: unknown | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_orders_to_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auth_jwt: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
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
      cleanup_expired_reset_codes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      ensure_stock_balance: {
        Args: {
          p_lot_id?: string
          p_raw_material_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      generate_simple_hash: {
        Args: { password: string }
        Returns: string
      }
      get_current_customer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_staff_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_material_base_uom: {
        Args: { p_raw_material_id: string }
        Returns: string
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
      invalidate_staff_session: {
        Args: { _token: string }
        Returns: boolean
      }
      is_active_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_active_staff: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_active_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_cashier_or_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_staff_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
      set_staff_context: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      set_user_password: {
        Args: { new_password: string; user_uuid: string }
        Returns: boolean
      }
      verify_customer_email: {
        Args: { p_token: string }
        Returns: Json
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
      origen_movimiento: "POS" | "Web" | "Manual" | "Edición"
      payment_method: "efectivo" | "mp" | "pos" | "mixto" | "aplicacion"
      po_status: "draft" | "sent" | "received" | "rejected"
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
      origen_movimiento: ["POS", "Web", "Manual", "Edición"],
      payment_method: ["efectivo", "mp", "pos", "mixto", "aplicacion"],
      po_status: ["draft", "sent", "received", "rejected"],
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
