
-- Add slug column to tv_screen_configs for URL-based access
ALTER TABLE public.tv_screen_configs
  ADD COLUMN IF NOT EXISTS slug text;

-- Function to generate random alphanumeric slug prefixed with 'pa'
CREATE OR REPLACE FUNCTION public.generate_tv_screen_slug()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_exists boolean;
  v_chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i int;
BEGIN
  LOOP
    v_slug := 'pa';
    FOR i IN 1..5 LOOP
      v_slug := v_slug || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;
    SELECT EXISTS (SELECT 1 FROM public.tv_screen_configs WHERE slug = v_slug) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_slug;
END;
$$;

-- Backfill slugs for existing rows without one
UPDATE public.tv_screen_configs
SET slug = public.generate_tv_screen_slug()
WHERE slug IS NULL OR slug = '';

-- Enforce not-null + unique
ALTER TABLE public.tv_screen_configs
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.tv_screen_configs
  ALTER COLUMN slug SET DEFAULT public.generate_tv_screen_slug();

CREATE UNIQUE INDEX IF NOT EXISTS tv_screen_configs_slug_unique
  ON public.tv_screen_configs (slug);

-- Validation trigger: enforce lowercase alphanumeric, min 3 chars
CREATE OR REPLACE FUNCTION public.validate_tv_screen_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(NEW.slug) < 3 THEN
    NEW.slug := public.generate_tv_screen_slug();
  ELSE
    NEW.slug := lower(NEW.slug);
    IF NEW.slug !~ '^[a-z0-9]+$' THEN
      RAISE EXCEPTION 'slug debe contener sólo letras minúsculas y números';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tv_screen_slug ON public.tv_screen_configs;
CREATE TRIGGER trg_validate_tv_screen_slug
  BEFORE INSERT OR UPDATE OF slug ON public.tv_screen_configs
  FOR EACH ROW EXECUTE FUNCTION public.validate_tv_screen_slug();
