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
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useCoupons } from '@/hooks/useCoupons';
import { Coupon, CouponType, Category, Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function CouponsManagement() {
  const { user } = useAuthContext();
  const { coupons, loading, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus } = useCoupons();
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
    allow_stack: false,
    apply_to_discounted: true,
    apply_to_combo_children: true,
    allow_manual_line_selection: false,
  });

  // Estados para alcance de productos
  const [scopeMode, setScopeMode] = useState<'all' | 'categories' | 'products'>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAllowedCategories, setSelectedAllowedCategories] = useState<string[]>([]);
  const [selectedExcludedCategories, setSelectedExcludedCategories] = useState<string[]>([]);
  const [selectedAllowedProducts, setSelectedAllowedProducts] = useState<string[]>([]);
  const [selectedExcludedProducts, setSelectedExcludedProducts] = useState<string[]>([]);

  // Cargar categorías y productos al abrir el modal
  useEffect(() => {
    if (isDialogOpen) {
      fetchCategoriesAndProducts();
    }
  }, [isDialogOpen]);

  const fetchCategoriesAndProducts = async () => {
    // Cargar categorías activas
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name');
    
    setCategories(categoriesData || []);
    
    // Cargar productos activos
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, category')
      .eq('active', true)
      .order('name');
    
    setProducts(productsData || []);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percent',
      amount: 0,
      description: '',
      is_active: true,
      affects_products: true,
      affects_delivery: false,
      allow_stack: false,
      apply_to_discounted: true,
      apply_to_combo_children: true,
      allow_manual_line_selection: false,
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
    
    // Determinar el modo de alcance
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
      toast({
        title: 'Cupón eliminado',
        description: 'El cupón se eliminó correctamente',
      });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await toggleCouponStatus(id, !currentStatus);
    toast({
      title: currentStatus ? 'Cupón desactivado' : 'Cupón activado',
      description: `El cupón fue ${currentStatus ? 'desactivado' : 'activado'} correctamente`,
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.code || !formData.type || formData.amount === undefined) {
        toast({
          title: 'Error',
          description: 'Completa los campos obligatorios',
          variant: 'destructive',
        });
        return;
      }

      const couponData: Partial<Coupon> = {
        ...formData,
        created_by: user?.id,
      };

      // Agregar alcance según el modo seleccionado
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
        // 'all' - limpiar todo
        couponData.allowed_categories = [];
        couponData.excluded_categories = [];
        couponData.allowed_products = [];
        couponData.excluded_products = [];
      }

      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, couponData);
        toast({
          title: 'Cupón actualizado',
          description: 'El cupón se actualizó correctamente',
        });
      } else {
        await createCoupon(couponData);
        toast({
          title: 'Cupón creado',
          description: 'El cupón se creó correctamente',
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Hubo un error al guardar el cupón',
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const getTypeLabel = (type: CouponType) => {
    const labels = {
      percent: 'Porcentaje',
      fixed_cart: 'Monto Fijo (Carrito)',
      fixed_product: 'Monto Fijo (Producto)',
    };
    return labels[type] || type;
  };

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
              <DialogDescription>
                Configura los detalles del cupón de descuento
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="conditions">Condiciones</TabsTrigger>
                <TabsTrigger value="rules">Reglas</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código del Cupón *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="VERANO2024"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Descuento *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: CouponType) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed_cart">Monto Fijo (Carrito)</SelectItem>
                        <SelectItem value="fixed_product">Monto Fijo (Por Producto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">
                    {formData.type === 'percent' ? 'Porcentaje de Descuento' : 'Monto de Descuento (CLP)'} *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    placeholder={formData.type === 'percent' ? '10' : '5000'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el cupón para uso interno"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Cupón Activo</Label>
                </div>
              </TabsContent>

              <TabsContent value="conditions" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_start">Fecha Inicio</Label>
                    <Input
                      id="date_start"
                      type="datetime-local"
                      value={formData.date_start ? new Date(formData.date_start).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData({ ...formData, date_start: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_end">Fecha Fin</Label>
                    <Input
                      id="date_end"
                      type="datetime-local"
                      value={formData.date_end ? new Date(formData.date_end).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData({ ...formData, date_end: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_spend">Compra Mínima (CLP)</Label>
                    <Input
                      id="min_spend"
                      type="number"
                      value={formData.min_spend || ''}
                      onChange={(e) => setFormData({ ...formData, min_spend: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max_spend">Compra Máxima (CLP)</Label>
                    <Input
                      id="max_spend"
                      type="number"
                      value={formData.max_spend || ''}
                      onChange={(e) => setFormData({ ...formData, max_spend: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Sin límite"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="usage_limit_total">Usos Totales</Label>
                    <Input
                      id="usage_limit_total"
                      type="number"
                      value={formData.usage_limit_total || ''}
                      onChange={(e) => setFormData({ ...formData, usage_limit_total: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Ilimitado"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="usage_limit_per_customer">Usos por Cliente</Label>
                    <Input
                      id="usage_limit_per_customer"
                      type="number"
                      value={formData.usage_limit_per_customer || ''}
                      onChange={(e) => setFormData({ ...formData, usage_limit_per_customer: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4">
                <div className="space-y-6">
                  {/* Switch de Aplica a Productos */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="affects_products"
                      checked={formData.affects_products}
                      onCheckedChange={(checked) => setFormData({ ...formData, affects_products: checked })}
                    />
                    <Label htmlFor="affects_products">Aplica a Productos</Label>
                  </div>
                  
                  {/* Sección de Alcance (solo visible si affects_products = true) */}
                  {formData.affects_products && (
                    <Card className="border-2 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-base">Alcance de Productos</CardTitle>
                        <CardDescription>
                          Define qué productos son elegibles para este cupón
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Radio Group para seleccionar el modo */}
                        <RadioGroup value={scopeMode} onValueChange={(value: 'all' | 'categories' | 'products') => setScopeMode(value)}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="scope-all" />
                            <Label htmlFor="scope-all" className="font-normal cursor-pointer">
                              Todos los productos
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="categories" id="scope-categories" />
                            <Label htmlFor="scope-categories" className="font-normal cursor-pointer">
                              Categorías específicas
                            </Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="products" id="scope-products" />
                            <Label htmlFor="scope-products" className="font-normal cursor-pointer">
                              Productos específicos
                            </Label>
                          </div>
                        </RadioGroup>
                        
                        {/* Sección de Categorías */}
                        {scopeMode === 'categories' && (
                          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Incluir Categorías</Label>
                              <p className="text-xs text-muted-foreground">
                                El cupón aplicará solo a productos de estas categorías
                              </p>
                              <ScrollArea className="h-[150px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {categories.map(category => (
                                    <div key={category.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`allow-cat-${category.id}`}
                                        checked={selectedAllowedCategories.includes(category.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedAllowedCategories([...selectedAllowedCategories, category.id]);
                                            setSelectedExcludedCategories(selectedExcludedCategories.filter(id => id !== category.id));
                                          } else {
                                            setSelectedAllowedCategories(selectedAllowedCategories.filter(id => id !== category.id));
                                          }
                                        }}
                                      />
                                      <Label htmlFor={`allow-cat-${category.id}`} className="font-normal cursor-pointer">
                                        {category.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Excluir Categorías</Label>
                              <p className="text-xs text-muted-foreground">
                                El cupón NO aplicará a productos de estas categorías (tiene prioridad)
                              </p>
                              <ScrollArea className="h-[150px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {categories.map(category => (
                                    <div key={category.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`exclude-cat-${category.id}`}
                                        checked={selectedExcludedCategories.includes(category.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedExcludedCategories([...selectedExcludedCategories, category.id]);
                                            setSelectedAllowedCategories(selectedAllowedCategories.filter(id => id !== category.id));
                                          } else {
                                            setSelectedExcludedCategories(selectedExcludedCategories.filter(id => id !== category.id));
                                          }
                                        }}
                                      />
                                      <Label htmlFor={`exclude-cat-${category.id}`} className="font-normal cursor-pointer">
                                        {category.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </div>
                        )}
                        
                        {/* Sección de Productos */}
                        {scopeMode === 'products' && (
                          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Incluir Productos</Label>
                              <p className="text-xs text-muted-foreground">
                                El cupón aplicará solo a estos productos específicos
                              </p>
                              <ScrollArea className="h-[200px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {products.map(product => (
                                    <div key={product.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`allow-prod-${product.id}`}
                                        checked={selectedAllowedProducts.includes(product.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedAllowedProducts([...selectedAllowedProducts, product.id]);
                                            setSelectedExcludedProducts(selectedExcludedProducts.filter(id => id !== product.id));
                                          } else {
                                            setSelectedAllowedProducts(selectedAllowedProducts.filter(id => id !== product.id));
                                          }
                                        }}
                                      />
                                      <Label htmlFor={`allow-prod-${product.id}`} className="font-normal cursor-pointer">
                                        {product.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Excluir Productos</Label>
                              <p className="text-xs text-muted-foreground">
                                El cupón NO aplicará a estos productos (tiene prioridad)
                              </p>
                              <ScrollArea className="h-[200px] border rounded-md p-3">
                                <div className="space-y-2">
                                  {products.map(product => (
                                    <div key={product.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`exclude-prod-${product.id}`}
                                        checked={selectedExcludedProducts.includes(product.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedExcludedProducts([...selectedExcludedProducts, product.id]);
                                            setSelectedAllowedProducts(selectedAllowedProducts.filter(id => id !== product.id));
                                          } else {
                                            setSelectedExcludedProducts(selectedExcludedProducts.filter(id => id !== product.id));
                                          }
                                        }}
                                      />
                                      <Label htmlFor={`exclude-prod-${product.id}`} className="font-normal cursor-pointer">
                                        {product.name}
                                      </Label>
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

                  {/* Resto de switches existentes */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="affects_delivery"
                      checked={formData.affects_delivery}
                      onCheckedChange={(checked) => setFormData({ ...formData, affects_delivery: checked })}
                    />
                    <Label htmlFor="affects_delivery">Aplica a Delivery</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_stack"
                      checked={formData.allow_stack}
                      onCheckedChange={(checked) => setFormData({ ...formData, allow_stack: checked })}
                    />
                    <Label htmlFor="allow_stack">Permitir Acumular con Otros Cupones</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="apply_to_discounted"
                      checked={formData.apply_to_discounted}
                      onCheckedChange={(checked) => setFormData({ ...formData, apply_to_discounted: checked })}
                    />
                    <Label htmlFor="apply_to_discounted">Aplica a Productos en Descuento</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="apply_to_combo_children"
                      checked={formData.apply_to_combo_children}
                      onCheckedChange={(checked) => setFormData({ ...formData, apply_to_combo_children: checked })}
                    />
                    <Label htmlFor="apply_to_combo_children">Aplica a Items de Combos</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_manual_line_selection"
                      checked={formData.allow_manual_line_selection}
                      onCheckedChange={(checked) => setFormData({ ...formData, allow_manual_line_selection: checked })}
                    />
                    <Label htmlFor="allow_manual_line_selection">Permitir Selección Manual de Productos</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingCoupon ? 'Actualizar' : 'Crear'} Cupón
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Cupones Disponibles
          </CardTitle>
          <CardDescription>
            Lista de todos los cupones de descuento configurados
          </CardDescription>
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
                  <TableHead>Usos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-medium">{coupon.code}</TableCell>
                    <TableCell>{getTypeLabel(coupon.type)}</TableCell>
                    <TableCell>
                      {coupon.type === 'percent' 
                        ? `${coupon.amount}%` 
                        : formatPrice(Number(coupon.amount))}
                    </TableCell>
                    <TableCell>
                      {coupon.total_used || 0}
                      {coupon.usage_limit_total ? ` / ${coupon.usage_limit_total}` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                        {coupon.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                        >
                          {coupon.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(coupon)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(coupon.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
