import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Order, OrderItem, Comuna, Customer, Product, ProductVariantOption } from '@/types';
import { useOrderEdit, OrderEditData } from '@/hooks/useOrderEdit';
import { useCustomers } from '@/hooks/useCustomers';
import { useComunas } from '@/hooks/useComunas';
import { useUsers } from '@/hooks/useUsers';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useCustomerRunes } from '@/hooks/useCustomerRunes';
import { useCashSession } from '@/hooks/useCashSession';
import { useToast } from '@/hooks/use-toast';
import { formatDeliveryAddress } from '@/lib/deliveryHelpers';
import { formatCurrency } from '@/lib/utils';
import { OrderItemEditRow } from './OrderItemEditRow';
import ProductGrid from '@/components/pos/ProductGrid';
import { ProductCustomizationModalEnhanced } from '@/components/pos/ProductCustomizationModalEnhanced';
import { OrderHistoryModal } from './OrderHistoryModal';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Save, X, History, Plus, MapPin, User, Banknote, CreditCard, Smartphone, AppWindow, Sparkles, DollarSign, Coins, Wallet, AlertTriangle, Search, UtensilsCrossed, ShoppingBag, Clock, ArrowRightLeft } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface OrderEditModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: Order) => void;
}

export function OrderEditModal({ order, isOpen, onClose, onOrderUpdated }: OrderEditModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<OrderEditData | null>(null);
  const [reason, setReason] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [runasEditadas, setRunasEditadas] = useState(0);
  const [saldoRunasCliente, setSaldoRunasCliente] = useState(0);
  const [valorRunaActual, setValorRunaActual] = useState(0);
  const [valorRunaCanje, setValorRunaCanje] = useState(600);
  const [belongsToClosedSession, setBelongsToClosedSession] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [orderCashSessionId, setOrderCashSessionId] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [assigningSession, setAssigningSession] = useState(false);
  
  // Product selection states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [preloadedData, setPreloadedData] = useState<{
    variants: Record<string, ProductVariantOption[]>;
    extras: any[];
    modifiers: any[];
    combos: Record<string, any>;
  }>({ variants: {}, extras: [], modifiers: [], combos: {} });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  
  const { updateOrder, calculateTotals, isLoading } = useOrderEdit();
  const { customers } = useCustomers();
  const { comunas } = useComunas();
  const { users, fetchUsers } = useUsers();
  const { paymentMethods } = usePaymentMethods();
  const { getCustomerRunasBalance, fetchRunaValue } = useCustomerRunes();
  const { checkActiveSession } = useCashSession();
  const { toast } = useToast();
  const { canManageCashSessions } = usePermissions();
  const repartidores = users.filter(u => u.can_do_delivery && u.active);

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Banknote, CreditCard, Smartphone, AppWindow, Sparkles, DollarSign, Coins, Wallet
    };
    return icons[iconName] || DollarSign;
  };

  // Cargar productos para el selector
  const loadProductsForSelector = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories(
            categories(
              id,
              name
            )
          )
        `)
        .eq('active', true)
        .eq('show_in_pos', true);
      
      if (error) throw error;
      
      setAvailableProducts((data || []).map(p => ({
        ...p,
        prices: p.prices as any,
        categories: p.product_categories?.map((pc: any) => pc.categories) || []
      })) as Product[]);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    }
  };

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      // Cargar usuarios inmediatamente al abrir
      const loadData = async () => {
        // Cargar usuarios primero (para que repartidores estén disponibles)
        await fetchUsers();
        
        // Cargar saldo de runas si hay customer
        if (order && order.customer_id) {
          const balance = await getCustomerRunasBalance(order.customer_id!);
          const value = await fetchRunaValue();
          setSaldoRunasCliente(balance);
          setValorRunaActual(value);
          
          // Fetch redemption value separately
          const { data: rewData } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'runa_reward_value')
            .single();
          if (rewData) setValorRunaCanje(rewData.value as number);
        }

        // Check if order belongs to closed session
        if (order?.id) {
          checkIfClosedSession();
        }
      };
      
      loadData();
    }
  }, [isOpen, order]);

  // Cargar productos cuando se abre el selector
  useEffect(() => {
    if (showProductSelector && availableProducts.length === 0) {
      loadProductsForSelector();
    }
  }, [showProductSelector]);

  const checkIfClosedSession = async () => {
    if (!order?.id) return;
    
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          cash_session_id,
          cash_sessions:cash_sessions (
            id,
            closed_at,
            opened_at,
            user_id
          )
        `)
        .eq('id', order.id)
        .single();
      
      setOrderCashSessionId(data?.cash_session_id || null);
      
      if (data && data.cash_session_id && (data.cash_sessions as any)?.closed_at) {
        setBelongsToClosedSession(true);
        setSessionInfo((data.cash_sessions as any));
      } else {
        setBelongsToClosedSession(false);
        setSessionInfo(data?.cash_session_id ? (data.cash_sessions as any) : null);
      }
    } catch (error) {
      console.error('Error checking session status:', error);
    }
  };

  const loadRecentSessions = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data } = await supabase
        .from('cash_sessions')
        .select('id, opened_at, closed_at, user_id, opening_cash')
        .gte('opened_at', sevenDaysAgo.toISOString())
        .order('opened_at', { ascending: false })
        .limit(20);
      
      // Fetch user names for sessions
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username')
          .in('id', userIds);
        
        const userMap = Object.fromEntries((usersData || []).map(u => [u.id, u.username]));
        setRecentSessions(data.map(s => ({ ...s, username: userMap[s.user_id] || 'Desconocido' })));
      } else {
        setRecentSessions([]);
      }
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  };

  const handleAssignSession = async (sessionId: string) => {
    if (!order?.id) return;
    setAssigningSession(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ cash_session_id: sessionId })
        .eq('id', order.id);
      
      if (error) throw error;
      
      toast({ title: "Turno asignado", description: "El pedido fue asignado al turno correctamente." });
      setOrderCashSessionId(sessionId);
      setShowSessionSelector(false);
      await checkIfClosedSession();
      // Refresh parent
      onOrderUpdated({ ...order });
    } catch (error) {
      console.error('Error assigning session:', error);
      toast({ title: "Error", description: "No se pudo asignar el turno", variant: "destructive" });
    } finally {
      setAssigningSession(false);
    }
  };

  useEffect(() => {
    if (order && isEditMode) {
      console.log('[OrderEditModal] Initializing edit mode with order:', {
        order_number: order.order_number,
        has_items: !!order.items,
        items_length: Array.isArray(order.items) ? order.items.length : 0,
        subtotal: order.subtotal,
        total: order.total
      });
      
      setEditData({
        items: [...(Array.isArray(order.items) ? order.items : [])],
        delivery_fee: order.delivery_fee || 0,
        fulfillment: order.fulfillment,
        pickup_mode: order.pickup_mode as 'servir' | 'llevar' | undefined,
        payment_method: order.payment_method,
        payment_efectivo: order.payment_efectivo || 0,
        payment_mp: order.payment_mp || 0,
        payment_pos: order.payment_pos || 0,
        payment_aplicacion: order.payment_aplicacion || 0,
        payment_runas: order.payment_runas || 0,
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        total: order.total || 0,
        delivery_address: order.delivery_address || '',
        delivery_number: order.delivery_number || '',
        delivery_comuna_id: order.delivery_comuna_id || '',
        delivery_reference: order.delivery_reference || '',
        delivery_person_id: order.delivery_person_id || null,
        customer_id: order.customer_id || undefined,
        nombre_resumen: order.nombre_resumen || ''
      });
      setRunasEditadas(order.payment_runas || 0);
      setCustomerSearch('');
      setCustomerResults([]);
      
      console.log('[OrderEditModal] Edit data initialized:', {
        items_count: Array.isArray(order.items) ? order.items.length : 0
      });
    }
  }, [order, isEditMode]);

  useEffect(() => {
    if (editData && editData.items) {
      console.log('[OrderEditModal] Recalculating totals for items:', editData.items.length);
      const totals = calculateTotals(editData.items, editData.delivery_fee, editData.discount);
      console.log('[OrderEditModal] New totals:', totals);
      setEditData(prev => prev ? { ...prev, ...totals } : null);
    }
  }, [editData?.items, editData?.delivery_fee, editData?.discount, calculateTotals]);

  const handleSave = async () => {
    if (!order || !editData) return;

    // Validate reason is required for closed sessions
    if (belongsToClosedSession && !reason.trim()) {
      alert('⚠️ Debe indicar el motivo del cambio en un pedido de cierre cerrado');
      return;
    }

    // Validar si hay cambios en runas y requiere confirmación
    if (editData.payment_runas !== order.payment_runas && order.customer_id) {
      const deltaRunas = editData.payment_runas - (order.payment_runas || 0);
      const newBalance = saldoRunasCliente - deltaRunas;

      if (newBalance < 0) {
        const confirmed = window.confirm(
          `⚠️ Saldo insuficiente de Runas\n\n` +
          `El cliente quedará con saldo negativo (${newBalance} runas).\n` +
          `Esta operación quedará registrada en la auditoría y aparecerá como alerta en el cierre.\n\n` +
          `¿Deseas continuar?`
        );

        if (!confirmed) return;
      }
    }

    try {
      const updatedOrder = await updateOrder(order.id, editData, reason);
      onOrderUpdated(updatedOrder as Order);
      setIsEditMode(false);
      setEditData(null);
      setReason('');
      setRunasEditadas(0);
      
      // Recargar sesión de caja para actualizar los totales
      await checkActiveSession();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditData(null);
    setReason('');
    setRunasEditadas(0);
  };

  const handleItemUpdate = (index: number, updates: Partial<OrderItem>) => {
    if (!editData) return;
    
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], ...updates };
    setEditData({ ...editData, items: newItems });
  };

  const handleItemRemove = (index: number) => {
    if (!editData) return;
    
    const newItems = editData.items.filter((_, i) => i !== index);
    setEditData({ ...editData, items: newItems });
  };

  const handleAddProduct = (item: OrderItem) => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      items: [...editData.items, item]
    });
    // No cerrar el modal, permitir agregar múltiples productos
  };

  const handleCustomerSearch = async (term: string) => {
    setCustomerSearch(term);
    if (term.length < 2) { 
      setCustomerResults([]); 
      return; 
    }
    const { data } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${term}%,phone.ilike.%${term}%,rut.ilike.%${term}%,apellido.ilike.%${term}%`)
      .limit(5);
    setCustomerResults((data || []) as Customer[]);
  };

  const selectCustomerForOrder = (c: Customer) => {
    setEditData(prev => prev ? { 
      ...prev, 
      customer_id: c.id, 
      nombre_resumen: `${c.name || ''} ${c.apellido || ''}`.trim() 
    } : null);
    setCustomerSearch('');
    setCustomerResults([]);
  };

  const clearCustomer = () => {
    setEditData(prev => prev ? { 
      ...prev, 
      customer_id: undefined, 
      nombre_resumen: '' 
    } : null);
  };

  const handlePaymentUpdate = (field: string, value: number) => {
    if (!editData) return;
    
    setEditData({
      ...editData,
      [field]: value
    });

    // Si se está editando runas, actualizar el estado local
    if (field === 'payment_runas') {
      setRunasEditadas(value);
    }
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalle de Orden #{order.order_number}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="w-4 h-4 mr-2" />
                  Historial
                </Button>
                {!isEditMode ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar pedido
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {isEditMode && (
              <>
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="text-sm text-primary">
                      Modo Edición - Los cambios se aplicarán al guardar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="reason">
                        Motivo del cambio {belongsToClosedSession && <span className="text-destructive">*</span>}
                      </Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Describe el motivo del cambio..."
                        className="resize-none"
                        rows={2}
                      />
                      {belongsToClosedSession && (
                        <p className="text-xs text-muted-foreground">
                          * Campo obligatorio para pedidos en cierres cerrados
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {belongsToClosedSession && (
                  <Alert variant="destructive" className="border-amber-500 bg-amber-50 text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Pedido en Cierre Cerrado</AlertTitle>
                    <AlertDescription>
                      Este pedido pertenece a un cierre de caja realizado el{' '}
                      {sessionInfo?.closed_at && format(new Date(sessionInfo.closed_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}.
                      Los cambios afectarán el resumen del cierre y quedarán registrados en el historial de auditoría.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">N° Orden:</Label>
                    <div className="font-medium">#{order.order_number}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Estado:</Label>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Tipo de Entrega:</Label>
                    {isEditMode ? (
                      <Select
                        value={editData?.fulfillment || order.fulfillment}
                        onValueChange={(value: 'retiro' | 'delivery') => {
                          setEditData(prev => {
                            if (!prev) return null;
                            // If changing to retiro, clear delivery fields
                            if (value === 'retiro') {
                              return {
                                ...prev,
                                fulfillment: value,
                                delivery_fee: 0,
                                delivery_address: '',
                                delivery_number: '',
                                delivery_comuna_id: '',
                                delivery_reference: '',
                                delivery_person_id: null
                              };
                            }
                            return { ...prev, fulfillment: value };
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retiro">Retiro</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="capitalize">{order.fulfillment}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Cliente:</Label>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar cliente por nombre, RUT, teléfono..."
                            value={customerSearch}
                            onChange={(e) => handleCustomerSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        {customerResults.length > 0 && (
                          <div className="border rounded-md p-2 space-y-1 bg-background shadow-md max-h-40 overflow-y-auto">
                            {customerResults.map(c => (
                              <div 
                                key={c.id} 
                                className="p-2 hover:bg-muted cursor-pointer rounded text-sm"
                                onClick={() => selectCustomerForOrder(c)}
                              >
                                <span className="font-medium">{c.name} {c.apellido || ''}</span>
                                {c.phone && <span className="text-muted-foreground ml-2">· {c.phone}</span>}
                                {c.rut && <span className="text-muted-foreground ml-2">· {c.rut}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {editData?.customer_id && (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <User className="w-3 h-3" />
                            {editData.nombre_resumen || 'Cliente seleccionado'}
                            <X 
                              className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive" 
                              onClick={clearCustomer} 
                            />
                          </Badge>
                        )}
                        {!editData?.customer_id && (
                          <Input
                            placeholder="O escribe nombre sin registrar..."
                            value={editData?.nombre_resumen || ''}
                            onChange={(e) => setEditData(prev => prev ? { ...prev, nombre_resumen: e.target.value } : null)}
                          />
                        )}
                      </div>
                    ) : (
                      <div>
                        {order.customer_id ? (
                          (() => {
                            // Try inline customer from join first, then fall back to customers list
                            const inlineCustomer = (order as any).customer;
                            const listedCustomer = customers.find(c => c.id === order.customer_id);
                            const customer = listedCustomer || inlineCustomer;
                            if (customer) {
                              const displayName = customer.nombres 
                                ? `${customer.nombres} ${customer.apellidos || ''}`.trim()
                                : `${customer.name || ''} ${customer.apellido || ''}`.trim();
                              return (
                                <button
                                  className="text-primary hover:underline text-left"
                                  onClick={() => console.log('Ver cliente:', customer.id)}
                                >
                                  {displayName || order.nombre_resumen || 'Cliente'}
                                </button>
                              );
                            }
                            return <span className="text-muted-foreground">{order.nombre_resumen || 'Cargando...'}</span>;
                          })()
                        ) : (
                          <span className="text-muted-foreground">{order.nombre_resumen || 'Sin cliente'}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Pickup Mode - Solo para retiro */}
                  {((isEditMode ? editData?.fulfillment : order.fulfillment) === 'retiro') && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Modalidad de Retiro:</Label>
                      {isEditMode ? (
                        <Select
                          value={editData?.pickup_mode || order.pickup_mode || ''}
                          onValueChange={(value: 'servir' | 'llevar') => 
                            setEditData(prev => prev ? { ...prev, pickup_mode: value } : null)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar modalidad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="servir">
                              <div className="flex items-center gap-2">
                                <UtensilsCrossed className="w-4 h-4" />
                                Para Servir (comer en local)
                              </div>
                            </SelectItem>
                            <SelectItem value="llevar">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4" />
                                Para Llevar (take away)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={order.pickup_mode === 'servir' ? 'default' : 'secondary'}>
                          {order.pickup_mode === 'servir' ? (
                            <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" /> SERVIR</span>
                          ) : order.pickup_mode === 'llevar' ? (
                            <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> LLEVAR</span>
                          ) : 'Sin definir'}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Asignación de Turno */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Turno de Caja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {orderCashSessionId && sessionInfo ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Turno: </span>
                      <span className="font-medium">
                        {format(new Date(sessionInfo.opened_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                      {sessionInfo.closed_at && (
                        <Badge variant="secondary" className="ml-2 text-xs">Cerrado</Badge>
                      )}
                      {!sessionInfo.closed_at && (
                        <Badge className="ml-2 text-xs">Activo</Badge>
                      )}
                    </div>
                    {canManageCashSessions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          loadRecentSessions();
                          setShowSessionSelector(true);
                        }}
                      >
                        <ArrowRightLeft className="w-4 h-4 mr-1" />
                        Cambiar turno
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Sin turno asignado</AlertTitle>
                      <AlertDescription>
                        Este pedido no está asociado a ningún turno de caja.
                      </AlertDescription>
                    </Alert>
                    {canManageCashSessions && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          loadRecentSessions();
                          setShowSessionSelector(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Asignar a turno
                      </Button>
                    )}
                  </div>
                )}

                {showSessionSelector && (
                  <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                    <Label className="text-sm font-medium">Seleccionar turno:</Label>
                    {recentSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay turnos recientes.</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {recentSessions.map(session => (
                          <button
                            key={session.id}
                            disabled={assigningSession || session.id === orderCashSessionId}
                            className="w-full text-left p-2 rounded hover:bg-accent text-sm flex items-center justify-between disabled:opacity-50"
                            onClick={() => handleAssignSession(session.id)}
                          >
                            <div>
                              <span className="font-medium">
                                {format(new Date(session.opened_at), "dd/MM HH:mm", { locale: es })}
                              </span>
                              <span className="text-muted-foreground ml-2">· {session.username}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {!session.closed_at ? (
                                <Badge className="text-xs">Activo</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Cerrado</Badge>
                              )}
                              {session.id === orderCashSessionId && (
                                <Badge variant="outline" className="text-xs">Actual</Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setShowSessionSelector(false)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Information - Show for delivery orders, when editing to delivery, or when delivery data exists */}
            {((isEditMode && editData?.fulfillment === 'delivery') || 
              (!isEditMode && order.fulfillment === 'delivery') ||
              (order.delivery_address && order.delivery_fee && order.delivery_fee > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Información de Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditMode ? (
                    <>
                      {/* Zona de delivery */}
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Zona:</Label>
                        <div className="font-medium">{order.delivery_zone_name || 'N/A'}</div>
                      </div>

                      {/* Dirección editable */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="delivery_address">Calle</Label>
                          <Input
                            id="delivery_address"
                            value={editData?.delivery_address || ''}
                            onChange={(e) => setEditData(prev => prev ? { ...prev, delivery_address: e.target.value } : null)}
                            placeholder="Nombre de la calle"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="delivery_number">Número</Label>
                          <Input
                            id="delivery_number"
                            value={editData?.delivery_number || ''}
                            onChange={(e) => setEditData(prev => prev ? { ...prev, delivery_number: e.target.value } : null)}
                            placeholder="Número"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="delivery_comuna">Comuna</Label>
                        <Select
                          value={editData?.delivery_comuna_id || ''}
                          onValueChange={(value) => setEditData(prev => prev ? { ...prev, delivery_comuna_id: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar comuna" />
                          </SelectTrigger>
                          <SelectContent>
                            {comunas.map(comuna => (
                              <SelectItem key={comuna.id} value={comuna.id}>
                                {comuna.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="delivery_reference">Referencia</Label>
                        <Textarea
                          id="delivery_reference"
                          value={editData?.delivery_reference || ''}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, delivery_reference: e.target.value } : null)}
                          placeholder="Referencias adicionales (depto, block, etc.)"
                          rows={2}
                        />
                      </div>

                      <Separator />

                      {/* Repartidor editable */}
                      <div className="space-y-2">
                        <Label htmlFor="delivery_person" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Repartidor Asignado
                        </Label>
                        <Select
                          value={editData?.delivery_person_id || 'none'}
                          onValueChange={(value) => setEditData(prev => prev ? { ...prev, delivery_person_id: value === 'none' ? null : value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {repartidores.map(rep => (
                              <SelectItem key={rep.id} value={rep.id}>
                                {rep.full_name || rep.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Zona:</Label>
                        <div className="font-medium">{order.delivery_zone_name || 'N/A'}</div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Dirección:</Label>
                        <div className="font-medium">
                          {order.delivery_address && order.delivery_number && order.delivery_comuna
                            ? formatDeliveryAddress(
                                order.delivery_address,
                                order.delivery_number,
                                order.delivery_comuna,
                                order.delivery_reference || undefined
                              )
                            : order.delivery_address || 'N/A'}
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-muted-foreground flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Repartidor Asignado:
                        </Label>
                        <div className="font-medium">
                          {order.delivery_person_name || 'Sin asignar'}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Productos</span>
                  {isEditMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProductSelector(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar producto
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(isEditMode ? editData?.items || [] : (Array.isArray(order.items) ? order.items : [])).map((item: OrderItem, index: number) => (
                    <OrderItemEditRow
                      key={index}
                      item={item}
                      index={index}
                      isEditMode={isEditMode}
                      onUpdate={handleItemUpdate}
                      onRemove={handleItemRemove}
                    />
                  ))}
                </div>

                {/* Order Totals */}
                <div className="border-t mt-6 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(isEditMode ? editData?.subtotal || 0 : order.subtotal)}</span>
                  </div>
                  
                  {/* Delivery Fee */}
                  <div className="flex justify-between items-center">
                    <span>Costo Delivery:</span>
                    {isEditMode ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editData?.delivery_fee || 0}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, delivery_fee: parseInt(e.target.value) || 0 } : null)}
                          className="w-32 text-right"
                          min="0"
                        />
                      </div>
                    ) : (
                      <span>{formatCurrency(order.delivery_fee || 0)}</span>
                    )}
                  </div>

                  {(order.discount > 0 || (isEditMode && editData?.discount && editData.discount > 0)) && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(isEditMode ? editData?.discount || 0 : order.discount)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(isEditMode ? editData?.total || 0 : order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditMode ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method">Método de Pago</Label>
                      <Select
                        value={editData?.payment_method || ''}
                        onValueChange={(value: any) => {
                          setEditData(prev => {
                            if (!prev) return null;
                            
                            // Al cambiar el método de pago, resetear todos los valores de pago
                            const resetPayments = {
                              payment_efectivo: 0,
                              payment_mp: 0,
                              payment_pos: 0,
                              payment_aplicacion: 0,
                              payment_runas: 0
                            };

                            // Si es un método específico (no mixto), configurar solo ese método con el total
                            if (value !== 'mixto') {
                              const fieldName = `payment_${value}` as keyof typeof resetPayments;
                              if (fieldName in resetPayments) {
                                resetPayments[fieldName] = prev.total;
                              }
                            }

                            return { 
                              ...prev, 
                              payment_method: value,
                              ...resetPayments
                            };
                          });
                          
                          // Si cambió a runas, actualizar el estado local
                          if (value === 'runas' && editData?.total) {
                            setRunasEditadas(Math.ceil(editData.total / (valorRunaActual || 1)));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.filter(m => m.is_active).map((method) => {
                            const Icon = getIconComponent(method.icon);
                            return (
                              <SelectItem key={method.id} value={method.name}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {method.display_name}
                                </div>
                              </SelectItem>
                            );
                          })}
                          <SelectItem value="mixto">
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4" />
                              Mixto
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editData?.payment_method === 'mixto' && (
                      <div className="grid grid-cols-2 gap-4">
                        {paymentMethods.filter(m => m.is_active).map((method) => {
                          const Icon = getIconComponent(method.icon);
                          const fieldName = `payment_${method.name}` as keyof OrderEditData;
                          const currentValue = editData[fieldName] as number || 0;
                          
                          return (
                            <div key={method.id} className="space-y-2">
                              <Label htmlFor={method.name} className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {method.display_name}
                              </Label>
                              <Input
                                id={method.name}
                                type="number"
                                value={currentValue}
                                onChange={(e) => handlePaymentUpdate(fieldName, parseInt(e.target.value) || 0)}
                                min="0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Campo especial para editar runas cuando es método único */}
                    {editData?.payment_method === 'runas' && order?.customer_id && (
                      <div className="space-y-4 p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Saldo disponible:</span>
                          <span className="font-semibold text-primary">{saldoRunasCliente} runas</span>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="runas_cantidad" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Cantidad de Runas
                          </Label>
                          <Input
                            id="runas_cantidad"
                            type="number"
                            value={editData.payment_runas || runasEditadas}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setRunasEditadas(value);
                              setEditData(prev => prev ? { ...prev, payment_runas: value } : null);
                            }}
                            min="0"
                            className="font-medium"
                          />
                        </div>

                        <div className="flex justify-between text-sm border-t pt-2">
                          <span>Valor equivalente:</span>
                          <span className="font-semibold">{formatCurrency((editData.payment_runas || runasEditadas) * valorRunaActual)}</span>
                        </div>

                        {(editData.payment_runas || runasEditadas) > saldoRunasCliente && (
                          <Alert variant="destructive" className="py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              El cliente no tiene suficientes runas. El saldo quedará negativo.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Método:</span>
                      <span className="capitalize">{order.payment_method}</span>
                    </div>
                    {paymentMethods.map((method) => {
                      const fieldName = `payment_${method.name}` as keyof Order;
                      const amount = order[fieldName] as number || 0;
                      
                      if (amount > 0) {
                        const Icon = getIconComponent(method.icon);
                        
                        // Mostrar formato especial para runas
                        if (method.name === 'runas') {
                          return (
                            <div key={method.id} className="flex justify-between items-center">
                              <span className="text-muted-foreground flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {method.display_name}:
                              </span>
                              <span className="font-medium">{Math.ceil(amount / (valorRunaCanje || 600))} runas ({formatCurrency(amount)})</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div key={method.id} className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {method.display_name}:
                            </span>
                            <span>{formatCurrency(amount)}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Agregar Producto</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <ProductGrid
              products={availableProducts}
              onProductClick={(product) => {
                setSelectedProduct(product);
                setShowCustomizationModal(true);
              }}
              onDataPreloaded={setPreloadedData}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {selectedProduct && (
        <ProductCustomizationModalEnhanced
          isOpen={showCustomizationModal}
          onClose={() => {
            setShowCustomizationModal(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onAddToCart={(item) => {
            handleAddProduct({
              ...item,
              productId: selectedProduct.id,
              productName: selectedProduct.name,
            });
            setShowCustomizationModal(false);
            setSelectedProduct(null);
          }}
          preloadedVariants={preloadedData.variants[selectedProduct.id] || []}
          preloadedExtras={preloadedData.extras.filter((e: any) => 
            (selectedProduct as any).product_categories?.some((pc: any) => pc.categories?.id === e.category_id)
          )}
          preloadedModifiers={preloadedData.modifiers.filter((m: any) => 
            m.product_id === selectedProduct.id
          )}
          preloadedComboData={preloadedData.combos[selectedProduct.id]}
        />
      )}

      <OrderHistoryModal
        orderId={order.id}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </>
  );
}