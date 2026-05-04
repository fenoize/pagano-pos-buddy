import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Settings, Trash2, GripVertical, 
  Banknote, CreditCard, Smartphone, AppWindow, 
  Sparkles, DollarSign, Coins, Wallet
} from 'lucide-react';
import { usePaymentMethods, PaymentMethod } from '@/hooks/usePaymentMethods';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ICON_OPTIONS = [
  { value: 'Banknote', label: 'Billetes', icon: Banknote },
  { value: 'CreditCard', label: 'Tarjeta', icon: CreditCard },
  { value: 'Smartphone', label: 'Teléfono', icon: Smartphone },
  { value: 'AppWindow', label: 'Aplicación', icon: AppWindow },
  { value: 'Sparkles', label: 'Runas', icon: Sparkles },
  { value: 'DollarSign', label: 'Dólar', icon: DollarSign },
  { value: 'Coins', label: 'Monedas', icon: Coins },
  { value: 'Wallet', label: 'Billetera', icon: Wallet }
];

function getIconComponent(iconName: string) {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption ? iconOption.icon : DollarSign;
}

function SortableRow({ method, onEdit, onDelete, onToggleActive, canReorder }: {
  method: PaymentMethod;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (id: string) => void;
  onToggleActive: (method: PaymentMethod) => void;
  canReorder: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: method.id, disabled: !canReorder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = getIconComponent(method.icon);

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        {canReorder ? (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <GripVertical className="w-4 h-4 text-muted-foreground/30" />
        )}
      </TableCell>
      <TableCell>
        <Icon className="w-5 h-5" />
      </TableCell>
      <TableCell className="font-mono text-sm">{method.name}</TableCell>
      <TableCell>{method.display_name}</TableCell>
      <TableCell>
        <Switch
          checked={method.is_active}
          onCheckedChange={() => onToggleActive(method)}
        />
      </TableCell>
      <TableCell>
        {method.requires_change ? (
          <Badge variant="secondary">Sí</Badge>
        ) : (
          <Badge variant="outline">No</Badge>
        )}
      </TableCell>
      <TableCell>
        {method.requires_receipt ? (
          <Badge variant="secondary">Sí</Badge>
        ) : (
          <Badge variant="outline">No</Badge>
        )}
      </TableCell>
      <TableCell>
        {method.requires_operation_number ? (
          <Badge variant="secondary">Sí</Badge>
        ) : (
          <Badge variant="outline">No</Badge>
        )}
      </TableCell>
      <TableCell>
        {method.counts_as_real_sale ? (
          <Badge>Sí</Badge>
        ) : (
          <Badge variant="destructive">No</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(method)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(method.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PaymentMethodsConfig() {
  const { 
    paymentMethods, 
    loading, 
    createPaymentMethod, 
    updatePaymentMethod, 
    deletePaymentMethod,
    reorderPaymentMethods,
    restoreDefaults 
  } = usePaymentMethods();
  const { user } = useAuthContext();
  const userRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
  const canReorder = userRoles.includes('Administrador');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentMethod>>({
    name: '',
    display_name: '',
    icon: 'DollarSign',
    is_active: true,
    requires_change: false,
    requires_receipt: false,
    requires_operation_number: false,
    counts_as_real_sale: true,
    display_order: paymentMethods.length
  });

  const handleOpenModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData(method);
    } else {
      setEditingMethod(null);
      setFormData({
        name: '',
        display_name: '',
        icon: 'DollarSign',
        is_active: true,
        requires_change: false,
        requires_receipt: false,
        requires_operation_number: false,
        counts_as_real_sale: true,
        display_order: paymentMethods.length
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
  };

  const handleSave = async () => {
    try {
      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, formData);
      } else {
        await createPaymentMethod(formData as Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving payment method:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este método de pago?')) {
      await deletePaymentMethod(id);
    }
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    await updatePaymentMethod(method.id, { is_active: !method.is_active });
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm('¿Estás seguro de que deseas restaurar los métodos de pago por defecto? Esto eliminará todos los métodos personalizados.')) {
      await restoreDefaults();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = paymentMethods.findIndex((item) => item.id === active.id);
      const newIndex = paymentMethods.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(paymentMethods, oldIndex, newIndex).map((method, index) => ({
        ...method,
        display_order: index
      }));

      await reorderPaymentMethods(reordered);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  const IconComponent = getIconComponent(formData.icon || 'DollarSign');

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Métodos de Pago
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleRestoreDefaults} variant="outline" size="sm">
              Restaurar Por Defecto
            </Button>
            <Button onClick={() => handleOpenModal()} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Método
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Icono</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Nombre Mostrado</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Req. Vuelto</TableHead>
                  <TableHead>Req. Comprobante</TableHead>
                  <TableHead>Req. N° Op.</TableHead>
                  <TableHead>Cuenta como Venta</TableHead>
                  <TableHead className="w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={paymentMethods.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {paymentMethods.map((method) => (
                    <SortableRow
                      key={method.id}
                      method={method}
                      onEdit={handleOpenModal}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                      canReorder={canReorder}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Editar Método de Pago' : 'Nuevo Método de Pago'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Interno (identificador)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="efectivo"
                  disabled={!!editingMethod}
                />
              </div>
              <div>
                <Label htmlFor="display_name">Nombre Mostrado</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Efectivo"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="icon">Icono</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <IconComponent className="w-4 h-4" />
                      <span>{ICON_OPTIONS.find(opt => opt.value === formData.icon)?.label}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Método Activo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="requires_change">Requiere Vuelto</Label>
                <Switch
                  id="requires_change"
                  checked={formData.requires_change}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_change: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="requires_receipt">Requiere Comprobante</Label>
                <Switch
                  id="requires_receipt"
                  checked={formData.requires_receipt}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_receipt: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="requires_operation_number">Requiere Número de Operación</Label>
                <Switch
                  id="requires_operation_number"
                  checked={formData.requires_operation_number}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_operation_number: checked })}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <Label htmlFor="counts_as_real_sale">Cuenta como Venta Real</Label>
                  <p className="text-xs text-muted-foreground">
                    Si está activado, este método se contabiliza en el total de ventas del cierre
                  </p>
                </div>
                <Switch
                  id="counts_as_real_sale"
                  checked={formData.counts_as_real_sale}
                  onCheckedChange={(checked) => setFormData({ ...formData, counts_as_real_sale: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingMethod ? 'Guardar Cambios' : 'Crear Método'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
