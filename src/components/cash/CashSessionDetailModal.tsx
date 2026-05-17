import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCashSession } from "@/hooks/useCashSession";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileDown, DollarSign, ShoppingCart, Truck, Coins, TrendingUp, TrendingDown, Edit, Save, X, User, Sparkles, Eye, Trash2, Plus, Wallet, AlertTriangle, CalendarDays } from "lucide-react";
import jsPDF from 'jspdf';
import { ClosedSessionOrdersModal } from './ClosedSessionOrdersModal';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
  
  // States for movement management
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [editingMovementType, setEditingMovementType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [editingMovementAmount, setEditingMovementAmount] = useState<number>(0);
  const [editingMovementNote, setEditingMovementNote] = useState<string>('');
  const [deletingMovementId, setDeletingMovementId] = useState<string | null>(null);
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [newMovementType, setNewMovementType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [newMovementAmount, setNewMovementAmount] = useState<number>(0);
  const [newMovementNote, setNewMovementNote] = useState<string>('');
  
  const { 
    getSessionSummary, 
    updateSessionObservaciones, 
    updateClosingCash,
    updateCashMovement,
    deleteCashMovement,
    addCashMovementToClosedSession
  } = useCashSession();
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
      toast.error("Error", { description: "No se pudo cargar el detalle del cierre" });
    } finally {
      setLoading(false);
    }
  };

  const updateObservaciones = async () => {
    setIsUpdatingObservaciones(true);
    try {
      await updateSessionObservaciones(sessionId, observaciones);
      toast.success("Observaciones actualizadas", { description: "Las observaciones se guardaron correctamente" });
    } catch (error) {
      toast.error("Error", { description: "No se pudieron guardar las observaciones" });
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
      toast.success("Efectivo final actualizado", { description: "El cierre de caja se actualizó correctamente" });
    } catch (error) {
      toast.error("Error", { description: "No se pudo actualizar el efectivo final" });
    }
  };

  const handleEditMovement = (movement: any) => {
    setEditingMovementId(movement.id);
    setEditingMovementType(movement.type);
    setEditingMovementAmount(movement.amount);
    setEditingMovementNote(movement.note || '');
  };

  const handleSaveMovement = async () => {
    if (!editingMovementId) return;
    
    try {
      await updateCashMovement(
        editingMovementId,
        editingMovementType,
        editingMovementAmount,
        editingMovementNote
      );
      
      setEditingMovementId(null);
      await loadDetailData();
      
      toast.success("Movimiento actualizado", { description: "El movimiento de caja se actualizó correctamente" });
    } catch (error) {
      toast.error("Error", { description: "No se pudo actualizar el movimiento" });
    }
  };

  const handleCancelEdit = () => {
    setEditingMovementId(null);
    setEditingMovementType('ingreso');
    setEditingMovementAmount(0);
    setEditingMovementNote('');
  };

  const handleDeleteMovement = async () => {
    if (!deletingMovementId) return;
    
    try {
      await deleteCashMovement(deletingMovementId);
      setDeletingMovementId(null);
      await loadDetailData();
      
      toast.success("Movimiento eliminado", { description: "El movimiento de caja se eliminó correctamente" });
    } catch (error) {
      toast.error("Error", { description: "No se pudo eliminar el movimiento" });
    }
  };

  const handleAddMovement = async () => {
    if (!newMovementAmount || newMovementAmount <= 0) {
      toast.error("Error", { description: "El monto debe ser mayor a cero" });
      return;
    }

    try {
      await addCashMovementToClosedSession(
        sessionId,
        newMovementType,
        newMovementAmount,
        newMovementNote
      );
      
      setShowAddMovement(false);
      setNewMovementType('ingreso');
      setNewMovementAmount(0);
      setNewMovementNote('');
      await loadDetailData();
      
      toast.success("Movimiento agregado", { description: "El nuevo movimiento se agregó correctamente" });
    } catch (error) {
      toast.error("Error", { description: "No se pudo agregar el movimiento" });
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

          {/* Efectivo de Delivery */}
          {(summary?.totalCashDeliveryDeposited > 0 || summary?.totalCashDeliveryPending > 0) && (
            <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-600" />
                  Efectivo de Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Deposited this session */}
                {summary?.totalCashDeliveryDeposited > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Depositado durante este turno:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(summary.totalCashDeliveryDeposited)}</span>
                    </div>
                    
                    {/* Breakdown */}
                    <div className="pl-4 space-y-1 text-sm">
                      {summary?.deliveryCashFromThisShift > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>└ De este turno:</span>
                          <span>{formatCurrency(summary.deliveryCashFromThisShift)}</span>
                        </div>
                      )}
                      {summary?.deliveryCashFromOtherShifts > 0 && (
                        <div className="flex justify-between text-amber-700">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            └ De turnos anteriores:
                          </span>
                          <Badge variant="outline" className="text-amber-700 border-amber-400">
                            {formatCurrency(summary.deliveryCashFromOtherShifts)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Still pending */}
                {summary?.totalCashDeliveryPending > 0 && (
                  <div className="flex justify-between items-center p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium">Aún pendiente con repartidores:</span>
                    </div>
                    <Badge variant="destructive">
                      {formatCurrency(summary.totalCashDeliveryPending)}
                      {summary?.deliveryPersonsWithPending > 0 && (
                        <span className="ml-1">({summary.deliveryPersonsWithPending} repartidor{summary.deliveryPersonsWithPending !== 1 ? 'es' : ''})</span>
                      )}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Movimientos de Caja
                </CardTitle>
                {user?.role === 'Administrador' && session?.closed_at && !showAddMovement && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMovement(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Movimiento
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Form to add new movement */}
                {showAddMovement && user?.role === 'Administrador' && (
                  <div className="p-4 border-2 border-dashed rounded-lg bg-muted/50">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="new-movement-type">Tipo</Label>
                          <Select
                            value={newMovementType}
                            onValueChange={(value: 'ingreso' | 'egreso') => setNewMovementType(value)}
                          >
                            <SelectTrigger id="new-movement-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ingreso">Ingreso</SelectItem>
                              <SelectItem value="egreso">Egreso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="new-movement-amount">Monto</Label>
                          <Input
                            id="new-movement-amount"
                            type="number"
                            value={newMovementAmount || ''}
                            onChange={(e) => setNewMovementAmount(Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="new-movement-note">Nota</Label>
                        <Input
                          id="new-movement-note"
                          value={newMovementNote}
                          onChange={(e) => setNewMovementNote(e.target.value)}
                          placeholder="Descripción del movimiento..."
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddMovement(false);
                            setNewMovementType('ingreso');
                            setNewMovementAmount(0);
                            setNewMovementNote('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleAddMovement}>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing movements */}
                {movements && movements.length > 0 ? (
                  movements.map((movement: any) => (
                    <div key={movement.id}>
                      {editingMovementId === movement.id ? (
                        // Edit mode
                        <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="edit-type">Tipo</Label>
                                <Select
                                  value={editingMovementType}
                                  onValueChange={(value: 'ingreso' | 'egreso') => setEditingMovementType(value)}
                                >
                                  <SelectTrigger id="edit-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ingreso">Ingreso</SelectItem>
                                    <SelectItem value="egreso">Egreso</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-amount">Monto</Label>
                                <Input
                                  id="edit-amount"
                                  type="number"
                                  value={editingMovementAmount}
                                  onChange={(e) => setEditingMovementAmount(Number(e.target.value))}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="edit-note">Nota</Label>
                              <Input
                                id="edit-note"
                                value={editingMovementNote}
                                onChange={(e) => setEditingMovementNote(e.target.value)}
                                placeholder="Descripción del movimiento..."
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={handleSaveMovement}>
                                <Save className="w-4 h-4 mr-2" />
                                Guardar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1">
                            {movement.type === 'ingreso' ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">
                                {movement.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`font-semibold ${movement.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                                {movement.type === 'ingreso' ? '+' : '-'}{formatCurrency(movement.amount)}
                              </div>
                              {movement.note && (
                                <div className="text-xs text-muted-foreground">{movement.note}</div>
                              )}
                            </div>
                            {user?.role === 'Administrador' && session?.closed_at && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMovement(movement)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingMovementId(movement.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No hay movimientos de caja registrados
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingMovementId} onOpenChange={() => setDeletingMovementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El movimiento de caja será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMovement} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}