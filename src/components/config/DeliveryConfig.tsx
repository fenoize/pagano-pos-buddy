import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TruckIcon, Save } from 'lucide-react';
import { useDeliverySettings, AssignmentMode, MapProvider } from '@/hooks/useDeliverySettings';
import { Skeleton } from '@/components/ui/skeleton';

export const DeliveryConfig: React.FC = () => {
  const { settings, loading, updateSettings } = useDeliverySettings();
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(settings?.assignment_mode || 'assigned');
  const [mapProvider, setMapProvider] = useState<MapProvider>(settings?.map_provider || 'google_maps');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setAssignmentMode(settings.assignment_mode);
      setMapProvider(settings.map_provider);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateSettings({
        assignment_mode: assignmentMode,
        map_provider: mapProvider
      });

      if (success) {
        toast.success('Configuración de delivery actualizada');
      }
    } catch (error) {
      console.error('Error saving delivery config:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = settings && (
    assignmentMode !== settings.assignment_mode ||
    mapProvider !== settings.map_provider
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TruckIcon className="w-5 h-5" />
          Configuración de Delivery
        </CardTitle>
        <CardDescription>
          Configura el modo de asignación de pedidos y el proveedor de mapas para los repartidores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Modo de asignación */}
        <div className="space-y-3">
          <Label htmlFor="assignmentMode">Modo de Asignación de Pedidos</Label>
          <Select
            value={assignmentMode}
            onValueChange={(value) => setAssignmentMode(value as AssignmentMode)}
          >
            <SelectTrigger id="assignmentMode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assigned">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Asignados</span>
                  <span className="text-xs text-muted-foreground">
                    Cada repartidor ve solo sus pedidos asignados
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="pool">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Pool (Disponibles)</span>
                  <span className="text-xs text-muted-foreground">
                    Todos ven pedidos sin asignar y pueden tomarlos
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {assignmentMode === 'assigned' 
              ? 'Los repartidores solo verán pedidos que les fueron asignados explícitamente desde el POS.'
              : 'Los repartidores pueden ver y tomar pedidos disponibles. Al marcar "En camino", el pedido se les asigna automáticamente.'}
          </p>
        </div>

        {/* Proveedor de mapas */}
        <div className="space-y-3">
          <Label htmlFor="mapProvider">Proveedor de Mapas</Label>
          <Select
            value={mapProvider}
            onValueChange={(value) => setMapProvider(value as MapProvider)}
          >
            <SelectTrigger id="mapProvider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google_maps">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Google Maps</span>
                  <span className="text-xs text-muted-foreground">
                    Navegación con Google Maps
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="waze">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Waze</span>
                  <span className="text-xs text-muted-foreground">
                    Navegación con Waze (próximamente)
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            El botón "Mapa" en las tarjetas de pedidos abrirá la app de navegación seleccionada.
          </p>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
