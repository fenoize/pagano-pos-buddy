-- Agregar campos de documentación a finance_expenses
ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS document_number TEXT;

-- Crear bucket para documentos financieros
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finance-documents', 
  'finance-documents', 
  false, -- NO público por seguridad
  5242880, -- 5MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Staff puede ver documentos (solo autenticados)
CREATE POLICY "Staff can view finance documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'finance-documents'
    AND public.is_active_staff_with_token() = true
  );

-- RLS: Staff con permiso puede subir
CREATE POLICY "Staff can upload finance documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'finance-documents'
    AND public.is_active_staff_with_token() = true
  );

-- RLS: Staff puede actualizar documentos
CREATE POLICY "Staff can update finance documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'finance-documents'
    AND public.is_active_staff_with_token() = true
  )
  WITH CHECK (
    bucket_id = 'finance-documents'
    AND public.is_active_staff_with_token() = true
  );

-- RLS: Solo Administradores pueden eliminar
CREATE POLICY "Admins can delete finance documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'finance-documents'
    AND public.is_active_admin() = true
  );