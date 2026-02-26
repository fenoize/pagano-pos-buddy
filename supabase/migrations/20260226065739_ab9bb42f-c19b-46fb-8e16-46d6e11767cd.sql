-- Agregar campo buyer (comprador/encargado de gestión) a purchase_requests
ALTER TABLE public.purchase_requests
  ADD COLUMN buyer_id uuid REFERENCES public.users(id),
  ADD COLUMN buyer_started_at timestamptz;