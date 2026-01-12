-- =====================================================
-- SECURITY FIX: Part 2 - Continue fixing remaining tables
-- First drop existing policies to avoid conflicts
-- =====================================================

-- ========== RAW_MATERIALS ==========
DROP POLICY IF EXISTS "Staff can view raw materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Staff can manage raw materials" ON public.raw_materials;
DROP POLICY IF EXISTS "Authorized users can manage raw materials" ON public.raw_materials;

CREATE POLICY "Staff can view raw materials"
ON public.raw_materials FOR SELECT
USING (is_active_staff());

CREATE POLICY "Admins can manage raw materials"
ON public.raw_materials FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== RECIPES ==========
DROP POLICY IF EXISTS "Staff can manage recipes" ON public.recipes;
DROP POLICY IF EXISTS "Staff can view recipes" ON public.recipes;

CREATE POLICY "Staff can view recipes"
ON public.recipes FOR SELECT
USING (is_active_staff());

CREATE POLICY "Admins can manage recipes"
ON public.recipes FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== RECIPE_INGREDIENTS ==========
DROP POLICY IF EXISTS "Staff can manage recipe ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Staff can view recipe ingredients" ON public.recipe_ingredients;

CREATE POLICY "Staff can view recipe ingredients"
ON public.recipe_ingredients FOR SELECT
USING (is_active_staff());

CREATE POLICY "Admins can manage recipe ingredients"
ON public.recipe_ingredients FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== WAREHOUSES ==========
DROP POLICY IF EXISTS "Staff can manage warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Staff can view warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Admins can manage warehouses" ON public.warehouses;

CREATE POLICY "Staff can view warehouses"
ON public.warehouses FOR SELECT
USING (is_active_staff());

CREATE POLICY "Admins can manage warehouses"
ON public.warehouses FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== UNITS_OF_MEASURE ==========
DROP POLICY IF EXISTS "Staff can manage units of measure" ON public.units_of_measure;
DROP POLICY IF EXISTS "Staff can view units of measure" ON public.units_of_measure;
DROP POLICY IF EXISTS "Admins can manage units of measure" ON public.units_of_measure;

CREATE POLICY "Staff can view units of measure"
ON public.units_of_measure FOR SELECT
USING (is_active_staff());

CREATE POLICY "Admins can manage units of measure"
ON public.units_of_measure FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== INVENTORY ==========
DROP POLICY IF EXISTS "Allow authenticated all access" ON public.inventory;
DROP POLICY IF EXISTS "Staff can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Staff can manage inventory" ON public.inventory;

CREATE POLICY "Staff can view inventory"
ON public.inventory FOR SELECT
USING (is_active_staff());

CREATE POLICY "Staff can manage inventory"
ON public.inventory FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== CATEGORIES ==========
DROP POLICY IF EXISTS "Allow public access for POS operations to categories" ON public.categories;
DROP POLICY IF EXISTS "Staff can manage categories" ON public.categories;

CREATE POLICY "Staff can manage categories"
ON public.categories FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== CATEGORY_VARIANTS ==========
DROP POLICY IF EXISTS "Allow public access for category variants" ON public.category_variants;
DROP POLICY IF EXISTS "Anyone can read category variants" ON public.category_variants;
DROP POLICY IF EXISTS "Staff can manage category variants" ON public.category_variants;

CREATE POLICY "Anyone can read category variants"
ON public.category_variants FOR SELECT
USING (true);

CREATE POLICY "Staff can manage category variants"
ON public.category_variants FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== COMBO_ITEMS ==========
DROP POLICY IF EXISTS "Allow public access for combo items" ON public.combo_items;
DROP POLICY IF EXISTS "Anyone can read combo items" ON public.combo_items;
DROP POLICY IF EXISTS "Staff can manage combo items" ON public.combo_items;

CREATE POLICY "Anyone can read combo items"
ON public.combo_items FOR SELECT
USING (true);

CREATE POLICY "Staff can manage combo items"
ON public.combo_items FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== COMBO_PRODUCTS ==========
DROP POLICY IF EXISTS "Allow public access for combo products" ON public.combo_products;
DROP POLICY IF EXISTS "Anyone can read combo products" ON public.combo_products;
DROP POLICY IF EXISTS "Staff can manage combo products" ON public.combo_products;

