import { useState } from 'react';
import { Percent, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDiscountSubscription } from '@/hooks/useDiscountSubscription';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  customerId: string;
}

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

  const [formData, setFormData] = useState({
    percent: 10,
    notes: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    usageLimit: '' as string
  });

  const handleCreate = async () => {
    const usageLimit = formData.usageLimit ? parseInt(formData.usageLimit) : null;
    const success = await createSubscription(
      formData.percent,
      formData.notes,
      formData.startDate || null,
      formData.endDate || null,
      usageLimit
    );
    if (success) {
      setIsCreateModalOpen(false);
      setFormData({ percent: 10, notes: '', startDate: new Date().toISOString().split('T')[0], endDate: '', usageLimit: '' });
    }
  };

  const handleOpenEdit = () => {
    if (!subscription) return;
    setFormData({
      percent: subscription.discount_percent,
      notes: subscription.notes || '',
      startDate: subscription.start_date || '',
      endDate: subscription.end_date || '',
      usageLimit: subscription.usage_limit !== null ? String(subscription.usage_limit) : ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!subscription) return;
    const usageLimit = formData.usageLimit ? parseInt(formData.usageLimit) : null;
    const success = await updateSubscription(subscription.id, {
      discount_percent: formData.percent,
      notes: formData.notes || null,
      start_date: formData.startDate || null,
      end_date: formData.endDate || null,
      usage_limit: usageLimit
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

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Porcentaje de Descuento (%)</Label>
        <Input
          type="number"
          min="1"
          max="100"
          value={formData.percent}
          onChange={(e) => setFormData({ ...formData, percent: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
        />
        <p className="text-xs text-muted-foreground">
          Se aplicará automáticamente en cada compra del cliente
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha de Inicio</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de Término (opcional)</Label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            min={formData.startDate}
          />
          <p className="text-xs text-muted-foreground">Vacío = sin término</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cantidad de Usos (opcional)</Label>
        <Input
          type="number"
          min="1"
          value={formData.usageLimit}
          onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
          placeholder="Ilimitado"
        />
        <p className="text-xs text-muted-foreground">Vacío = usos ilimitados</p>
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

      <DialogFooter>
        <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={loading || formData.percent < 1 || formData.percent > 100}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

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
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
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
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">{subscription.discount_percent}%</span>
                    <Badge variant={subscription.is_active ? 'default' : 'secondary'}>
                      {subscription.is_active ? 'Activo' : 'Pausado'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {subscription.start_date && (
                      <span>Desde: {format(new Date(subscription.start_date), 'dd/MM/yyyy', { locale: es })}</span>
                    )}
                    {subscription.end_date ? (
                      <span className="ml-2">· Hasta: {format(new Date(subscription.end_date), 'dd/MM/yyyy', { locale: es })}</span>
                    ) : subscription.start_date ? (
                      <span className="ml-2 text-emerald-600">· Sin fecha de término</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {subscription.usage_limit !== null ? (
                      <span>
                        Usos: <span className={subscription.usage_count >= subscription.usage_limit ? 'text-destructive font-semibold' : 'font-semibold'}>{subscription.usage_count}/{subscription.usage_limit}</span>
                        {subscription.usage_count >= subscription.usage_limit && ' (agotado)'}
                      </span>
                    ) : (
                      <span>Usos: {subscription.usage_count} (ilimitado)</span>
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
            <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Crear descuento
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Descuento Permanente</DialogTitle>
          </DialogHeader>
          {renderForm(handleCreate, 'Crear Descuento')}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Descuento</DialogTitle>
          </DialogHeader>
          {renderForm(handleUpdate, 'Guardar Cambios')}
        </DialogContent>
      </Dialog>
    </div>
  );
}
