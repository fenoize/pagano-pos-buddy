import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, MapPin, Calculator } from 'lucide-react';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { DeliveryZoneForm } from './DeliveryZoneForm';
import { DeliveryZonesMiniMap, ZONE_COLORS } from './DeliveryZonesMiniMap';
import { AddressQuoteModal } from './AddressQuoteModal';
import { toast } from 'sonner';

export function DeliveryZoneManagement() {
  const { zones, loading, createZone, updateZone, deleteZone, toggleZoneStatus, canManageZones } = useDeliveryZones();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  if (!canManageZones) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <MapPin className="mx-auto h-12 w-12 mb-4" />
            <p>No tienes permisos para gestionar zonas de delivery.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCreateZone = () => {
    setEditingZone(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    let result;
    
    if (formMode === 'create') {
      result = await createZone(data);
    } else if (editingZone) {
      result = await updateZone(editingZone.id, data);
    }

    if (result?.success) {
      toast.success(formMode === 'create' ? 'Zona creada exitosamente' : 'Zona actualizada exitosamente');
    } else {
      toast.error(result?.error || 'Error al guardar la zona');
    }

    return result;
  };

  const handleDeleteZone = async (zoneId: string) => {
    const result = await deleteZone(zoneId);
    
    if (result.success) {
      toast.success('Zona eliminada exitosamente');
    } else {
      toast.error(result.error || 'Error al eliminar la zona');
    }
  };

  const handleToggleStatus = async (zoneId: string, currentStatus: boolean) => {
    const result = await toggleZoneStatus(zoneId, !currentStatus);
    
    if (result.success) {
      toast.success(`Zona ${!currentStatus ? 'activada' : 'desactivada'} exitosamente`);
    } else {
      toast.error(result.error || 'Error al cambiar el estado de la zona');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Zonas de Delivery
            </CardTitle>
            <CardDescription>
              Gestiona las zonas de delivery y sus costos
            </CardDescription>
          </div>
          <Button onClick={handleCreateZone}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Zona
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Cargando zonas...</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No hay zonas de delivery configuradas</p>
            <Button onClick={handleCreateZone}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Zona
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Costo Delivery</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone, index) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm flex-shrink-0" 
                        style={{ 
                          backgroundColor: ZONE_COLORS[index % ZONE_COLORS.length],
                          opacity: zone.active ? 1 : 0.4
                        }} 
                      />
                      {zone.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {zone.description || '-'}
                  </TableCell>
                  <TableCell>{formatPrice(zone.delivery_fee)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={zone.active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleStatus(zone.id, zone.active)}
                    >
                      {zone.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditZone(zone)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente la zona "{zone.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteZone(zone.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {zones.length > 0 && (
          <DeliveryZonesMiniMap zones={zones} />
        )}

        <DeliveryZoneForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          zone={editingZone}
          mode={formMode}
        />
      </CardContent>
    </Card>
  );
}