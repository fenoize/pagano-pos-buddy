import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCashSession } from "@/hooks/useCashSession";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileDown, DollarSign, ShoppingCart, Truck, Coins, TrendingUp, TrendingDown } from "lucide-react";
import jsPDF from 'jspdf';

interface CashSessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionData?: any;
}

export function CashSessionDetailModal({ 
  isOpen, 
  onClose, 
  sessionId, 
  sessionData 
}: CashSessionDetailModalProps) {
  const [observaciones, setObservaciones] = useState(sessionData?.session?.observaciones || '');
  const [isUpdatingObservaciones, setIsUpdatingObservaciones] = useState(false);
  const { getSessionSummary, updateSessionObservaciones } = useCashSession();
  const { toast } = useToast();

  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen && sessionId) {
      loadDetailData();
    } else if (!isOpen) {
      // Reset data when modal closes
      setDetailData(null);
      setObservaciones('');
    }
  }, [isOpen, sessionId]);

  const loadDetailData = async () => {
    setLoading(true);
    try {
      const data = await getSessionSummary(sessionId);
      setDetailData(data);
      setObservaciones(data?.session?.observaciones || '');
    } catch (error) {
      console.error('Error loading session detail:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle del cierre",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateObservaciones = async () => {
    setIsUpdatingObservaciones(true);
    try {
      await updateSessionObservaciones(sessionId, observaciones);
      toast({
        title: "Observaciones actualizadas",
        description: "Las observaciones se guardaron correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las observaciones",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingObservaciones(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const paymentMethodCounts = useMemo(() => {
    if (!detailData?.orders) return { efectivo: 0, mp: 0, pos: 0, mixto: 0 };
    
    return detailData.orders.reduce((acc: any, order: any) => {
      const hasEfectivo = order.payment_efectivo > 0;
      const hasMP = order.payment_mp > 0;
      const hasPOS = order.payment_pos > 0;
      
      const methodCount = [hasEfectivo, hasMP, hasPOS].filter(Boolean).length;
      
      if (methodCount > 1) {
        acc.mixto++;
      } else if (hasEfectivo) {
        acc.efectivo++;
      } else if (hasMP) {
        acc.mp++;
      } else if (hasPOS) {
        acc.pos++;
      }
      
      return acc;
    }, { efectivo: 0, mp: 0, pos: 0, mixto: 0 });
  }, [detailData?.orders]);

  const deliveryData = useMemo(() => {
    if (!detailData?.orders) return { count: 0, total: 0 };
    
    const deliveryOrders = detailData.orders.filter((order: any) => order.fulfillment === 'delivery');
    return {
      count: deliveryOrders.length,
      total: deliveryOrders.reduce((sum: number, order: any) => sum + (order.delivery_fee || 0), 0)
    };
  }, [detailData?.orders]);

  const exportToPDF = () => {
    if (!detailData || !detailData.session) return;

    const doc = new jsPDF();
    const { session, summary, movements, orders } = detailData;
    
    // Header
    doc.setFontSize(20);
    doc.text('Detalle de Cierre de Caja', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Turno: ${format(new Date(session.opened_at), 'dd/MM/yyyy HH:mm', { locale: es })} - ${session.closed_at ? format(new Date(session.closed_at), 'dd/MM/yyyy HH:mm', { locale: es }) : 'Activo'}`, 20, 35);
    
    let yPos = 50;
    
    // Resumen Financiero
    doc.setFontSize(14);
    doc.text('Resumen Financiero', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Efectivo Inicial: ${formatCurrency(session.opening_cash)}`, 20, yPos);
    yPos += 6;
    doc.text(`Efectivo Final: ${formatCurrency(session.closing_cash || 0)}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Ventas: ${formatCurrency(summary.totalSales)}`, 20, yPos);
    yPos += 6;
    doc.text(`Efectivo: ${formatCurrency(summary.totalCash)} (${paymentMethodCounts.efectivo} ventas)`, 20, yPos);
    yPos += 6;
    doc.text(`Mercado Pago: ${formatCurrency(summary.totalMP)} (${paymentMethodCounts.mp} ventas)`, 20, yPos);
    yPos += 6;
    doc.text(`POS: ${formatCurrency(summary.totalPOS)} (${paymentMethodCounts.pos} ventas)`, 20, yPos);
    yPos += 6;
    doc.text(`Pagos Mixtos: ${paymentMethodCounts.mixto} ventas`, 20, yPos);
    yPos += 15;
    
    // Delivery
    doc.setFontSize(14);
    doc.text('Delivery', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Pedidos con Delivery: ${deliveryData.count}`, 20, yPos);
    yPos += 6;
    doc.text(`Total Delivery: ${formatCurrency(deliveryData.total)}`, 20, yPos);
    yPos += 15;
    
    // Movimientos
    if (movements?.length > 0) {
      doc.setFontSize(14);
      doc.text('Movimientos de Caja', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      
      movements.forEach((movement: any) => {
        const typeText = movement.type === 'ingreso' ? 'Ingreso' : 'Egreso';
        const amountText = `${typeText}: ${formatCurrency(movement.amount)}`;
        doc.text(`${amountText} - ${movement.note || 'Sin nota'}`, 20, yPos);
        yPos += 6;
      });
      yPos += 10;
    }
    
    // Observaciones
    if (observaciones) {
      doc.setFontSize(14);
      doc.text('Observaciones', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(observaciones, 170);
      lines.forEach((line: string) => {
        doc.text(line, 20, yPos);
        yPos += 6;
      });
    }
    
    doc.save(`cierre-caja-${format(new Date(session.opened_at), 'dd-MM-yyyy-HHmm')}.pdf`);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Cargando detalle del cierre...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!detailData || !detailData.session) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="text-center py-8">
            <p>No se encontraron datos del cierre</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { session, summary, movements, orders } = detailData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Detalle de Cierre de Caja</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {session?.opened_at && format(new Date(session.opened_at), 'dd/MM/yyyy HH:mm', { locale: es })} - {' '}
                {session?.closed_at ? format(new Date(session.closed_at), 'dd/MM/yyyy HH:mm', { locale: es }) : 'Activo'}
              </p>
            </div>
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <FileDown className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen Financiero */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Efectivo Inicial:</span>
                    <span className="font-medium">{formatCurrency(session?.opening_cash || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Efectivo Final:</span>
                    <span className="font-medium">{formatCurrency(session?.closing_cash || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Ventas:</span>
                    <span className="font-semibold text-lg">{formatCurrency(summary?.totalSales || 0)}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Efectivo:</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(summary?.totalCash || 0)}</div>
                      <div className="text-xs text-muted-foreground">{paymentMethodCounts.efectivo} ventas</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Mercado Pago:</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(summary?.totalMP || 0)}</div>
                      <div className="text-xs text-muted-foreground">{paymentMethodCounts.mp} ventas</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">POS:</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(summary?.totalPOS || 0)}</div>
                      <div className="text-xs text-muted-foreground">{paymentMethodCounts.pos} ventas</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pagos Mixtos:</span>
                    <Badge variant="secondary">{paymentMethodCounts.mixto} ventas</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{deliveryData.count}</div>
                  <div className="text-sm text-muted-foreground">Pedidos con Delivery</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(deliveryData.total)}</div>
                  <div className="text-sm text-muted-foreground">Total Delivery</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Movimientos de Caja */}
          {movements && movements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Movimientos de Caja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {movements.map((movement: any) => (
                    <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {movement.type === 'ingreso' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium">
                            {movement.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${movement.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.type === 'ingreso' ? '+' : '-'}{formatCurrency(movement.amount)}
                        </div>
                        {movement.note && (
                          <div className="text-xs text-muted-foreground">{movement.note}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="observaciones">Notas del cierre</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregar observaciones del cierre de caja..."
                rows={3}
              />
              {observaciones !== (session?.observaciones || '') && (
                <Button 
                  onClick={updateObservaciones}
                  disabled={isUpdatingObservaciones}
                  size="sm"
                >
                  {isUpdatingObservaciones ? 'Guardando...' : 'Guardar Observaciones'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}