// Tipos para el sistema de Solicitudes de Compra

export type PurchaseRequestStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';

export interface PurchaseRequestItem {
  id: string;
  request_id: string;
  raw_material_id: string;
  supplier_id: string;
  qty: number;
  uom_id: string;
  estimated_unit_cost: number;
  estimated_total: number;
  notes: string | null;
  created_at: string;
  // Joined data
  raw_material?: {
    id: string;
    name: string;
    sku: string | null;
    last_cost: number | null;
    base_uom_id: string;
    base_uom?: {
      id: string;
      name: string;
      symbol: string;
    };
  };
  supplier?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  uom?: {
    id: string;
    name: string;
    symbol: string;
  };
}

export interface PurchaseRequest {
  id: string;
  pr_number: string;
  status: PurchaseRequestStatus;
  warehouse_id: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  items?: PurchaseRequestItem[];
  warehouse?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    username: string;
    full_name: string | null;
  };
  approver?: {
    id: string;
    username: string;
    full_name: string | null;
  };
}

export interface CreatePurchaseRequestItemData {
  raw_material_id: string;
  supplier_id: string;
  qty: number;
  uom_id: string;
  estimated_unit_cost: number;
  notes?: string;
}

export interface CreatePurchaseRequestData {
  warehouse_id?: string;
  notes?: string;
  items: CreatePurchaseRequestItemData[];
  submit_for_approval?: boolean;
}

export interface UpdatePurchaseRequestData {
  warehouse_id?: string;
  notes?: string;
  items?: CreatePurchaseRequestItemData[];
}

// Helpers para el estado
export const REQUEST_STATUS_CONFIG: Record<PurchaseRequestStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  draft: {
    label: 'Borrador',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  pending_approval: {
    label: 'Pendiente Aprobación',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  approved: {
    label: 'Aprobada',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  rejected: {
    label: 'Rechazada',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
};
