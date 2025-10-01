-- ============================================================================
-- SISTEMA DE CUPONES (Estilo WooCommerce+)
-- ============================================================================

-- Tabla principal de cupones
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed_cart','fixed_product')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,

  -- Vigencia
  date_start TIMESTAMPTZ,
  date_end TIMESTAMPTZ,
  time_windows JSONB, -- ej: {"mon":["12:00-16:00","18:00-22:00"], "tue":["12:00-22:00"]}

  -- Condiciones de gasto
  min_spend NUMERIC(12,2),
  max_spend NUMERIC(12,2),

  -- Límites de uso
  usage_limit_total INT,
  usage_limit_per_customer INT,

  -- Reglas
  allow_stack BOOLEAN NOT NULL DEFAULT FALSE,
  apply_to_discounted BOOLEAN NOT NULL DEFAULT TRUE,
  apply_to_combo_children BOOLEAN NOT NULL DEFAULT TRUE,
  allow_manual_line_selection BOOLEAN NOT NULL DEFAULT FALSE,
  roles_allowed TEXT[], -- NULL = cualquier rol con acceso a cupones

  -- Áreas afectadas
  affects_products BOOLEAN NOT NULL DEFAULT TRUE,
  affects_delivery BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_mode TEXT CHECK (delivery_mode IN ('free','fixed','percent')),
  delivery_amount NUMERIC(12,2),
  affects_tip BOOLEAN NOT NULL DEFAULT FALSE,

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Índices
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, date_start, date_end);

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active coupons"
ON coupons FOR SELECT
USING (is_active = true);

CREATE POLICY "Allow public insert/update/delete for coupons"
ON coupons FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TABLAS DE ALCANCE (Whitelists y Blacklists)
-- ============================================================================

-- Categorías
CREATE TABLE IF NOT EXISTS coupon_allowed_categories (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_id)
);

CREATE TABLE IF NOT EXISTS coupon_excluded_categories (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_id)
);

-- Productos
CREATE TABLE IF NOT EXISTS coupon_allowed_products (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, product_id)
);

CREATE TABLE IF NOT EXISTS coupon_excluded_products (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, product_id)
);

-- Variantes (formatos)
CREATE TABLE IF NOT EXISTS coupon_allowed_variants (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  category_variant_id UUID NOT NULL REFERENCES category_variants(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_variant_id)
);

CREATE TABLE IF NOT EXISTS coupon_excluded_variants (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  category_variant_id UUID NOT NULL REFERENCES category_variants(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, category_variant_id)
);

-- Extras
CREATE TABLE IF NOT EXISTS coupon_allowed_extras (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES product_extras(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, extra_id)
);

CREATE TABLE IF NOT EXISTS coupon_excluded_extras (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES product_extras(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, extra_id)
);

-- Modificadores
CREATE TABLE IF NOT EXISTS coupon_allowed_modifiers (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, modifier_id)
);

CREATE TABLE IF NOT EXISTS coupon_excluded_modifiers (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  modifier_id UUID NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, modifier_id)
);

-- RLS para tablas de alcance
ALTER TABLE coupon_allowed_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_excluded_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_allowed_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_excluded_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_allowed_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_excluded_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_allowed_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_excluded_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_allowed_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_excluded_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to coupon_allowed_categories"
ON coupon_allowed_categories FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_excluded_categories"
ON coupon_excluded_categories FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_allowed_products"
ON coupon_allowed_products FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_excluded_products"
ON coupon_excluded_products FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_allowed_variants"
ON coupon_allowed_variants FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_excluded_variants"
ON coupon_excluded_variants FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_allowed_extras"
ON coupon_allowed_extras FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_excluded_extras"
ON coupon_excluded_extras FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_allowed_modifiers"
ON coupon_allowed_modifiers FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to coupon_excluded_modifiers"
ON coupon_excluded_modifiers FOR ALL
USING (true) WITH CHECK (true);

-- ============================================================================
-- APLICACIONES DE CUPÓN (Auditoría)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupon_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE RESTRICT,
  applied_by UUID REFERENCES users(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discount_products NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_delivery NUMERIC(12,2) NOT NULL DEFAULT 0,
  payload JSONB -- snapshot: { coupon_code, coupon_type, affected_lines: [...], delivery_original, delivery_final }
);

CREATE INDEX idx_coupon_applications_order ON coupon_applications(order_id);
CREATE INDEX idx_coupon_applications_coupon ON coupon_applications(coupon_id);

ALTER TABLE coupon_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to coupon_applications"
ON coupon_applications FOR ALL
USING (true) WITH CHECK (true);

-- ============================================================================
-- TRACKING POR CLIENTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  used_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (coupon_id, customer_id)
);

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to coupon_redemptions"
ON coupon_redemptions FOR ALL
USING (true) WITH CHECK (true);