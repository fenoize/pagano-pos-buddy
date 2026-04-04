
-- 1. Tabla de grupos de variantes (ej: "Proteína")
CREATE TABLE public.variant_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.variant_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variant_groups_select" ON public.variant_groups FOR SELECT USING (true);
CREATE POLICY "variant_groups_insert" ON public.variant_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "variant_groups_update" ON public.variant_groups FOR UPDATE USING (true);
CREATE POLICY "variant_groups_delete" ON public.variant_groups FOR DELETE USING (true);

-- 2. Opciones dentro de un grupo (ej: "Carne", "Pollo")
CREATE TABLE public.variant_group_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.variant_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  image_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.variant_group_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vgo_select" ON public.variant_group_options FOR SELECT USING (true);
CREATE POLICY "vgo_insert" ON public.variant_group_options FOR INSERT WITH CHECK (true);
CREATE POLICY "vgo_update" ON public.variant_group_options FOR UPDATE USING (true);
CREATE POLICY "vgo_delete" ON public.variant_group_options FOR DELETE USING (true);

-- 3. Relación producto <-> grupo (muchos a muchos)
CREATE TABLE public.product_variant_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.variant_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, group_id)
);

ALTER TABLE public.product_variant_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pvg_select" ON public.product_variant_groups FOR SELECT USING (true);
CREATE POLICY "pvg_insert" ON public.product_variant_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "pvg_update" ON public.product_variant_groups FOR UPDATE USING (true);
CREATE POLICY "pvg_delete" ON public.product_variant_groups FOR DELETE USING (true);

-- 4. Columna nueva en product_variant_options para enlazar con la opción de grupo
ALTER TABLE public.product_variant_options
  ADD COLUMN variant_group_option_id UUID REFERENCES public.variant_group_options(id) ON DELETE SET NULL;

-- Índice para queries de combinación
CREATE INDEX idx_pvo_group_option ON public.product_variant_options(variant_group_option_id);

-- Triggers de updated_at
CREATE TRIGGER update_variant_groups_updated_at
  BEFORE UPDATE ON public.variant_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_variant_group_options_updated_at
  BEFORE UPDATE ON public.variant_group_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
