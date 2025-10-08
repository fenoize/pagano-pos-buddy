import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCashSession } from "@/hooks/useCashSession";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileDown, DollarSign, ShoppingCart, Truck, Coins, TrendingUp, TrendingDown, Edit, Save, X, User, Sparkles, Eye } from "lucide-react";
import jsPDF from 'jspdf';
import { ClosedSessionOrdersModal } from './ClosedSessionOrdersModal';

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
  const [isEditingClosure, setIsEditingClosure] = useState(false);
  const [editedClosingCash, setEditedClosingCash] = useState<number>(0);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const { getSessionSummary, updateSessionObservaciones, updateClosingCash } = useCashSession();
  const { toast } = useToast();
  const { user } = useAuthContext();

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
      setEditedClosingCash(data?.session?.closing_cash || 0);
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
    if (!detailData?.orders) return { efectivo: 0, mp: 0, pos: 0, aplicacion: 0, mixto: 0 };
    
    return detailData.orders.reduce((acc: any, order: any) => {
      const hasEfectivo = order.payment_efectivo > 0;
      const hasMP = order.payment_mp > 0;
      const hasPOS = order.payment_pos > 0;
      const hasAplicacion = order.payment_aplicacion > 0;
      
      const methodCount = [hasEfectivo, hasMP, hasPOS, hasAplicacion].filter(Boolean).length;
      
      if (methodCount > 1) {
        acc.mixto++;
      } else if (hasEfectivo) {
        acc.efectivo++;
      } else if (hasMP) {
        acc.mp++;
      } else if (hasPOS) {
        acc.pos++;
      } else if (hasAplicacion) {
        acc.aplicacion++;
      }
      
      return acc;
    }, { efectivo: 0, mp: 0, pos: 0, aplicacion: 0, mixto: 0 });
  }, [detailData?.orders]);

  const deliveryData = useMemo(() => {
    if (!detailData?.orders) return { count: 0, total: 0, orders: [] };
    
    const deliveryOrders = detailData.orders.filter((order: any) => order.fulfillment === 'delivery');
    return {
      count: deliveryOrders.length,
      total: deliveryOrders.reduce((sum: number, order: any) => sum + (order.delivery_fee || 0), 0),
      orders: deliveryOrders
    };
  }, [detailData?.orders]);

  const repartidoresPayment = useMemo(() => {
    if (!detailData?.orders) return [];
    
    const deliveryOrders = detailData.orders.filter((order: any) => order.fulfillment === 'delivery');
    
    // Group by delivery person
    const grouped = deliveryOrders.reduce((acc: any, order: any) => {
      const personId = order.delivery_person_id || 'unassigned';
      const personName = order.delivery_person_name || 'Sin asignar';
      
      if (!acc[personId]) {
        acc[personId] = {
          id: personId,
          name: personName,
          orders: [],
          totalFee: 0
        };
      }
      
      acc[personId].orders.push(order);
      acc[personId].totalFee += order.delivery_fee || 0;
      
      return acc;
    }, {});
    
    return Object.values(grouped) as Array<{ id: string; name: string; orders: any[]; totalFee: number }>;
  }, [detailData?.orders]);

  const handleSaveClosingCash = async () => {
    try {
      await updateClosingCash(sessionId, editedClosingCash);
      setIsEditingClosure(false);
      await loadDetailData(); // Reload data
      toast({
        title: "Efectivo final actualizado",
        description: "El cierre de caja se actualizó correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el efectivo final",
        variant: "destructive"
      });
    }
  };

  const exportToPDF = () => {
    if (!detailData || !detailData.session) return;

    const doc = new jsPDF();
    const { session, summary, movements } = detailData;
    
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
    doc.text(`Aplicación: ${formatCurrency(summary.totalAplicacion)} (${paymentMethodCounts.aplicacion} ventas)`, 20, yPos);
    yPos += 6;
    doc.text(`Pagos Mixtos: ${paymentMethodCounts.mixto} ventas`, 20, yPos);
    yPos += 15;
    
    // Detalle de Pedidos
    if (orders && orders.length > 0) {
      doc.setFontSize(14);
      doc.text('Detalle de Pedidos', 20, yPos);
      yPos += 10;
      doc.setFontSize(9);
      
      // Headers de la tabla
      doc.setFont('helvetica', 'bold');
      doc.text('#', 20, yPos);
      doc.text('Fecha/Hora', 30, yPos);
      doc.text('Cliente', 65, yPos);
      doc.text('Entrega', 105, yPos);
      doc.text('Pago', 135, yPos);
      doc.text('Monto', 175, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      
      // Línea separadora
      doc.line(20, yPos, 190, yPos);
      yPos += 5;
      
      orders.forEach((order: any) => {
        // Verificar si necesitamos nueva página
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          // Repetir headers en nueva página
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('#', 20, yPos);
          doc.text('Fecha/Hora', 30, yPos);
          doc.text('Cliente', 65, yPos);
          doc.text('Entrega', 105, yPos);
          doc.text('Pago', 135, yPos);
          doc.text('Monto', 175, yPos);
          yPos += 5;
          doc.line(20, yPos, 190, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
        }
        
        // Número de orden
        doc.text(`${order.order_number}`, 20, yPos);
        
        // Fecha y hora
        const orderDate = format(new Date(order.created_at), 'dd/MM HH:mm', { locale: es });
        doc.text(orderDate, 30, yPos);
        
        // Cliente
        let customerText = '-';
        if (order.customer_id && order.customers) {
          const customerName = order.customers.name || 
                              `${order.customers.nombres || ''} ${order.customers.apellidos || ''}`.trim();
          customerText = customerName ? `${customerName} (R)` : 'Cliente (R)';
        } else if (order.nombre_resumen) {
          customerText = order.nombre_resumen;
        }
        doc.text(customerText.substring(0, 18), 65, yPos);
        
        // Tipo de entrega
        let deliveryText = order.fulfillment === 'delivery' ? 'Delivery' : 'Retiro';
        if (order.fulfillment === 'delivery' && order.delivery_person_name) {
          deliveryText = `D: ${order.delivery_person_name.substring(0, 12)}`;
        }
        doc.text(deliveryText, 105, yPos);
        
        // Método de pago
        const payments = [];
        if (order.payment_efectivo > 0) payments.push('Efec');
        if (order.payment_mp > 0) payments.push('MP');
        if (order.payment_pos > 0) payments.push('POS');
        if (order.payment_aplicacion > 0) payments.push('App');
        if (order.payment_runas > 0) payments.push('Runas');
        const paymentText = payments.join('+') || order.payment_method || '-';
        doc.text(paymentText, 135, yPos);
        
        // Monto
        doc.text(formatCurrency(order.total), 185, yPos, { align: 'right' });
        
        yPos += 5;
      });
      
      yPos += 10;
    }
    
    // Pagos a Repartidores
    if (repartidoresPayment.length > 0) {
      doc.setFontSize(14);
      doc.text('Pagos a Repartidores', 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      
      repartidoresPayment.forEach((rep: any) => {
        doc.text(`${rep.name}: ${formatCurrency(rep.totalFee)} (${rep.orders.length} pedidos)`, 20, yPos);
        yPos += 6;
        
        rep.orders.forEach((order: any) => {
          doc.text(`  #${order.order_number}: ${order.delivery_address} ${order.delivery_number}, ${order.delivery_comuna} - ${formatCurrency(order.delivery_fee)}`, 25, yPos);
          yPos += 5;
        });
        yPos += 3;
      });
      
      const totalRepartidores = repartidoresPayment.reduce((sum, rep) => sum + rep.totalFee, 0);
      doc.setFontSize(11);
      doc.text(`Total a pagar a repartidores: ${formatCurrency(totalRepartidores)}`, 20, yPos);
      yPos += 15;
      doc.setFontSize(10);
    }
    
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
            <div className="flex gap-2">
              {user?.role === 'Administrador' && session?.closed_at && (
                <Button 
                  onClick={() => setShowOrdersModal(true)} 
                  variant="outline" 
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Todos los Pedidos
                </Button>
              )}
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Efectivo Final:</span>
                    {isEditingClosure ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editedClosingCash}
                          onChange={(e) => setEditedClosingCash(Number(e.target.value))}
                          className="w-32 h-8"
                        />
                        <Button size="sm" variant="ghost" onClick={() => setIsEditingClosure(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={handleSaveClosingCash}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(session?.closing_cash || 0)}</span>
                        {user?.role === 'Administrador' && session?.closed_at && (
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingClosure(true)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
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
                    <span className="text-sm text-muted-foreground">Aplicación (Uber/PedidosYa):</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(summary?.totalAplicacion || 0)}</div>
                      <div className="text-xs text-muted-foreground">{paymentMethodCounts.aplicacion} ventas</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pagos Mixtos:</span>
                    <Badge variant="secondary">{paymentMethodCounts.mixto} ventas</Badge>
                  </div>
                </div>

                {/* Ventas en Runas Section */}
                {summary?.totalRunasQuantity > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Ventas en Runas
                    </h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Total Runas Utilizadas:</span>
                      <span className="font-medium">{summary.totalRunasQuantity} runas</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Valor en CLP:</span>
                      <span className="font-medium">{formatCurrency(summary.totalRunasAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Ventas con Runas:</span>
                      <Badge variant="outline">{summary.ventasConRunas} ventas</Badge>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Ventas Real:</span>
                    <span className="text-primary">{formatCurrency(summary?.totalSalesReal || 0)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    (Total sin incluir el valor de runas canjeadas)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pedidos del Turno */}
          {orders && orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Pedidos del Turno ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">#{order.order_number}</span>
                        <Badge variant={order.fulfillment === 'delivery' ? 'default' : 'secondary'}>
                          {order.fulfillment === 'delivery' ? 'Delivery' : 'Retiro'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'HH:mm', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {order.fulfillment === 'delivery' && order.delivery_person_name && (
                          <span className="text-xs text-muted-foreground">
                            <User className="w-3 h-3 inline mr-1" />
                            {order.delivery_person_name}
                          </span>
                        )}
                        <span className="font-medium">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pagos a Repartidores */}
          {repartidoresPayment.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Pagos a Repartidores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {repartidoresPayment.map((rep: any) => (
                    <div key={rep.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="font-semibold">{rep.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">{formatCurrency(rep.totalFee)}</div>
                          <div className="text-xs text-muted-foreground">{rep.orders.length} pedidos</div>
                        </div>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="space-y-1">
                        {rep.orders.map((order: any) => (
                          <div key={order.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              #{order.order_number} - {order.delivery_address} {order.delivery_number}, {order.delivery_comuna}
                            </span>
                            <span className="font-medium">{formatCurrency(order.delivery_fee)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold">Total a pagar a repartidores:</span>
                    <span className="font-bold text-xl">
                      {formatCurrency(repartidoresPayment.reduce((sum, rep) => sum + rep.totalFee, 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

      <ClosedSessionOrdersModal
        sessionId={sessionId}
        isOpen={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
        onSessionUpdated={() => {
          loadDetailData();
        }}
      />
    </Dialog>
  );
}