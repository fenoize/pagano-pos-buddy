// Tipos para el sistema de Solicitudes de Compra

export type PurchaseRequestStatus = 'draft' | 'pending_approval' | 'approved' | 'en_proceso' | 'completada' | 'rejected' | 'cancelled';

export type ProcurementMode = 'proveedor_despacha' | 'retiro_proveedor' | 'compra_directa';

export interface PurchaseRequestItem {
  id: string;
  request_id: string;
  raw_material_id: string;
  supplier_id: string | null;
  qty: number;
  uom_id: string;
  estimated_unit_cost: number;
  estimated_total: number;
  notes: string | null;
  created_at: string;
  // Fase 2: Gestión logística
  procurement_mode: ProcurementMode | null;
  actual_supplier_id: string | null;
  actual_unit_cost: number;
  resolved_at: string | null;
  resolved_by: string | null;
  presentation_id: string | null;
  // Joined data
  raw_material?: {
    id: string;
    name: string;
    code: string | null;
    last_cost: number | null;
    base_uom_id: string;
    base_uom?: {
      id: string;
      name: string;
      abbreviation: string;
    };
  };
  supplier?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  actual_supplier?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  uom?: {
    id: string;
    name: string;
    abbreviation: string;
  };
  quotations?: PurchaseQuotation[];
}

export interface PurchaseRequest {
  id: string;
  pr_number: string;
  status: PurchaseRequestStatus;
  warehouse_id: string | null;
  notes: string | null;
  management_notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  buyer_id: string | null;
  buyer_started_at: string | null;
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
  buyer?: {
    id: string;
    username: string;
    full_name: string | null;
  };
}

export interface CreatePurchaseRequestItemData {
  raw_material_id: string;
  supplier_id?: string | null;
  qty: number;
  uom_id: string;
  estimated_unit_cost?: number;
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

// Presentaciones de compra (Fase 3)
export interface MaterialPurchasePresentation {
  id: string;
  raw_material_id: string;
  supplier_id: string | null;
  name: string;
  purchase_uom_id: string;
  content_qty: number;
  content_uom_id: string;
  is_default: boolean;
  is_active: boolean;
  last_price: number;
  created_at: string;
  updated_at: string;
  // Joined
  purchase_uom?: { id: string; name: string; abbreviation: string };
  content_uom?: { id: string; name: string; abbreviation: string };
  raw_material?: { id: string; name: string };
  supplier?: { id: string; name: string } | null;
}

// Cotizaciones (Fase 4)
export interface PurchaseQuotation {
  id: string;
  request_item_id: string;
  supplier_name: string | null;
  supplier_id: string | null;
  unit_price: number;
  presentation_id: string | null;
  notes: string | null;
  quoted_at: string;
  is_selected: boolean;
  quoted_by: string | null;
  created_at: string;
  // Joined
  supplier?: { id: string; name: string } | null;
  presentation?: MaterialPurchasePresentation | null;
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
  en_proceso: {
    label: 'En Proceso',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  completada: {
    label: 'Completada',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
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

export const PROCUREMENT_MODE_CONFIG: Record<ProcurementMode, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  proveedor_despacha: {
    label: 'Proveedor Despacha',
    description: 'El proveedor entrega en el local',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  retiro_proveedor: {
    label: 'Retiro en Proveedor',
    description: 'Nosotros retiramos del proveedor',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  compra_directa: {
    label: 'Compra Directa',
    description: 'Compra en feria/local sin proveedor fijo',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
};
