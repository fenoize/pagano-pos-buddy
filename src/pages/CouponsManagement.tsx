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
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useCoupons } from '@/hooks/useCoupons';
import { Coupon, CouponType } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';

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
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData(coupon);
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

      const couponData = {
        ...formData,
        created_by: user?.id,
      };

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
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="affects_products"
                      checked={formData.affects_products}
                      onCheckedChange={(checked) => setFormData({ ...formData, affects_products: checked })}
                    />
                    <Label htmlFor="affects_products">Aplica a Productos</Label>
                  </div>

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
