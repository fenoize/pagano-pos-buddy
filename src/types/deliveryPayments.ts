export interface DeliveryPaymentSummary {
  delivery_person_id: string;
  delivery_person_name: string;
  pending_count: number;
  pending_amount: number;
  paid_count: number;
  paid_amount: number;
}

export interface DeliveryPaymentFilters {
  status: 'pending' | 'paid' | 'all';
  delivery_person_id: string;
  date_start?: Date;
  date_end?: Date;
}

export interface PaymentProcessingConfig {
  account_id: string;
  shift_bonus: number;
  has_invoice: boolean;
  company_pays_tax: boolean;
  notes?: string;
}
