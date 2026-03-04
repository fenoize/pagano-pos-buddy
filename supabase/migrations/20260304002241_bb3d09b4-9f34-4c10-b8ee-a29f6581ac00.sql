-- Fix customer_accounts RLS policies to handle empty/null settings gracefully
DROP POLICY IF EXISTS "Customers can view own account" ON customer_accounts;
CREATE POLICY "Customers can view own account" ON customer_accounts
  FOR SELECT USING (
    NULLIF(current_setting('app.customer_account_id', true), '') IS NOT NULL
    AND id = (NULLIF(current_setting('app.customer_account_id', true), ''))::uuid
  );

DROP POLICY IF EXISTS "Customers can update own account" ON customer_accounts;
CREATE POLICY "Customers can update own account" ON customer_accounts
  FOR UPDATE USING (
    NULLIF(current_setting('app.customer_account_id', true), '') IS NOT NULL
    AND id = (NULLIF(current_setting('app.customer_account_id', true), ''))::uuid
  );

-- Also add staff read access to customer_accounts so joins work
DROP POLICY IF EXISTS "Staff can view customer accounts" ON customer_accounts;
CREATE POLICY "Staff can view customer accounts" ON customer_accounts
  FOR SELECT USING (is_active_staff());