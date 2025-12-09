import { useState } from 'react';
import { useSuppliers, Supplier } from '@/hooks/useSuppliers';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Building2, 
  Package,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SupplierItemPrice {
  raw_material_id: string;
  raw_material_name: string;
  raw_material_code: string;
  uom_name: string;
  last_unit_cost: number;
  last_purchase_date: string;
  purchase_count: number;
}

interface SupplierFormData {
  name: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
}

const emptyForm: SupplierFormData = {
  name: '',
  rut: '',
  email: '',
  phone: '',
  address: '',
};

export default function FinanceSuppliers() {
  const { suppliers, loading, createSupplier, updateSupplier, toggleActiveSupplier, refetch } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  // Fetch all suppliers including inactive
  const { data: allSuppliers } = useQuery({
    queryKey: ['all-suppliers', showInactive],
    queryFn: async () => {
      const query = supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (!showInactive) {
        query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Supplier[];
    },
  });

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

    // Group by raw_material_id and get latest price
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

  // Query for expanded supplier items
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

  const displaySuppliers = allSuppliers || suppliers;
  const filteredSuppliers = displaySuppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.rut && s.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenNew = () => {
    setEditingSupplier(null);
    setFormData(emptyForm);
    setShowFormModal(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      rut: supplier.rut || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (editingSupplier) {
      const success = await updateSupplier(editingSupplier.id, formData);
      if (success) {
        setShowFormModal(false);
        refetch();
      }
    } else {
      const success = await createSupplier(formData);
      if (success) {
        setShowFormModal(false);
        refetch();
      }
    }

    setSaving(false);
  };

  const handleToggleActive = async (supplier: Supplier) => {
    await toggleActiveSupplier(supplier.id, supplier.is_active);
    refetch();
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
          <p className="text-muted-foreground">Gestiona tus proveedores y sus últimos precios</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

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
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="mr-2"
                />
                Mostrar inactivos
              </label>
            </div>
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
                  <Collapsible
                    key={supplier.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(supplier.id)}
                  >
                    <div className={`border rounded-lg ${!supplier.is_active ? 'opacity-60' : ''}`}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{supplier.name}</span>
                                {!supplier.is_active && (
                                  <Badge variant="secondary">Inactivo</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {supplier.rut && <span className="mr-4">RUT: {supplier.rut}</span>}
                                {supplier.phone && <span className="mr-4">{supplier.phone}</span>}
                                {supplier.email && <span>{supplier.email}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(supplier)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(supplier)}
                            >
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
                                    <TableCell className="font-mono text-sm">
                                      {item.raw_material_code || '-'}
                                    </TableCell>
                                    <TableCell>{item.raw_material_name}</TableCell>
                                    <TableCell>{item.uom_name}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(item.last_unit_cost)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      {formatDate(item.last_purchase_date)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge variant="secondary">{item.purchase_count}</Badge>
                                    </TableCell>
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

      {/* Form Modal */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                placeholder="12.345.678-9"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Dirección del proveedor"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
