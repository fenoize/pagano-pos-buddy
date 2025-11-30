import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Package, Warehouse as WarehouseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useWarehouses } from '@/hooks/useWarehouses';
import { useRawMaterials } from '@/hooks/useRawMaterials';
import { useStockBalances } from '@/hooks/useStockBalances';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TransferHistory {
  id: string;
  created_at: string;
  raw_material_name: string;
  from_warehouse: string;
  to_warehouse: string;
  quantity: number;
  uom: string;
  notes: string;
  created_by: string;
}

export default function StockTransfers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const { materials: rawMaterials, loading: materialsLoading } = useRawMaterials();
  const { processTransfer, isLoading: transferLoading } = useInventory();
  
  // Form state
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('');
  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Stock balances for source warehouse
  const { balances: sourceBalances, loading: balancesLoading, fetchBalances } = useStockBalances(fromWarehouseId || undefined);
  
  // Transfer history
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const activeWarehouses = warehouses.filter(w => w.is_active);
  const activeMaterials = rawMaterials.filter(m => m.is_active);
  
  // Get selected material details
  const selectedMaterial = activeMaterials.find(m => m.id === selectedMaterialId);
  
  // Get available stock for selected material in source warehouse
  const availableStock = sourceBalances.find(b => b.raw_material_id === selectedMaterialId);
  
  // Fetch transfer history
  const fetchTransferHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_moves')
        .select(`
          id,
          created_at,
          qty_in,
          qty_out,
          move_type,
          notes,
          raw_materials!inner(name),
          warehouses!inner(name),
          users(username)
        `)
        .eq('move_type', 'transfer_in')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Group transfers by notes (which should contain transfer ID or similar)
      const history: TransferHistory[] = (data || [])
        .filter((m: any) => m.qty_in > 0) // Only show incoming movements
        .map((m: any) => ({
          id: m.id,
          created_at: m.created_at,
          raw_material_name: m.raw_materials?.name || 'N/A',
          from_warehouse: 'Origen',
          to_warehouse: m.warehouses?.name || 'N/A',
          quantity: m.qty_in || 0,
          uom: '',
          notes: m.notes || '',
          created_by: m.users?.username || 'Sistema',
        }));
      
      setTransferHistory(history);
    } catch (error) {
      console.error('Error fetching transfer history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTransferHistory();
  }, []);
  
  // Reset material selection when source warehouse changes
  useEffect(() => {
    setSelectedMaterialId('');
    setQuantity('');
  }, [fromWarehouseId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromWarehouseId || !toWarehouseId || !selectedMaterialId || !quantity || !user) {
      toast({
        title: 'Error',
        description: 'Complete todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }
    
    if (fromWarehouseId === toWarehouseId) {
      toast({
        title: 'Error',
        description: 'El almacén origen y destino no pueden ser iguales',
        variant: 'destructive',
      });
      return;
    }
    
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: 'Error',
        description: 'La cantidad debe ser mayor a 0',
        variant: 'destructive',
      });
      return;
    }
    
    if (availableStock && qty > availableStock.quantity) {
      toast({
        title: 'Error',
        description: `Stock insuficiente. Disponible: ${availableStock.quantity} ${availableStock.uom_abbreviation}`,
        variant: 'destructive',
      });
      return;
    }
    
    const result = await processTransfer(
      selectedMaterialId,
      fromWarehouseId,
      toWarehouseId,
      null, // lotId
      qty,
      selectedMaterial?.base_uom_id || '',
      notes,
      user.id
    );
    
    if (result.success) {
      // Reset form
      setSelectedMaterialId('');
      setQuantity('');
      setNotes('');
      // Refresh balances and history
      fetchBalances();
      fetchTransferHistory();
    }
  };
  
  const isLoading = warehousesLoading || materialsLoading;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pos/inventario')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-primary">Transferencias de Stock</h1>
          <p className="text-muted-foreground">Mover inventario entre almacenes</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-teal-600" />
              Nueva Transferencia
            </CardTitle>
            <CardDescription>Seleccione origen, destino y cantidad a transferir</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source Warehouse */}
              <div className="space-y-2">
                <Label htmlFor="fromWarehouse">Almacén Origen *</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione almacén origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} disabled={w.id === toWarehouseId}>
                        {w.name} {w.is_default && '(Principal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Destination Warehouse */}
              <div className="space-y-2">
                <Label htmlFor="toWarehouse">Almacén Destino *</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione almacén destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id} disabled={w.id === fromWarehouseId}>
                        {w.name} {w.is_default && '(Principal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Material Selection */}
              <div className="space-y-2">
                <Label htmlFor="material">Materia Prima *</Label>
                <Select 
                  value={selectedMaterialId} 
                  onValueChange={setSelectedMaterialId}
                  disabled={!fromWarehouseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={fromWarehouseId ? "Seleccione materia prima" : "Primero seleccione almacén origen"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMaterials.map((m) => {
                      const stock = sourceBalances.find(b => b.raw_material_id === m.id);
                      return (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} {stock ? `(${stock.quantity} ${stock.uom_abbreviation})` : '(Sin stock)'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Available Stock Info */}
              {selectedMaterialId && availableStock && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Stock disponible:</span>{' '}
                    <span className={availableStock.is_low_stock ? 'text-destructive' : 'text-primary'}>
                      {availableStock.quantity} {availableStock.uom_abbreviation}
                    </span>
                    {availableStock.is_low_stock && (
                      <Badge variant="destructive" className="ml-2">Stock bajo</Badge>
                    )}
                  </p>
                </div>
              )}
              
              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad a Transferir *</Label>
                <div className="flex gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={availableStock?.quantity || 999999}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                    disabled={!selectedMaterialId}
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground min-w-[60px]">
                    {availableStock?.uom_abbreviation || 'UND'}
                  </div>
                </div>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo de la transferencia..."
                  rows={2}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={transferLoading || !fromWarehouseId || !toWarehouseId || !selectedMaterialId || !quantity}
              >
                {transferLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Realizar Transferencia
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Stock in Source Warehouse */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WarehouseIcon className="h-5 w-5 text-blue-600" />
              Stock en Almacén Origen
            </CardTitle>
            <CardDescription>
              {fromWarehouseId 
                ? `Inventario disponible en ${activeWarehouses.find(w => w.id === fromWarehouseId)?.name || 'almacén seleccionado'}`
                : 'Seleccione un almacén origen para ver el stock'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!fromWarehouseId ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Seleccione un almacén origen</p>
              </div>
            ) : balancesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : sourceBalances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sin stock en este almacén</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceBalances.map((balance) => (
                      <TableRow 
                        key={`${balance.raw_material_id}-${balance.warehouse_id}`}
                        className={selectedMaterialId === balance.raw_material_id ? 'bg-primary/10' : ''}
                      >
                        <TableCell className="font-medium">
                          {balance.raw_material_name}
                          {balance.raw_material_code && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({balance.raw_material_code})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {balance.quantity} {balance.uom_abbreviation}
                        </TableCell>
                        <TableCell>
                          {balance.is_low_stock ? (
                            <Badge variant="destructive">Bajo</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Transfer History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Transferencias</CardTitle>
          <CardDescription>Últimas 20 transferencias realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : transferHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay transferencias registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferHistory.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-sm">
                        {new Date(transfer.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{transfer.raw_material_name}</TableCell>
                      <TableCell>{transfer.to_warehouse}</TableCell>
                      <TableCell className="text-right">{transfer.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {transfer.notes || '-'}
                      </TableCell>
                      <TableCell className="text-sm">{transfer.created_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