CREATE POLICY "Anyone can read combo products"
ON public.combo_products FOR SELECT
USING (true);

CREATE POLICY "Staff can manage combo products"
ON public.combo_products FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== COMUNAS ==========
DROP POLICY IF EXISTS "Allow admin full access to comunas" ON public.comunas;
DROP POLICY IF EXISTS "Admins can manage comunas" ON public.comunas;

CREATE POLICY "Admins can manage comunas"
ON public.comunas FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== DELIVERY_ZONES ==========
DROP POLICY IF EXISTS "Allow public access for delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Anyone can read delivery zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Staff can manage delivery zones" ON public.delivery_zones;

CREATE POLICY "Anyone can read delivery zones"
ON public.delivery_zones FOR SELECT
USING (true);

CREATE POLICY "Staff can manage delivery zones"
ON public.delivery_zones FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== PRODUCT_CATEGORIES ==========
DROP POLICY IF EXISTS "Allow public access for POS operations to product_categories" ON public.product_categories;
DROP POLICY IF EXISTS "Anyone can read product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Staff can manage product categories" ON public.product_categories;

CREATE POLICY "Anyone can read product categories"
ON public.product_categories FOR SELECT
USING (true);

CREATE POLICY "Staff can manage product categories"
ON public.product_categories FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== PRODUCT_EXTRAS ==========
DROP POLICY IF EXISTS "Allow public access for POS operations to product extras" ON public.product_extras;
DROP POLICY IF EXISTS "Staff can manage product extras" ON public.product_extras;

CREATE POLICY "Staff can manage product extras"
ON public.product_extras FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== PRODUCT_MODIFIERS ==========
DROP POLICY IF EXISTS "Allow public access for POS operations to product modifiers" ON public.product_modifiers;
DROP POLICY IF EXISTS "Staff can manage product modifiers" ON public.product_modifiers;

CREATE POLICY "Staff can manage product modifiers"
ON public.product_modifiers FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== PRODUCT_VARIANT_OPTIONS ==========
DROP POLICY IF EXISTS "Allow public access for product variant options" ON public.product_variant_options;
DROP POLICY IF EXISTS "Anyone can read product variant options" ON public.product_variant_options;
DROP POLICY IF EXISTS "Staff can manage product variant options" ON public.product_variant_options;

CREATE POLICY "Anyone can read product variant options"
ON public.product_variant_options FOR SELECT
USING (true);

CREATE POLICY "Staff can manage product variant options"
ON public.product_variant_options FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== PRODUCTS ==========
DROP POLICY IF EXISTS "Allow public access for POS operations on products" ON public.products;
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;

CREATE POLICY "Staff can manage products"
ON public.products FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== PWA_CONFIG ==========
DROP POLICY IF EXISTS "Staff puede ver configuración PWA" ON public.pwa_config;
DROP POLICY IF EXISTS "Staff puede actualizar configuración PWA" ON public.pwa_config;
DROP POLICY IF EXISTS "Staff puede insertar configuración PWA" ON public.pwa_config;
DROP POLICY IF EXISTS "Anyone can view PWA config" ON public.pwa_config;
DROP POLICY IF EXISTS "Admins can manage PWA config" ON public.pwa_config;

CREATE POLICY "Anyone can view PWA config"
ON public.pwa_config FOR SELECT
USING (true);

CREATE POLICY "Admins can manage PWA config"
ON public.pwa_config FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== ROLE_PERMISSIONS ==========
DROP POLICY IF EXISTS "Anyone can read permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Staff can view role permissions" ON public.role_permissions;

CREATE POLICY "Staff can view role permissions"
ON public.role_permissions FOR SELECT
USING (is_active_staff());

-- ========== PAYMENT_METHODS ==========
DROP POLICY IF EXISTS "Allow admin delete access to payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Allow admin update access to payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can delete payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can update payment methods" ON public.payment_methods;

CREATE POLICY "Admins can delete payment methods"
ON public.payment_methods FOR DELETE
USING (is_active_admin());

