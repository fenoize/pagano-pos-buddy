-- Enable RLS on customer_level_definitions
ALTER TABLE customer_level_definitions ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage level definitions
CREATE POLICY "Admins can manage level definitions"
  ON customer_level_definitions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow public read access to active level definitions (for customer portal)
CREATE POLICY "Public can view active level definitions"
  ON customer_level_definitions
  FOR SELECT
  USING (is_active = true);