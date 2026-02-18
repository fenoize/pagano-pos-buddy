import { useState, useEffect } from 'react';
import { Percent, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDiscountSubscription } from '@/hooks/useDiscountSubscription';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  customerId: string;
}

interface FormData {
  percent: number;
  notes: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  minSpend: string;
  maxSpend: string;
  affectsDelivery: boolean;
  deliveryMode: string;
  deliveryAmount: string;
  applyToDiscounted: boolean;
  applyToComboChildren: boolean;
  scopeMode: 'all' | 'categories' | 'products';
  allowedCategories: string[];
  excludedCategories: string[];
  allowedProducts: string[];
  excludedProducts: string[];
}

const defaultForm: FormData = {
  percent: 10,
  notes: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  usageLimit: '',
  minSpend: '',
  maxSpend: '',
  affectsDelivery: false,
  deliveryMode: '',
  deliveryAmount: '',
  applyToDiscounted: true,
  applyToComboChildren: true,
  scopeMode: 'all',
  allowedCategories: [],
  excludedCategories: [],
  allowedProducts: [],
  excludedProducts: [],
};

export default function CustomerDiscountSubscription({ customerId }: Props) {
  const {
    subscription,
    loading,
    createSubscription,
    updateSubscription,
    deleteSubscription
  } = useDiscountSubscription(customerId);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ...defaultForm });

  // Categories & Products for scope selector
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);

  const fetchCategoriesAndProducts = async () => {
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('id, name').eq('active', true).order('name'),
      supabase.from('products').select('id, name').eq('active', true).order('name'),
    ]);
    setCategories(catRes.data || []);
    setProducts(prodRes.data || []);
  };

  useEffect(() => {
    if (isCreateModalOpen || isEditModalOpen) {
      fetchCategoriesAndProducts();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  const buildCreateData = () => ({
    discountPercent: formData.percent,
    notes: formData.notes,
    startDate: formData.startDate || null,
    endDate: formData.endDate || null,
    usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
    minSpend: formData.minSpend ? parseInt(formData.minSpend) : null,
    maxSpend: formData.maxSpend ? parseInt(formData.maxSpend) : null,
    affectsDelivery: formData.affectsDelivery,
    deliveryMode: formData.affectsDelivery ? formData.deliveryMode || null : null,
    deliveryAmount: formData.affectsDelivery && formData.deliveryAmount ? parseFloat(formData.deliveryAmount) : null,
    applyToDiscounted: formData.applyToDiscounted,
    applyToComboChildren: formData.applyToComboChildren,
    scopeMode: formData.scopeMode,
    allowedCategories: formData.scopeMode === 'categories' ? formData.allowedCategories : [],
    excludedCategories: formData.scopeMode === 'categories' ? formData.excludedCategories : [],
    allowedProducts: formData.scopeMode === 'products' ? formData.allowedProducts : [],
    excludedProducts: formData.scopeMode === 'products' ? formData.excludedProducts : [],
  });

  const handleCreate = async () => {
    const success = await createSubscription(buildCreateData());
    if (success) {
      setIsCreateModalOpen(false);
      setFormData({ ...defaultForm });
    }
  };

  const handleOpenEdit = () => {
    if (!subscription) return;
    setFormData({
      percent: subscription.discount_percent,
      notes: subscription.notes || '',
      startDate: subscription.start_date || '',
      endDate: subscription.end_date || '',
      usageLimit: subscription.usage_limit !== null ? String(subscription.usage_limit) : '',
      minSpend: subscription.min_spend !== null ? String(subscription.min_spend) : '',
      maxSpend: subscription.max_spend !== null ? String(subscription.max_spend) : '',
      affectsDelivery: subscription.affects_delivery,
      deliveryMode: subscription.delivery_mode || '',
      deliveryAmount: subscription.delivery_amount !== null ? String(subscription.delivery_amount) : '',
      applyToDiscounted: subscription.apply_to_discounted,
      applyToComboChildren: subscription.apply_to_combo_children,
      scopeMode: (subscription.scope_mode as 'all' | 'categories' | 'products') || 'all',
      allowedCategories: subscription.allowed_categories || [],
      excludedCategories: subscription.excluded_categories || [],
      allowedProducts: subscription.allowed_products || [],
      excludedProducts: subscription.excluded_products || [],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!subscription) return;
    const d = buildCreateData();
    const success = await updateSubscription(subscription.id, {
      discount_percent: d.discountPercent,
      notes: d.notes || null,
      start_date: d.startDate,
      end_date: d.endDate,
      usage_limit: d.usageLimit,
      min_spend: d.minSpend,
      max_spend: d.maxSpend,
      affects_delivery: d.affectsDelivery,
      delivery_mode: d.deliveryMode,
      delivery_amount: d.deliveryAmount,
      apply_to_discounted: d.applyToDiscounted,
      apply_to_combo_children: d.applyToComboChildren,
      scope_mode: d.scopeMode,
      allowed_categories: d.allowedCategories,
      excluded_categories: d.excludedCategories,
      allowed_products: d.allowedProducts,
      excluded_products: d.excludedProducts,
    });
    if (success) setIsEditModalOpen(false);
  };

  const handleToggle = async () => {
    if (!subscription) return;
    await updateSubscription(subscription.id, { is_active: !subscription.is_active });
  };

  const handleDelete = async () => {
    if (!subscription) return;
    if (confirm('¿Estás seguro de eliminar esta suscripción de descuento?')) {
      await deleteSubscription(subscription.id);
    }
  };

  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic">Básico</TabsTrigger>
        <TabsTrigger value="conditions">Condiciones</TabsTrigger>
        <TabsTrigger value="rules">Reglas</TabsTrigger>
      </TabsList>

      {/* TAB: Básico */}
      <TabsContent value="basic" className="space-y-4">
        <div className="space-y-2">
          <Label>Porcentaje de Descuento (%)</Label>
          <Input
            type="number" min="1" max="100"
            value={formData.percent}
            onChange={(e) => setFormData({ ...formData, percent: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
          />
          <p className="text-xs text-muted-foreground">
            Se aplicará automáticamente en cada compra del cliente
          </p>
        </div>
        <div className="space-y-2">
          <Label>Notas (opcional)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ej: Descuento empleado, Cliente VIP..."
            rows={2}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="apply_discounted"
            checked={formData.applyToDiscounted}
            onCheckedChange={(c) => setFormData({ ...formData, applyToDiscounted: c })}
          />
          <Label htmlFor="apply_discounted">Aplicar sobre ítems ya con descuento</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="apply_combo"
            checked={formData.applyToComboChildren}
            onCheckedChange={(c) => setFormData({ ...formData, applyToComboChildren: c })}
          />
          <Label htmlFor="apply_combo">Aplicar a ítems hijos de combos</Label>
        </div>
      </TabsContent>

      {/* TAB: Condiciones */}
      <TabsContent value="conditions" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha de Inicio</Label>
            <Input
              type="date" value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha de Término (opcional)</Label>
            <Input
              type="date" value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate}
            />
            <p className="text-xs text-muted-foreground">Vacío = sin término</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cantidad de Usos (opcional)</Label>
            <Input
              type="number" min="1"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
              placeholder="Ilimitado"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Compra Mínima (CLP)</Label>
            <Input
              type="number" min="0"
              value={formData.minSpend}
              onChange={(e) => setFormData({ ...formData, minSpend: e.target.value })}
              placeholder="Sin mínimo"
            />
          </div>
          <div className="space-y-2">
            <Label>Compra Máxima (CLP)</Label>
            <Input
              type="number" min="0"
              value={formData.maxSpend}
              onChange={(e) => setFormData({ ...formData, maxSpend: e.target.value })}
              placeholder="Sin límite"
            />
          </div>
        </div>

        {/* Delivery */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              id="affects_delivery"
              checked={formData.affectsDelivery}
              onCheckedChange={(c) => setFormData({ ...formData, affectsDelivery: c })}
            />
            <Label htmlFor="affects_delivery">Aplica a Delivery</Label>
          </div>
          {formData.affectsDelivery && (
            <div className="space-y-3 pl-4">
              <Select value={formData.deliveryMode} onValueChange={(v) => setFormData({ ...formData, deliveryMode: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar modo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Delivery Gratis</SelectItem>
                  <SelectItem value="fixed">Descuento Fijo</SelectItem>
                  <SelectItem value="percent">Descuento Porcentual</SelectItem>
                </SelectContent>
              </Select>
              {(formData.deliveryMode === 'fixed' || formData.deliveryMode === 'percent') && (
                <Input
                  type="number" min="0"
                  value={formData.deliveryAmount}
                  onChange={(e) => setFormData({ ...formData, deliveryAmount: e.target.value })}
                  placeholder={formData.deliveryMode === 'percent' ? 'Porcentaje (ej: 50)' : 'Monto CLP'}
                />
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* TAB: Reglas (Alcance) */}
      <TabsContent value="rules" className="space-y-4">
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alcance de Productos</CardTitle>
            <CardDescription>Define qué productos son elegibles para este descuento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={formData.scopeMode}
              onValueChange={(v: 'all' | 'categories' | 'products') => setFormData({ ...formData, scopeMode: v })}
            >
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

            {formData.scopeMode === 'categories' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Incluir Categorías</Label>
                  <ScrollArea className="h-[120px] border rounded-md p-3">
                    <div className="space-y-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.allowedCategories.includes(cat.id)}
                            onCheckedChange={() => setFormData({ ...formData, allowedCategories: toggleArrayItem(formData.allowedCategories, cat.id) })}
                          />
                          <span className="text-sm">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">Vacío = todas las categorías</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Excluir Categorías</Label>
                  <ScrollArea className="h-[120px] border rounded-md p-3">
                    <div className="space-y-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.excludedCategories.includes(cat.id)}
                            onCheckedChange={() => setFormData({ ...formData, excludedCategories: toggleArrayItem(formData.excludedCategories, cat.id) })}
                          />
                          <span className="text-sm">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {formData.scopeMode === 'products' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Incluir Productos</Label>
                  <ScrollArea className="h-[120px] border rounded-md p-3">
                    <div className="space-y-2">
                      {products.map(prod => (
                        <div key={prod.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.allowedProducts.includes(prod.id)}
                            onCheckedChange={() => setFormData({ ...formData, allowedProducts: toggleArrayItem(formData.allowedProducts, prod.id) })}
                          />
                          <span className="text-sm">{prod.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">Vacío = todos los productos</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Excluir Productos</Label>
                  <ScrollArea className="h-[120px] border rounded-md p-3">
                    <div className="space-y-2">
                      {products.map(prod => (
                        <div key={prod.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={formData.excludedProducts.includes(prod.id)}
                            onCheckedChange={() => setFormData({ ...formData, excludedProducts: toggleArrayItem(formData.excludedProducts, prod.id) })}
                          />
                          <span className="text-sm">{prod.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={loading || formData.percent < 1 || formData.percent > 100}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </Tabs>
  );

  const scopeLabel = subscription?.scope_mode === 'categories'
    ? `${(subscription.allowed_categories?.length || 0)} cat. incluidas`
    : subscription?.scope_mode === 'products'
    ? `${(subscription.allowed_products?.length || 0)} prod. incluidos`
    : 'Todos los productos';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Descuento Permanente
          </h3>
          <p className="text-sm text-muted-foreground">
            Descuento automático en todas las compras
          </p>
        </div>
        {!subscription && (
          <Button onClick={() => { setFormData({ ...defaultForm }); setIsCreateModalOpen(true); }} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Crear Descuento
          </Button>
        )}
      </div>

      {subscription ? (
        <Card className={!subscription.is_active ? 'opacity-60' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold text-primary">{subscription.discount_percent}%</span>
                    <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                      {subscription.is_active ? 'Activo' : 'Pausado'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{scopeLabel}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {subscription.start_date && (
                      <div>
                        Desde: {format(new Date(subscription.start_date), 'dd/MM/yyyy', { locale: es })}
                        {subscription.end_date ? (
                          <span className="ml-2">· Hasta: {format(new Date(subscription.end_date), 'dd/MM/yyyy', { locale: es })}</span>
                        ) : (
                          <span className="ml-2 text-emerald-600">· Sin fecha de término</span>
                        )}
                      </div>
                    )}
                    <div>
                      {subscription.usage_limit !== null ? (
                        <span>
                          Usos: <span className={subscription.usage_count >= subscription.usage_limit ? 'text-destructive font-semibold' : 'font-semibold'}>{subscription.usage_count}/{subscription.usage_limit}</span>
                          {subscription.usage_count >= subscription.usage_limit && ' (agotado)'}
                        </span>
                      ) : (
                        <span>Usos: {subscription.usage_count} (ilimitado)</span>
                      )}
                    </div>
                    {(subscription.min_spend || subscription.max_spend) && (
                      <div>
                        {subscription.min_spend && <span>Mín: ${subscription.min_spend.toLocaleString('es-CL')}</span>}
                        {subscription.min_spend && subscription.max_spend && <span className="mx-1">·</span>}
                        {subscription.max_spend && <span>Máx: ${subscription.max_spend.toLocaleString('es-CL')}</span>}
                      </div>
                    )}
                    {subscription.affects_delivery && (
                      <div className="text-blue-600">
                        Delivery: {subscription.delivery_mode === 'free' ? 'Gratis' : subscription.delivery_mode === 'fixed' ? `$${subscription.delivery_amount?.toLocaleString('es-CL')} dcto` : `${subscription.delivery_amount}% dcto`}
                      </div>
                    )}
                  </div>
                  {subscription.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{subscription.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={subscription.is_active} onCheckedChange={handleToggle} />
                <Button size="sm" variant="ghost" onClick={handleOpenEdit}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Percent className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">Sin descuento permanente</h4>
            <p className="text-muted-foreground text-center mb-4">
              Este cliente no tiene un descuento automático configurado
            </p>
            <Button onClick={() => { setFormData({ ...defaultForm }); setIsCreateModalOpen(true); }} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Crear descuento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Descuento Permanente</DialogTitle>
          </DialogHeader>
          {renderForm(handleCreate, 'Crear Descuento')}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Descuento</DialogTitle>
          </DialogHeader>
          {renderForm(handleUpdate, 'Guardar Cambios')}
        </DialogContent>
      </Dialog>
    </div>
  );
}
