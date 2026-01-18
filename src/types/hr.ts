// =============================================
// TIPOS PARA MÓDULO RRHH
// =============================================

export interface HREmployee {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  rut: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    username: string;
    full_name: string;
  };
}

export interface HRShiftRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HRShiftType {
  id: string;
  name: string;
  default_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HRPayRule {
  id: string;
  shift_type_id: string;
  pay_per_shift: number;
  tax_percent: number | null;
  round_policy: 'none' | '100' | '10' | '1' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  shift_type?: HRShiftType;
}

export type HRShiftStatus = 'draft' | 'confirmed' | 'approved' | 'paid';

export interface HRShift {
  id: string;
  employee_id: string;
  shift_date: string;
  shift_type_id: string;
  role_id: string;
  hours_override: number | null;
  notes: string | null;
  status: HRShiftStatus;
  created_by: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: HREmployee;
  shift_type?: HRShiftType;
  role?: HRShiftRole;
}

export type HRAdjustmentType = 'bonus' | 'advance' | 'discount';

export interface HRPayAdjustment {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  type: HRAdjustmentType;
  amount: number;
  description: string | null;
  created_by: string | null;
  created_at: string;
  // Joined data
  employee?: HREmployee;
}

export type HRPayrollPeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type HRPayrollStatus = 'draft' | 'issued' | 'paid';

export interface HRPayrollTotals {
  employees_count: number;
  shifts_count: number;
  base_total: number;
  bonuses_total: number;
  advances_total: number;
  discounts_total: number;
  net_total: number;
}

export interface HRPayrollRun {
  id: string;
  period_type: HRPayrollPeriodType;
  period_start: string;
  period_end: string;
  status: HRPayrollStatus;
  notes: string | null;
  totals: HRPayrollTotals;
  created_by: string | null;
  issued_by: string | null;
  issued_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  items?: HRPayrollItem[];
}

export interface HRPayrollItemSnapshot {
  shifts: {
    id: string;
    date: string;
    type: string;
    amount: number;
  }[];
  shift_ids: string[];
  employee_name: string;
}

export interface HRPayrollItem {
  id: string;
  payroll_id: string;
  employee_id: string;
  shifts_count: number;
  base_amount: number;
  bonuses: number;
  advances: number;
  discounts: number;
  net_pay: number;
  tax_estimated: number;
  gross_reference: number;
  snapshot: HRPayrollItemSnapshot;
  created_at: string;
  // Joined data
  employee?: HREmployee;
}

// Form types
export interface HREmployeeFormData {
  full_name: string;
  email?: string;
  phone?: string;
  rut?: string;
  user_id?: string | null;
  notes?: string;
}

export interface HRShiftFormData {
  employee_id: string;
  shift_date: string;
  shift_type_id: string;
  role_id: string;
  hours_override?: number | null;
  notes?: string;
}

export interface HRPayAdjustmentFormData {
  employee_id: string;
  period_start: string;
  period_end: string;
  type: HRAdjustmentType;
  amount: number;
  description?: string;
}

export interface HRPayrollGenerateParams {
  period_type: HRPayrollPeriodType;
  start_date: string;
  end_date: string;
  notes?: string;
}

// Filter types
export interface HRShiftFilters {
  dateFrom?: string;
  dateTo?: string;
  employeeId?: string;
  roleId?: string;
  shiftTypeId?: string;
  status?: HRShiftStatus | '';
}

export interface HRPayrollFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: HRPayrollStatus | '';
  periodType?: HRPayrollPeriodType | '';
}
