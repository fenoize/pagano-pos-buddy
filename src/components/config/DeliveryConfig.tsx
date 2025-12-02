import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { TruckIcon, Save, MapPin, Loader2, Navigation } from 'lucide-react';
import { useDeliverySettings, AssignmentMode, MapProvider } from '@/hooks/useDeliverySettings';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export const DeliveryConfig: React.FC = () => {
  const { settings, loading, updateSettings, updateStoreLocation, getStoreLocation } = useDeliverySettings();
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(settings?.assignment_mode || 'assigned');
  const [mapProvider, setMapProvider] = useState<MapProvider>(settings?.map_provider || 'google_maps');
  const [autoZoneDetection, setAutoZoneDetection] = useState(settings?.auto_zone_detection || false);
  const [saving, setSaving] = useState(false);
  
  // Store location state
  const [storeAddress, setStoreAddress] = useState('');
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  
  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (settings) {
      setAssignmentMode(settings.assignment_mode);
      setMapProvider(settings.map_provider);
      setAutoZoneDetection(settings.auto_zone_detection);
      setStoreAddress(settings.store_address || '');
      setStoreLat(settings.store_lat);
      setStoreLng(settings.store_lng);
      setMapboxToken(settings.mapbox_token);
    }
  }, [settings]);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const defaultCenter: [number, number] = storeLng && storeLat 
      ? [storeLng, storeLat] 
      : [-70.6483, -33.4569]; // Santiago

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: defaultCenter,
      zoom: 14
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add marker if location exists
    if (storeLat && storeLng) {
      marker.current = new mapboxgl.Marker({ color: '#ef4444', draggable: true })
        .setLngLat([storeLng, storeLat])
        .addTo(map.current);

      marker.current.on('dragend', () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          setStoreLat(lngLat.lat);
          setStoreLng(lngLat.lng);
        }
      });
    }

    // Click to set location
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#ef4444', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        marker.current.on('dragend', () => {
          const lngLat = marker.current?.getLngLat();
          if (lngLat) {
            setStoreLat(lngLat.lat);
            setStoreLng(lngLat.lng);
          }
        });
      }

      setStoreLat(lat);
      setStoreLng(lng);
    });

    return () => {
      marker.current?.remove();
      map.current?.remove();
    };
  }, [mapboxToken]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no disponible');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setStoreLat(latitude);
        setStoreLng(longitude);

        if (map.current) {
          map.current.flyTo({ center: [longitude, latitude], zoom: 16 });
          
          if (marker.current) {
            marker.current.setLngLat([longitude, latitude]);
          } else {
            marker.current = new mapboxgl.Marker({ color: '#ef4444', draggable: true })
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          }
        }

        toast.success('Ubicación actualizada');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('No se pudo obtener la ubicación');
      }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all settings including store location
      const success = await updateSettings({
        assignment_mode: assignmentMode,
        map_provider: mapProvider,
        auto_zone_detection: autoZoneDetection,
        store_lat: storeLat,
        store_lng: storeLng,
        store_address: storeAddress || null
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
    mapProvider !== settings.map_provider ||
    autoZoneDetection !== settings.auto_zone_detection ||
    storeAddress !== (settings.store_address || '') ||
    storeLat !== settings.store_lat ||
    storeLng !== settings.store_lng
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
    <div className="space-y-6">
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
          </div>

          {/* Proveedor de mapas */}
          <div className="space-y-3">
            <Label htmlFor="mapProvider">Proveedor de Mapas para Navegación</Label>
            <Select
              value={mapProvider}
              onValueChange={(value) => setMapProvider(value as MapProvider)}
            >
              <SelectTrigger id="mapProvider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_maps">Google Maps</SelectItem>
                <SelectItem value="waze">Waze</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto zone detection toggle */}
          <div className="flex items-center justify-between py-3 px-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Detección automática de zona</Label>
              <p className="text-sm text-muted-foreground">
                Detectar automáticamente la zona de delivery según la dirección del cliente
              </p>
            </div>
            <Switch
              checked={autoZoneDetection}
              onCheckedChange={setAutoZoneDetection}
            />
          </div>
        </CardContent>
      </Card>

      {/* Store Location Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Ubicación del Local
          </CardTitle>
          <CardDescription>
            Define la ubicación de tu local para calcular distancias de delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeAddress">Dirección del Local</Label>
            <Input
              id="storeAddress"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Ej: Av. Providencia 1234, Providencia"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitud</Label>
              <Input
                type="number"
                step="any"
                value={storeLat ?? ''}
                onChange={(e) => setStoreLat(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="-33.4569"
              />
            </div>
            <div className="space-y-2">
              <Label>Longitud</Label>
              <Input
                type="number"
                step="any"
                value={storeLng ?? ''}
                onChange={(e) => setStoreLng(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="-70.6483"
              />
            </div>
          </div>

          {mapboxToken ? (
            <>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Usar mi ubicación
                </Button>
              </div>

              <div 
                ref={mapContainer} 
                className="h-64 rounded-lg overflow-hidden border"
              />
              <p className="text-xs text-muted-foreground">
                Haz clic en el mapa o arrastra el marcador para ajustar la ubicación
              </p>
            </>
          ) : (
            <div className="bg-muted/50 p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Configura el token de Mapbox en la sección de Integraciones para ver el mapa
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
    </div>
  );
};