CREATE POLICY "Admins can update payment methods"
ON public.payment_methods FOR UPDATE
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== NOTIFICATION_EVENTS ==========
DROP POLICY IF EXISTS "System can update notification events" ON public.notification_events;
DROP POLICY IF EXISTS "Staff can update notification events" ON public.notification_events;

CREATE POLICY "Staff can update notification events"
ON public.notification_events FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- ========== CUSTOMER_LEVEL_DEFINITIONS ==========
DROP POLICY IF EXISTS "Admins can manage level definitions" ON public.customer_level_definitions;

CREATE POLICY "Admins can manage level definitions"
ON public.customer_level_definitions FOR ALL
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- ========== COUPON TABLES ==========
DROP POLICY IF EXISTS "Allow public insert/update/delete for coupons" ON public.coupons;
DROP POLICY IF EXISTS "Staff can manage coupons" ON public.coupons;

CREATE POLICY "Staff can manage coupons"
ON public.coupons FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_allowed_categories" ON public.coupon_allowed_categories;
DROP POLICY IF EXISTS "Staff can manage coupon allowed categories" ON public.coupon_allowed_categories;
CREATE POLICY "Staff can manage coupon allowed categories"
ON public.coupon_allowed_categories FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_allowed_extras" ON public.coupon_allowed_extras;
DROP POLICY IF EXISTS "Staff can manage coupon allowed extras" ON public.coupon_allowed_extras;
CREATE POLICY "Staff can manage coupon allowed extras"
ON public.coupon_allowed_extras FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_allowed_modifiers" ON public.coupon_allowed_modifiers;
DROP POLICY IF EXISTS "Staff can manage coupon allowed modifiers" ON public.coupon_allowed_modifiers;
CREATE POLICY "Staff can manage coupon allowed modifiers"
ON public.coupon_allowed_modifiers FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_allowed_products" ON public.coupon_allowed_products;
DROP POLICY IF EXISTS "Staff can manage coupon allowed products" ON public.coupon_allowed_products;
CREATE POLICY "Staff can manage coupon allowed products"
ON public.coupon_allowed_products FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_allowed_variants" ON public.coupon_allowed_variants;
DROP POLICY IF EXISTS "Staff can manage coupon allowed variants" ON public.coupon_allowed_variants;
CREATE POLICY "Staff can manage coupon allowed variants"
ON public.coupon_allowed_variants FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_applications" ON public.coupon_applications;
DROP POLICY IF EXISTS "Staff can manage coupon applications" ON public.coupon_applications;
CREATE POLICY "Staff can manage coupon applications"
ON public.coupon_applications FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_excluded_categories" ON public.coupon_excluded_categories;
DROP POLICY IF EXISTS "Staff can manage coupon excluded categories" ON public.coupon_excluded_categories;
CREATE POLICY "Staff can manage coupon excluded categories"
ON public.coupon_excluded_categories FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_excluded_extras" ON public.coupon_excluded_extras;
DROP POLICY IF EXISTS "Staff can manage coupon excluded extras" ON public.coupon_excluded_extras;
CREATE POLICY "Staff can manage coupon excluded extras"
ON public.coupon_excluded_extras FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_excluded_modifiers" ON public.coupon_excluded_modifiers;
DROP POLICY IF EXISTS "Staff can manage coupon excluded modifiers" ON public.coupon_excluded_modifiers;
CREATE POLICY "Staff can manage coupon excluded modifiers"
ON public.coupon_excluded_modifiers FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_excluded_products" ON public.coupon_excluded_products;
DROP POLICY IF EXISTS "Staff can manage coupon excluded products" ON public.coupon_excluded_products;
CREATE POLICY "Staff can manage coupon excluded products"
ON public.coupon_excluded_products FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_excluded_variants" ON public.coupon_excluded_variants;
DROP POLICY IF EXISTS "Staff can manage coupon excluded variants" ON public.coupon_excluded_variants;
CREATE POLICY "Staff can manage coupon excluded variants"
ON public.coupon_excluded_variants FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

DROP POLICY IF EXISTS "Allow public access to coupon_redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Staff can manage coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Staff can manage coupon redemptions"
ON public.coupon_redemptions FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());