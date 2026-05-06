import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, Tag, BarChart3, Download, Users, MoreVertical } from 'lucide-react';
import { useCoupons } from '@/hooks/useCoupons';
import { useCouponStats, CouponApplicationDetail } from '@/hooks/useCouponStats';
import { useCustomerTags } from '@/hooks/useCustomerTags';
import { Coupon, CouponType, Category, DeliveryMode } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CouponTimeWindowEditor } from '@/components/coupons/CouponTimeWindowEditor';

export default function CouponsManagement() {
  const { user } = useAuthContext();
  const { coupons, loading, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus } = useCoupons();
  const { statsMap, loadingStats, fetchAllStats, fetchCouponDetail } = useCouponStats();
  const { tags: customerTags } = useCustomerTags();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    type: 'percent',
    amount: 0,
    description: '',
    is_active: true,
    affects_products: true,
    affects_delivery: false,
    delivery_mode: undefined,
    delivery_amount: undefined,
    allow_stack: false,
    apply_to_discounted: true,
    apply_to_combo_children: true,
    allow_manual_line_selection: false,
    commission_enabled: false,
    commission_type: undefined,
    commission_value: undefined,
    commission_contact: '',
  });

  // Report state
  const [reportCoupon, setReportCoupon] = useState<Coupon | null>(null);
  const [reportDetails, setReportDetails] = useState<CouponApplicationDetail[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Scope states
  const [scopeMode, setScopeMode] = useState<'all' | 'categories' | 'products'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAllowedCategories, setSelectedAllowedCategories] = useState<string[]>([]);
  const [selectedExcludedCategories, setSelectedExcludedCategories] = useState<string[]>([]);
  const [selectedAllowedProducts, setSelectedAllowedProducts] = useState<string[]>([]);
  const [selectedExcludedProducts, setSelectedExcludedProducts] = useState<string[]>([]);

  // Fetch stats when coupons load
  useEffect(() => {
    if (coupons.length > 0) {
      fetchAllStats(coupons.map(c => c.id));
    }
  }, [coupons, fetchAllStats]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchCategoriesAndProducts();
    }
  }, [isDialogOpen]);

  const fetchCategoriesAndProducts = async () => {
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name');
    setCategories(categoriesData || []);

    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, category')
      .eq('active', true)
      .order('name');
    setProducts(productsData || []);
  };

  const resetForm = () => {
    setFormData({
      code: '', type: 'percent', amount: 0, description: '', is_active: true,
      affects_products: true, affects_delivery: false, delivery_mode: undefined, delivery_amount: undefined,
      allow_stack: false, apply_to_discounted: true, apply_to_combo_children: true,
      allow_manual_line_selection: false,
      commission_enabled: false, commission_type: undefined, commission_value: undefined, commission_contact: '',
    });
    setEditingCoupon(null);
    setScopeMode('all');
    setSelectedAllowedCategories([]);
    setSelectedExcludedCategories([]);
    setSelectedAllowedProducts([]);
    setSelectedExcludedProducts([]);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData(coupon);
    if (coupon.allowed_categories?.length || coupon.excluded_categories?.length) {
      setScopeMode('categories');
      setSelectedAllowedCategories(coupon.allowed_categories || []);
      setSelectedExcludedCategories(coupon.excluded_categories || []);
    } else if (coupon.allowed_products?.length || coupon.excluded_products?.length) {
      setScopeMode('products');
      setSelectedAllowedProducts(coupon.allowed_products || []);
      setSelectedExcludedProducts(coupon.excluded_products || []);
    } else {
      setScopeMode('all');
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cupón?')) {
      await deleteCoupon(id);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleCouponStatus(id, !currentStatus);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.code || !formData.type || formData.amount === undefined) {
        toast({ title: 'Error', description: 'Completa los campos obligatorios', variant: 'destructive' });
        return;
      }

      const couponData: Partial<Coupon> = { ...formData, created_by: user?.id };

      if (scopeMode === 'categories') {
        couponData.allowed_categories = selectedAllowedCategories;
        couponData.excluded_categories = selectedExcludedCategories;
        couponData.allowed_products = [];
        couponData.excluded_products = [];
      } else if (scopeMode === 'products') {
        couponData.allowed_products = selectedAllowedProducts;
        couponData.excluded_products = selectedExcludedProducts;
        couponData.allowed_categories = [];
        couponData.excluded_categories = [];
      } else {
        couponData.allowed_categories = [];
        couponData.excluded_categories = [];
        couponData.allowed_products = [];
        couponData.excluded_products = [];
      }

      // Clean delivery fields
      if (!couponData.affects_delivery) {
        couponData.delivery_mode = undefined;
        couponData.delivery_amount = undefined;
      }

      // Clean commission fields
      if (!couponData.commission_enabled) {
        couponData.commission_type = undefined;
        couponData.commission_value = undefined;
        couponData.commission_contact = '';
      }

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData);
      } else {
        await createCoupon(couponData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // toast already shown in hook
    }
  };

  const handleOpenReport = async (coupon: Coupon) => {
    setReportCoupon(coupon);
    setReportLoading(true);
    try {
      const details = await fetchCouponDetail(coupon.id);
      // Add commission calculation
      const detailsWithCommission = details.map(d => ({
        ...d,
        commission: coupon.commission_enabled
          ? coupon.commission_type === 'percentage'
            ? Math.round((d.order_total * (coupon.commission_value || 0)) / 100)
            : (coupon.commission_value || 0)
          : 0,
      }));
      setReportDetails(detailsWithCommission);
    } finally {
      setReportLoading(false);
    }
  };

  const exportReportCSV = () => {
    if (!reportCoupon || reportDetails.length === 0) return;
    const header = 'Fecha,Orden,Cliente,Total Venta,Descuento,Comisión\n';
    const rows = reportDetails.map(d =>
      `${format(new Date(d.applied_at), 'dd/MM/yyyy HH:mm')},#${d.order_number || ''},${d.customer_name || 'Sin cliente'},${d.order_total},${d.total_discount},${d.commission || 0}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_cupon_${reportCoupon.code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);

  const getTypeLabel = (type: CouponType) => {
    const labels = { percent: 'Porcentaje', fixed_cart: 'Monto Fijo (Carrito)', fixed_product: 'Monto Fijo (Producto)' };
    return labels[type] || type;
  };

  const reportStats = reportCoupon && statsMap[reportCoupon.id];
  const reportTotalCommission = reportDetails.reduce((sum, d) => sum + (d.commission || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cupones de Descuento</h2>
          <p className="text-muted-foreground">Gestiona los cupones disponibles para clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cupón
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Editar Cupón' : 'Crear Nuevo Cupón'}</DialogTitle>
              <DialogDescription>Configura los detalles del cupón de descuento</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="conditions">Condiciones</TabsTrigger>
                <TabsTrigger value="rules">Reglas</TabsTrigger>
                <TabsTrigger value="commission">Comisión</TabsTrigger>
              </TabsList>

              {/* TAB: Básico */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código del Cupón *</Label>
                    <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="VERANO2024" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Descuento *</Label>
                    <Select value={formData.type} onValueChange={(value: CouponType) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed_cart">Monto Fijo (Carrito)</SelectItem>
                        <SelectItem value="fixed_product">Monto Fijo (Por Producto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{formData.type === 'percent' ? 'Porcentaje de Descuento' : 'Monto de Descuento (CLP)'} *</Label>
                  <Input id="amount" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} placeholder={formData.type === 'percent' ? '10' : '5000'} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe el cupón para uso interno" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label htmlFor="is_active">Cupón Activo</Label>
                </div>
              </TabsContent>

              {/* TAB: Condiciones */}
              <TabsContent value="conditions" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input type="datetime-local" value={formData.date_start ? new Date(formData.date_start).toISOString().slice(0, 16) : ''} onChange={(e) => setFormData({ ...formData, date_start: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input type="datetime-local" value={formData.date_end ? new Date(formData.date_end).toISOString().slice(0, 16) : ''} onChange={(e) => setFormData({ ...formData, date_end: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Compra Mínima (CLP)</Label>
                    <Input type="number" value={formData.min_spend || ''} onChange={(e) => setFormData({ ...formData, min_spend: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Compra Máxima (CLP)</Label>
                    <Input type="number" value={formData.max_spend || ''} onChange={(e) => setFormData({ ...formData, max_spend: e.target.value ? Number(e.target.value) : undefined })} placeholder="Sin límite" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Usos Totales</Label>
                    <Input type="number" value={formData.usage_limit_total || ''} onChange={(e) => setFormData({ ...formData, usage_limit_total: e.target.value ? Number(e.target.value) : undefined })} placeholder="Ilimitado" />
                  </div>
                  <div className="space-y-2">
                    <Label>Usos por Cliente</Label>
                    <Input type="number" value={formData.usage_limit_per_customer || ''} onChange={(e) => setFormData({ ...formData, usage_limit_per_customer: e.target.value ? Number(e.target.value) : undefined })} placeholder="Ilimitado" />
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Reglas */}
              <TabsContent value="rules" className="space-y-4">
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <Switch id="affects_products" checked={formData.affects_products} onCheckedChange={(checked) => setFormData({ ...formData, affects_products: checked })} />
                    <Label htmlFor="affects_products">Aplica a Productos</Label>
                  </div>

                  {formData.affects_products && (
                    <Card className="border-2 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-base">Alcance de Productos</CardTitle>
                        <CardDescription>Define qué productos son elegibles para este cupón</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <RadioGroup value={scopeMode} onValueChange={(value: 'all' | 'categories' | 'products') => setScopeMode(value)}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="scope-all" />
                            <Label htmlFor="scope-all" className="font-normal cursor-pointer">Todos los productos</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="categories" id="scope-categories" />
                            <Label htmlFor="scope-categories" className="font-normal cursor-pointer">Categorías específicas</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="products" id="scope-products" />
                            <Label htmlFor="scope-products" className="font-normal cursor-pointer">Productos específicos</Label>
                          </div>
                        </RadioGroup>

                        {scopeMode === 'categories' && (
                          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Incluir Categorías</Label>
                              <ScrollArea className="h-[150px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center space-x-2">
                                      <Checkbox id={`allow-cat-${cat.id}`} checked={selectedAllowedCategories.includes(cat.id)} onCheckedChange={(checked) => {
                                        if (checked) { setSelectedAllowedCategories([...selectedAllowedCategories, cat.id]); setSelectedExcludedCategories(selectedExcludedCategories.filter(id => id !== cat.id)); }
                                        else { setSelectedAllowedCategories(selectedAllowedCategories.filter(id => id !== cat.id)); }
                                      }} />
                                      <Label htmlFor={`allow-cat-${cat.id}`} className="font-normal cursor-pointer">{cat.name}</Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Excluir Categorías</Label>
                              <ScrollArea className="h-[150px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center space-x-2">
                                      <Checkbox id={`exclude-cat-${cat.id}`} checked={selectedExcludedCategories.includes(cat.id)} onCheckedChange={(checked) => {
                                        if (checked) { setSelectedExcludedCategories([...selectedExcludedCategories, cat.id]); setSelectedAllowedCategories(selectedAllowedCategories.filter(id => id !== cat.id)); }
                                        else { setSelectedExcludedCategories(selectedExcludedCategories.filter(id => id !== cat.id)); }
                                      }} />
                                      <Label htmlFor={`exclude-cat-${cat.id}`} className="font-normal cursor-pointer">{cat.name}</Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}

                        {scopeMode === 'products' && (
                          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Incluir Productos</Label>
                              <ScrollArea className="h-[200px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {products.map(prod => (
                                    <div key={prod.id} className="flex items-center space-x-2">
                                      <Checkbox id={`allow-prod-${prod.id}`} checked={selectedAllowedProducts.includes(prod.id)} onCheckedChange={(checked) => {
                                        if (checked) { setSelectedAllowedProducts([...selectedAllowedProducts, prod.id]); setSelectedExcludedProducts(selectedExcludedProducts.filter(id => id !== prod.id)); }
                                        else { setSelectedAllowedProducts(selectedAllowedProducts.filter(id => id !== prod.id)); }
                                      }} />
                                      <Label htmlFor={`allow-prod-${prod.id}`} className="font-normal cursor-pointer">{prod.name}</Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Excluir Productos</Label>
                              <ScrollArea className="h-[200px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {products.map(prod => (
                                    <div key={prod.id} className="flex items-center space-x-2">
                                      <Checkbox id={`exclude-prod-${prod.id}`} checked={selectedExcludedProducts.includes(prod.id)} onCheckedChange={(checked) => {
                                        if (checked) { setSelectedExcludedProducts([...selectedExcludedProducts, prod.id]); setSelectedAllowedProducts(selectedAllowedProducts.filter(id => id !== prod.id)); }
                                        else { setSelectedExcludedProducts(selectedExcludedProducts.filter(id => id !== prod.id)); }
                                      }} />
                                      <Label htmlFor={`exclude-prod-${prod.id}`} className="font-normal cursor-pointer">{prod.name}</Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Delivery Section */}
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch id="affects_delivery" checked={formData.affects_delivery} onCheckedChange={(checked) => setFormData({ ...formData, affects_delivery: checked, delivery_mode: checked ? 'free' : undefined, delivery_amount: undefined })} />
                      <Label htmlFor="affects_delivery">Aplica Descuento al Delivery</Label>
                    </div>
                    {formData.affects_delivery && (
                      <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                        <Label className="text-sm font-medium">Modo de descuento en delivery</Label>
                        <Select value={formData.delivery_mode || 'free'} onValueChange={(v: DeliveryMode) => setFormData({ ...formData, delivery_mode: v, delivery_amount: v === 'free' ? undefined : (formData.delivery_amount || 0) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Delivery Gratis ($0)</SelectItem>
                            <SelectItem value="fixed">Descuento Monto Fijo (CLP)</SelectItem>
                            <SelectItem value="percent">Descuento Porcentaje (%)</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.delivery_mode && formData.delivery_mode !== 'free' && (
                          <div className="space-y-2">
                            <Label>{formData.delivery_mode === 'fixed' ? 'Monto a descontar (CLP)' : 'Porcentaje a descontar (%)'}</Label>
                            <Input type="number" value={formData.delivery_amount || ''} onChange={(e) => setFormData({ ...formData, delivery_amount: Number(e.target.value) })} placeholder={formData.delivery_mode === 'fixed' ? '2000' : '50'} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Switch id="allow_stack" checked={formData.allow_stack} onCheckedChange={(checked) => setFormData({ ...formData, allow_stack: checked })} />
                    <Label htmlFor="allow_stack">Permitir Acumular con Otros Cupones</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="apply_to_discounted" checked={formData.apply_to_discounted} onCheckedChange={(checked) => setFormData({ ...formData, apply_to_discounted: checked })} />
                    <Label htmlFor="apply_to_discounted">Aplica a Productos en Descuento</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="apply_to_combo_children" checked={formData.apply_to_combo_children} onCheckedChange={(checked) => setFormData({ ...formData, apply_to_combo_children: checked })} />
                    <Label htmlFor="apply_to_combo_children">Aplica a Items de Combos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="allow_manual_line_selection" checked={formData.allow_manual_line_selection} onCheckedChange={(checked) => setFormData({ ...formData, allow_manual_line_selection: checked })} />
                    <Label htmlFor="allow_manual_line_selection">Permitir Selección Manual de Productos</Label>
                  </div>
                </div>
              </TabsContent>

              {/* TAB: Comisión */}
              <TabsContent value="commission" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="commission_enabled" checked={formData.commission_enabled || false} onCheckedChange={(checked) => setFormData({ ...formData, commission_enabled: checked, commission_type: checked ? 'percentage' : undefined })} />
                    <Label htmlFor="commission_enabled">Habilitar Comisión (Influencer)</Label>
                  </div>
                  {formData.commission_enabled && (
                    <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                      <div className="space-y-2">
                        <Label>Nombre del Influencer / Contacto</Label>
                        <Input value={formData.commission_contact || ''} onChange={(e) => setFormData({ ...formData, commission_contact: e.target.value })} placeholder="Nombre del influencer" />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Comisión</Label>
                        <Select value={formData.commission_type || 'percentage'} onValueChange={(v: 'percentage' | 'fixed') => setFormData({ ...formData, commission_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Porcentaje de la venta (%)</SelectItem>
                            <SelectItem value="fixed">Monto Fijo por uso (CLP)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{formData.commission_type === 'percentage' ? 'Porcentaje de Comisión (%)' : 'Monto de Comisión (CLP)'}</Label>
                        <Input type="number" value={formData.commission_value || ''} onChange={(e) => setFormData({ ...formData, commission_value: Number(e.target.value) })} placeholder={formData.commission_type === 'percentage' ? '5' : '1000'} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.commission_type === 'percentage'
                          ? `El influencer gana ${formData.commission_value || 0}% del total de cada venta con este cupón.`
                          : `El influencer gana ${formatPrice(formData.commission_value || 0)} por cada uso del cupón.`}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSubmit}>{editingCoupon ? 'Actualizar' : 'Crear'} Cupón</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Cupones Disponibles
          </CardTitle>
          <CardDescription>Lista de todos los cupones de descuento configurados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Cargando cupones...</p>
          ) : coupons.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay cupones creados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead className="text-center">Usos</TableHead>
                  <TableHead className="text-right">Desc. Total</TableHead>
                  <TableHead className="text-right">Ventas c/Cupón</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const stats = statsMap[coupon.id];
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-medium">
                        <div>
                          {coupon.code}
                          {coupon.commission_enabled && (
                            <Badge variant="outline" className="ml-2 text-xs"><Users className="w-3 h-3 mr-1" />{coupon.commission_contact || 'Influencer'}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeLabel(coupon.type)}</TableCell>
                      <TableCell>
                        {coupon.type === 'percent' ? `${coupon.amount}%` : formatPrice(Number(coupon.amount))}
                        {coupon.affects_delivery && coupon.delivery_mode && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {coupon.delivery_mode === 'free' ? 'Delivery Gratis' : coupon.delivery_mode === 'fixed' ? `Del. -${formatPrice(coupon.delivery_amount || 0)}` : `Del. -${coupon.delivery_amount}%`}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {stats?.total_used || 0}
                        {coupon.usage_limit_total ? ` / ${coupon.usage_limit_total}` : ''}
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(stats?.total_discounted || 0)}</TableCell>
                      <TableCell className="text-right">{formatPrice(stats?.total_sales || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                          {coupon.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover z-50">
                            <DropdownMenuItem onClick={() => handleOpenReport(coupon)}>
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Ver Informe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(coupon)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}>
                              {coupon.is_active ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(coupon.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Dialog */}
      <Dialog open={!!reportCoupon} onOpenChange={(open) => { if (!open) setReportCoupon(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Informe del Cupón: {reportCoupon?.code}
            </DialogTitle>
            <DialogDescription>{reportCoupon?.description || 'Sin descripción'}</DialogDescription>
          </DialogHeader>

          {reportLoading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando informe...</p>
          ) : (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold">{reportStats?.total_used || 0}</p>
                    <p className="text-xs text-muted-foreground">Usos Totales</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold">{formatPrice(reportStats?.total_discounted || 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Descontado</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-2xl font-bold">{formatPrice(reportStats?.total_sales || 0)}</p>
                    <p className="text-xs text-muted-foreground">Ventas Generadas</p>
                  </CardContent>
                </Card>
                {reportCoupon?.commission_enabled && (
                  <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-2xl font-bold">{formatPrice(reportTotalCommission)}</p>
                      <p className="text-xs text-muted-foreground">Comisión Acumulada</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Export Button */}
              {reportDetails.length > 0 && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={exportReportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              )}

              {/* Detail Table */}
              {reportDetails.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">Este cupón aún no ha sido utilizado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Orden</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Total Venta</TableHead>
                      <TableHead className="text-right">Descuento</TableHead>
                      {reportCoupon?.commission_enabled && <TableHead className="text-right">Comisión</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportDetails.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell className="text-sm">{format(new Date(detail.applied_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-medium">#{detail.order_number || '—'}</TableCell>
                        <TableCell>{detail.customer_name || 'Sin cliente'}</TableCell>
                        <TableCell className="text-right">{formatPrice(detail.order_total)}</TableCell>
                        <TableCell className="text-right">{formatPrice(detail.total_discount)}</TableCell>
                        {reportCoupon?.commission_enabled && <TableCell className="text-right">{formatPrice(detail.commission || 0)}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
