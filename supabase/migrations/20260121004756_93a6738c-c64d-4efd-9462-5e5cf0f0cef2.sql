-- =====================================================
-- Fix: Allow staff to read products without context
-- =====================================================
-- The current RLS policy for products relies on is_active_staff() which 
-- depends on ephemeral app.user_id context. This causes products to not
-- appear for Admins/Cashiers when the context is lost.

-- Solution: Add permissive SELECT policy for products table

-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;

-- Create permissive SELECT policy (products are public data for POS)
CREATE POLICY "Allow read access to products"
ON public.products
FOR SELECT
USING (true);

-- Create separate INSERT/UPDATE/DELETE policies that still require staff context
-- for write operations (security for modifications)
CREATE POLICY "Staff can insert products"
ON public.products
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update products"
ON public.products
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete products"
ON public.products
FOR DELETE
USING (is_active_staff());

-- Also add permissive policies for product-related tables that are read in POS

-- product_categories junction table
DROP POLICY IF EXISTS "Staff can manage product categories" ON public.product_categories;

CREATE POLICY "Allow read access to product_categories"
ON public.product_categories
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert product_categories"
ON public.product_categories
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update product_categories"
ON public.product_categories
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete product_categories"
ON public.product_categories
FOR DELETE
USING (is_active_staff());

-- categories table - need read access for POS
DROP POLICY IF EXISTS "Staff can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;

CREATE POLICY "Allow read access to categories"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert categories"
ON public.categories
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update categories"
ON public.categories
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete categories"
ON public.categories
FOR DELETE
USING (is_active_staff());

-- product_extras table
DROP POLICY IF EXISTS "Staff can manage product extras" ON public.product_extras;

CREATE POLICY "Allow read access to product_extras"
ON public.product_extras
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert product_extras"
ON public.product_extras
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update product_extras"
ON public.product_extras
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete product_extras"
ON public.product_extras
FOR DELETE
USING (is_active_staff());

-- product_modifiers table
DROP POLICY IF EXISTS "Staff can manage product modifiers" ON public.product_modifiers;

CREATE POLICY "Allow read access to product_modifiers"
ON public.product_modifiers
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert product_modifiers"
ON public.product_modifiers
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update product_modifiers"
ON public.product_modifiers
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete product_modifiers"
ON public.product_modifiers
FOR DELETE
USING (is_active_staff());

-- product_variant_options table
DROP POLICY IF EXISTS "Staff can manage variant options" ON public.product_variant_options;
DROP POLICY IF EXISTS "Anyone can view active variant options" ON public.product_variant_options;

CREATE POLICY "Allow read access to product_variant_options"
ON public.product_variant_options
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert product_variant_options"
ON public.product_variant_options
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update product_variant_options"
ON public.product_variant_options
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete product_variant_options"
ON public.product_variant_options
FOR DELETE
USING (is_active_staff());

-- category_variants table
DROP POLICY IF EXISTS "Staff can manage category variants" ON public.category_variants;
DROP POLICY IF EXISTS "Anyone can view active category variants" ON public.category_variants;

CREATE POLICY "Allow read access to category_variants"
ON public.category_variants
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert category_variants"
ON public.category_variants
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update category_variants"
ON public.category_variants
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete category_variants"
ON public.category_variants
FOR DELETE
USING (is_active_staff());

-- combo_products table
DROP POLICY IF EXISTS "Staff can manage combo products" ON public.combo_products;
DROP POLICY IF EXISTS "Anyone can view active combo products" ON public.combo_products;

CREATE POLICY "Allow read access to combo_products"
ON public.combo_products
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert combo_products"
ON public.combo_products
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update combo_products"
ON public.combo_products
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete combo_products"
ON public.combo_products
FOR DELETE
USING (is_active_staff());

-- combo_items table
DROP POLICY IF EXISTS "Staff can manage combo items" ON public.combo_items;
DROP POLICY IF EXISTS "Anyone can view combo items" ON public.combo_items;

CREATE POLICY "Allow read access to combo_items"
ON public.combo_items
FOR SELECT
USING (true);

CREATE POLICY "Staff can insert combo_items"
ON public.combo_items
FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update combo_items"
ON public.combo_items
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete combo_items"
ON public.combo_items
FOR DELETE
USING (is_active_staff());