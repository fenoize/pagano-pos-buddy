import { useState, useEffect } from 'react';
import { Plus, Filter, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomerRunes, RunasTransactionFilters, RunasAdjustmentData } from '@/hooks/useCustomerRunes';
import { RunasTransaction, RunaMovementType, OrigenMovimiento } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerRunesProps {
  customerId: string;
}

export default function CustomerRunes({ customerId }: CustomerRunesProps) {
  const [currentSaldo, setCurrentSaldo] = useState(0);
  const [transactions, setTransactions] = useState<RunasTransaction[]>([]);
  const [filters, setFilters] = useState<RunasTransactionFilters>({});
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState<RunasAdjustmentData>({
    runas: 0,
    motivo: ''
  });
  const [loading, setLoading] = useState(false);

  const {
    runaValue,
    runaRewardValue, // Valor de canje
    canAdjustRunes,
    fetchRunaValue,
    calculateRunasSaldo,
    getRunasHistory,
    createManualAdjustment
  } = useCustomerRunes();

  const loadData = async () => {
    const saldo = await calculateRunasSaldo(customerId);
    setCurrentSaldo(saldo);

    const { transactions: history } = await getRunasHistory(customerId, filters);
    setTransactions(history);
  };

  useEffect(() => {
    loadData();
    fetchRunaValue();
  }, [customerId, filters]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatRunas = (runas: number) => {
    return new Intl.NumberFormat('es-CL').format(runas);
  };

  const getMovementIcon = (type: RunaMovementType) => {
    switch (type) {
      case 'acumulacion': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'canje': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'ajuste': return <DollarSign className="w-4 h-4 text-blue-600" />;
      case 'promo': return <Plus className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementBadgeVariant = (type: RunaMovementType) => {
    switch (type) {
      case 'acumulacion': return 'default';
      case 'canje': return 'destructive';
      case 'ajuste': return 'secondary';
      case 'promo': return 'secondary';
      default: return 'outline';
    }
  };

  const getMovementLabel = (type: RunaMovementType) => {
    switch (type) {
      case 'acumulacion': return 'Acumulación';
      case 'canje': return 'Canje';
      case 'ajuste': return 'Ajuste Manual';
      case 'promo': return 'Promoción';
      default: return type;
    }
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await createManualAdjustment(customerId, adjustmentData);
      if (success) {
        setIsAdjustmentModalOpen(false);
        setAdjustmentData({ runas: 0, motivo: '' });
        loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Saldo Actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Saldo Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{formatRunas(currentSaldo)}</p>
              <p className="text-sm text-muted-foreground">runas disponibles</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Valor Canjeable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatPrice(redeemableAmount)}</p>
              <p className="text-sm text-muted-foreground">equivalente en descuento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Valor Runa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatPrice(runaValue)}</p>
              <p className="text-sm text-muted-foreground">para ganar 1 runa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Historial de Runas</h3>
          <p className="text-sm text-muted-foreground">
            Movimientos de acumulación, canje y ajustes
          </p>
        </div>
        {canAdjustRunes && (
          <Button onClick={() => setIsAdjustmentModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajuste Manual
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select 
              value={filters.type || 'all'} 
              onValueChange={(value) => setFilters({...filters, type: value === 'all' ? undefined : value as RunaMovementType})}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="acumulacion">Acumulación</SelectItem>
                <SelectItem value="canje">Canje</SelectItem>
                <SelectItem value="ajuste">Ajuste Manual</SelectItem>
                <SelectItem value="promo">Promoción</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.origen || 'all'} 
              onValueChange={(value) => setFilters({...filters, origen: value === 'all' ? undefined : value as OrigenMovimiento})}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los orígenes</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="Web">Web</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Label htmlFor="dateFrom" className="text-sm">Desde:</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value || undefined})}
                className="w-40"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="dateTo" className="text-sm">Hasta:</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value || undefined})}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">Sin movimientos de runas</h4>
              <p className="text-muted-foreground">
                {Object.keys(filters).some(key => filters[key as keyof RunasTransactionFilters])
                  ? 'No hay movimientos que coincidan con los filtros aplicados'
                  : 'Este cliente aún no tiene movimientos de runas'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Runas</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(transaction.created_at), 'dd MMM yyyy', { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), 'HH:mm')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getMovementIcon(transaction.type)}
                        <Badge variant={getMovementBadgeVariant(transaction.type)}>
                          {getMovementLabel(transaction.type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${transaction.runas > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.runas > 0 ? '+' : ''}{formatRunas(transaction.runas)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.amount > 0 ? formatPrice(transaction.amount) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.origen}</Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.referencia ? (
                        <p className="text-sm">{transaction.referencia}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.motivo ? (
                        <p className="text-sm">{transaction.motivo}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Adjustment Modal */}
      <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajuste Manual de Runas</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAdjustment} className="space-y-4">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Atención:</strong> Los ajustes manuales quedan registrados en el historial 
                  con tu usuario como responsable. Asegúrate de incluir un motivo claro.
                </p>
              </CardContent>
            </Card>

            {/* Runas Amount */}
            <div className="space-y-2">
              <Label htmlFor="runas">Cantidad de Runas *</Label>
              <Input
                id="runas"
                type="number"
                value={adjustmentData.runas}
                onChange={(e) => setAdjustmentData({...adjustmentData, runas: parseInt(e.target.value) || 0})}
                placeholder="Ej: 100 para sumar, -50 para restar"
                required
              />
              <p className="text-xs text-muted-foreground">
                Usa números positivos para agregar runas, negativos para quitar
              </p>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del Ajuste *</Label>
              <Textarea
                id="motivo"
                value={adjustmentData.motivo}
                onChange={(e) => setAdjustmentData({...adjustmentData, motivo: e.target.value})}
                placeholder="Explica el motivo del ajuste (ej: Compensación por error en pedido)"
                rows={3}
                required
              />
            </div>

            {/* Preview */}
            {adjustmentData.runas !== 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Vista Previa del Ajuste</h4>
                  <div className="space-y-1 text-sm">
                    <p>Saldo actual: <strong>{formatRunas(currentSaldo)} runas</strong></p>
                    <p>Ajuste: <strong className={adjustmentData.runas > 0 ? 'text-green-600' : 'text-red-600'}>
                      {adjustmentData.runas > 0 ? '+' : ''}{formatRunas(adjustmentData.runas)} runas
                    </strong></p>
                    <p>Saldo final: <strong>{formatRunas(currentSaldo + adjustmentData.runas)} runas</strong></p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAdjustmentModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || adjustmentData.runas === 0 || !adjustmentData.motivo.trim()}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  'Aplicar Ajuste'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}