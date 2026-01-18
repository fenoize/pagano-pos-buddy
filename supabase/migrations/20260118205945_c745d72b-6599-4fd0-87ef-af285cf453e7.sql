
-- Fix RLS policies for HR tables: the context variable is app.user_id not app.current_user_id
-- The set_staff_context function uses app.user_id, but policies were checking app.current_user_id

-- Drop and recreate all HR policies with correct context variable

-- hr_employees
DROP POLICY IF EXISTS "Staff can view hr_employees" ON hr_employees;
DROP POLICY IF EXISTS "Staff can manage hr_employees" ON hr_employees;

CREATE POLICY "Staff can view hr_employees" ON hr_employees
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_employees" ON hr_employees
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

-- hr_shift_roles
DROP POLICY IF EXISTS "Staff can view hr_shift_roles" ON hr_shift_roles;
DROP POLICY IF EXISTS "Staff can manage hr_shift_roles" ON hr_shift_roles;

CREATE POLICY "Staff can view hr_shift_roles" ON hr_shift_roles
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_shift_roles" ON hr_shift_roles
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

-- hr_shift_types
DROP POLICY IF EXISTS "Staff can view hr_shift_types" ON hr_shift_types;
DROP POLICY IF EXISTS "Staff can manage hr_shift_types" ON hr_shift_types;

CREATE POLICY "Staff can view hr_shift_types" ON hr_shift_types
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_shift_types" ON hr_shift_types
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

-- hr_shifts
DROP POLICY IF EXISTS "Staff can view hr_shifts" ON hr_shifts;
DROP POLICY IF EXISTS "Staff can manage hr_shifts" ON hr_shifts;

CREATE POLICY "Staff can view hr_shifts" ON hr_shifts
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_shifts" ON hr_shifts
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

-- hr_pay_rules
DROP POLICY IF EXISTS "Staff can view hr_pay_rules" ON hr_pay_rules;
DROP POLICY IF EXISTS "Staff can manage hr_pay_rules" ON hr_pay_rules;

CREATE POLICY "Staff can view hr_pay_rules" ON hr_pay_rules
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_pay_rules" ON hr_pay_rules
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

-- hr_pay_adjustments
DROP POLICY IF EXISTS "Staff can view hr_pay_adjustments" ON hr_pay_adjustments;
DROP POLICY IF EXISTS "Staff can manage hr_pay_adjustments" ON hr_pay_adjustments;

CREATE POLICY "Staff can view hr_pay_adjustments" ON hr_pay_adjustments
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_pay_adjustments" ON hr_pay_adjustments
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

-- hr_payroll_runs
DROP POLICY IF EXISTS "Staff can view hr_payroll_runs" ON hr_payroll_runs;
DROP POLICY IF EXISTS "Staff can manage hr_payroll_runs" ON hr_payroll_runs;

CREATE POLICY "Staff can view hr_payroll_runs" ON hr_payroll_runs
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_payroll_runs" ON hr_payroll_runs
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

-- hr_payroll_items
DROP POLICY IF EXISTS "Staff can view hr_payroll_items" ON hr_payroll_items;
DROP POLICY IF EXISTS "Staff can manage hr_payroll_items" ON hr_payroll_items;

CREATE POLICY "Staff can view hr_payroll_items" ON hr_payroll_items
  FOR SELECT USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');

CREATE POLICY "Staff can manage hr_payroll_items" ON hr_payroll_items
  FOR ALL USING (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '')
  WITH CHECK (current_setting('app.user_id', true) IS NOT NULL AND current_setting('app.user_id', true) != '');
