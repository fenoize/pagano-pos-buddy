import { useState } from 'react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Supplier } from '@/types/supplier';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Building2, 
  Package,
  Loader2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierFormModalEnhanced } from '@/components/finance/SupplierFormModalEnhanced';
import { SupplierPayablesTable } from '@/components/finance/SupplierPayablesTable';
import { useSupplierPayables } from '@/hooks/useSupplierPayables';

interface SupplierItemPrice {
  raw_material_id: string;
  raw_material_name: string;
  raw_material_code: string;
  uom_name: string;
  last_unit_cost: number;
  last_purchase_date: string;
  purchase_count: number;
}

export default function FinanceSuppliers() {
  const [showInactive, setShowInactive] = useState(false);
  const { suppliers, loading, createSupplier, updateSupplier, toggleActiveSupplier, refetch } = useSuppliers(showInactive);
  const { totalPending: globalPending, getOverduePayables } = useSupplierPayables();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('suppliers');

  // Fetch item prices for a specific supplier
  const fetchSupplierItems = async (supplierId: string): Promise<SupplierItemPrice[]> => {
    const { data, error } = await supabase
      .from('purchase_items')
      .select(`
        raw_material_id,
        unit_cost,
        uom_id,
        created_at,
        purchase_orders!inner(supplier_id, status),
        raw_materials(name, code),
        uom(name)
      `)
      .eq('purchase_orders.supplier_id', supplierId)
      .neq('purchase_orders.status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching supplier items:', error);
      return [];
    }

    const itemMap = new Map<string, SupplierItemPrice>();
    
    (data || []).forEach((item: any) => {
      const materialId = item.raw_material_id;
      const existing = itemMap.get(materialId);
      
      if (!existing) {
        itemMap.set(materialId, {
          raw_material_id: materialId,
          raw_material_name: item.raw_materials?.name || 'Sin nombre',
          raw_material_code: item.raw_materials?.code || '',
          uom_name: item.uom?.name || '',
          last_unit_cost: item.unit_cost,
          last_purchase_date: item.created_at,
          purchase_count: 1,
        });
      } else {
        existing.purchase_count += 1;
      }
    });

    return Array.from(itemMap.values());
  };

  const { data: supplierItemsMap } = useQuery({
    queryKey: ['supplier-items', Array.from(expandedSuppliers)],
    queryFn: async () => {
      const results: Record<string, SupplierItemPrice[]> = {};
      for (const supplierId of expandedSuppliers) {
        results[supplierId] = await fetchSupplierItems(supplierId);
      }
      return results;
    },
    enabled: expandedSuppliers.size > 0,
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.rut && s.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenNew = () => {
    setEditingSupplier(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowFormModal(true);
  };

  const handleSaveSupplier = async (data: Partial<Supplier>) => {
    let success = false;
    if (editingSupplier) {
      success = await updateSupplier(editingSupplier.id, data);
    } else {
      success = await createSupplier(data);
    }
    if (success) refetch();
    return success;
  };

  const toggleExpanded = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(supplierId)) {
        next.delete(supplierId);
      } else {
        next.add(supplierId);
      }
      return next;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL');
  };

  const overdueCount = getOverduePayables().length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground">Gestiona tus proveedores, contactos y cuentas por pagar</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Proveedores Activos</p>
                <p className="text-2xl font-bold">{suppliers.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Total Por Pagar</p>
                <p className="text-2xl font-bold">{formatCurrency(globalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Documentos Vencidos</p>
                <p className="text-2xl font-bold">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="payables">Cuentas por Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o RUT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  Mostrar inactivos
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSuppliers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay proveedores registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSuppliers.map((supplier) => {
                    const isExpanded = expandedSuppliers.has(supplier.id);
                    const items = supplierItemsMap?.[supplier.id] || [];
                    
                    return (
                      <Collapsible key={supplier.id} open={isExpanded} onOpenChange={() => toggleExpanded(supplier.id)}>
                        <div className={`border rounded-lg ${!supplier.is_active ? 'opacity-60' : ''}`}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-4">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{supplier.name}</span>
                                    {!supplier.is_active && <Badge variant="secondary">Inactivo</Badge>}
                                    {supplier.payment_terms_type === 'credito' && (
                                      <Badge variant="outline">Crédito {supplier.payment_terms_days}d</Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {supplier.rut && <span className="mr-4">RUT: {supplier.rut}</span>}
                                    {supplier.phone && <span>{supplier.phone}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(supplier)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => toggleActiveSupplier(supplier.id, supplier.is_active)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="border-t p-4 bg-muted/20">
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Productos y Últimos Precios
                              </h4>
                              {items.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  No hay compras registradas para este proveedor
                                </p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Código</TableHead>
                                      <TableHead>Producto</TableHead>
                                      <TableHead>Unidad</TableHead>
                                      <TableHead className="text-right">Último Precio</TableHead>
                                      <TableHead className="text-right">Última Compra</TableHead>
                                      <TableHead className="text-right">Compras</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {items.map((item) => (
                                      <TableRow key={item.raw_material_id}>
                                        <TableCell className="font-mono text-sm">{item.raw_material_code || '-'}</TableCell>
                                        <TableCell>{item.raw_material_name}</TableCell>
                                        <TableCell>{item.uom_name}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.last_unit_cost)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{formatDate(item.last_purchase_date)}</TableCell>
                                        <TableCell className="text-right"><Badge variant="secondary">{item.purchase_count}</Badge></TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <SupplierPayablesTable supplierId="" showSupplierColumn />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SupplierFormModalEnhanced
        open={showFormModal}
        onOpenChange={setShowFormModal}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
    </div>
  );
}
