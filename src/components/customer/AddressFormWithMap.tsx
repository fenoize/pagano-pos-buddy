import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search } from 'lucide-react';
import { AddressAutocomplete } from '@/components/pos/AddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';

interface AddressFormData {
  alias: string;
  calle: string;
  numero: string;
  depto: string;
  comuna: string;
  observaciones: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
}

interface AddressFormWithMapProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AddressFormWithMap({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false
}: AddressFormWithMapProps) {
  const [formData, setFormData] = useState<AddressFormData>({
    alias: initialData?.alias || '',
    calle: initialData?.calle || '',
    numero: initialData?.numero || '',
    depto: initialData?.depto || '',
    comuna: initialData?.comuna || '',
    observaciones: initialData?.observaciones || '',
    is_default: initialData?.is_default || false,
    latitude: initialData?.latitude,
    longitude: initialData?.longitude,
    formatted_address: initialData?.formatted_address || ''
  });

  const [addressSearch, setAddressSearch] = useState(
    initialData?.formatted_address || 
    (initialData?.calle && initialData?.numero ? `${initialData.calle} ${initialData.numero}` : '')
  );
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [hasValidLocation, setHasValidLocation] = useState(
    !!(initialData?.latitude && initialData?.longitude)
  );

  // Sync state when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        alias: initialData.alias || '',
        calle: initialData.calle || '',
        numero: initialData.numero || '',
        depto: initialData.depto || '',
        comuna: initialData.comuna || '',
        observaciones: initialData.observaciones || '',
        is_default: initialData.is_default || false,
        latitude: initialData.latitude,
        longitude: initialData.longitude,
        formatted_address: initialData.formatted_address || ''
      });
      setAddressSearch(
        initialData.formatted_address || 
        (initialData.calle && initialData.numero ? `${initialData.calle} ${initialData.numero}` : '')
      );
      setHasValidLocation(!!(initialData.latitude && initialData.longitude));
    } else {
      // Reset form when creating new
      setFormData({
        alias: '',
        calle: '',
        numero: '',
        depto: '',
        comuna: '',
        observaciones: '',
        is_default: false,
        latitude: undefined,
        longitude: undefined,
        formatted_address: ''
      });
      setAddressSearch('');
      setHasValidLocation(false);
    }
  }, [initialData]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data } = await supabase
          .from('delivery_settings')
          .select('mapbox_token')
          .single();
        
        if (data?.mapbox_token) {
          setMapboxToken(data.mapbox_token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      } finally {
        setIsLoadingToken(false);
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const defaultLat = formData.latitude || -33.4489;
    const defaultLng = formData.longitude || -70.6693;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [defaultLng, defaultLat],
      zoom: hasValidLocation ? 16 : 12
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add draggable marker if we have coordinates
    if (hasValidLocation && formData.latitude && formData.longitude) {
      markerRef.current = new mapboxgl.Marker({ color: '#f97316', draggable: true })
        .setLngLat([formData.longitude, formData.latitude])
        .addTo(mapRef.current);
      markerRef.current.on('dragend', handleMarkerDragEnd);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [mapboxToken]);

  // Update marker when coordinates change (from search)
  useEffect(() => {
    if (!mapRef.current || !formData.latitude || !formData.longitude) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([formData.longitude, formData.latitude]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#f97316', draggable: true })
        .setLngLat([formData.longitude, formData.latitude])
        .addTo(mapRef.current);
      markerRef.current.on('dragend', handleMarkerDragEnd);
    }

    mapRef.current.flyTo({
      center: [formData.longitude, formData.latitude],
      zoom: 16,
      duration: 1000
    });
  }, [formData.latitude, formData.longitude]);

  // Reverse geocode when marker is dragged
  const handleMarkerDragEnd = async () => {
    if (!markerRef.current || !mapboxToken) return;
    const lngLat = markerRef.current.getLngLat();

    setFormData(prev => ({
      ...prev,
      latitude: lngLat.lat,
      longitude: lngLat.lng,
    }));
    setHasValidLocation(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxToken}&country=cl&limit=1&language=es`
      );
      if (!response.ok) return;
      const data = await response.json();
      const feature = data.features?.[0];
      if (!feature) return;

      const addressParts = feature.place_name.split(',')[0].trim();
      const numberMatch = addressParts.match(/(\d+)$/);
      const streetName = numberMatch
        ? addressParts.replace(/\s*\d+$/, '').trim()
        : addressParts;
      const streetNumber = numberMatch ? numberMatch[1] : '';
      const comunaContext = feature.context?.find((c: any) =>
        c.id.startsWith('locality') || c.id.startsWith('place')
      );

      setFormData(prev => ({
        ...prev,
        calle: streetName || prev.calle,
        numero: streetNumber || prev.numero,
        comuna: comunaContext?.text || prev.comuna,
        formatted_address: feature.place_name,
      }));
      setAddressSearch(feature.place_name);
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const handleAddressSelect = (result: {
    address: string;
    coordinates: { lat: number; lng: number };
    comuna?: string;
  }) => {
    // Parse the address to extract street and number
    const addressParts = result.address.split(',')[0].trim();
    const numberMatch = addressParts.match(/(\d+)$/);
    const streetName = numberMatch 
      ? addressParts.replace(/\s*\d+$/, '').trim()
      : addressParts;
    const streetNumber = numberMatch ? numberMatch[1] : '';

    setFormData(prev => ({
      ...prev,
      calle: streetName,
      numero: streetNumber,
      comuna: result.comuna || prev.comuna,
      latitude: result.coordinates.lat,
      longitude: result.coordinates.lng,
      formatted_address: result.address
    }));
    setHasValidLocation(true);
  };

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  if (isLoadingToken) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Alias */}
      <div className="space-y-2">
        <Label htmlFor="alias">Nombre de la dirección</Label>
        <Input
          id="alias"
          placeholder="Ej: Casa, Trabajo, Oficina..."
          value={formData.alias}
          onChange={(e) => handleInputChange('alias', e.target.value)}
          required
        />
      </div>

      {/* Address Search with Mapbox */}
      <div className="space-y-2">
        <Label>Buscar dirección</Label>
        <AddressAutocomplete
          value={addressSearch}
          onChange={setAddressSearch}
          onSelect={handleAddressSelect}
          placeholder="Escribe tu dirección..."
        />
        {formData.formatted_address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {formData.formatted_address}
          </p>
        )}
      </div>

      {/* Map Preview */}
      {mapboxToken && (
        <div className="space-y-2">
          <Label>Ubicación en el mapa</Label>
          <div 
            ref={mapContainerRef}
            className="h-64 rounded-lg border overflow-hidden bg-muted"
          >
            {!hasValidLocation && (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                <Search className="h-4 w-4 mr-2" />
                Busca una dirección para ver el mapa
              </div>
            )}
          </div>
          {hasValidLocation && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Arrastra el pin para ajustar la ubicación exacta (lote, parcela, portón).
            </p>
          )}
        </div>
      )}

      {/* Depto/Oficina */}
      <div className="space-y-2">
        <Label htmlFor="depto">Depto / Oficina (opcional)</Label>
        <Input
          id="depto"
          placeholder="Ej: Depto 301, Oficina 5B..."
          value={formData.depto}
          onChange={(e) => handleInputChange('depto', e.target.value)}
        />
      </div>

      {/* Comuna - Read only, auto-filled */}
      <div className="space-y-2">
        <Label htmlFor="comuna">Comuna</Label>
        <Input
          id="comuna"
          value={formData.comuna}
          onChange={(e) => handleInputChange('comuna', e.target.value)}
          placeholder="Se llenará automáticamente"
          className="bg-muted/50"
          readOnly={!!formData.latitude}
        />
      </div>

      {/* References */}
      <div className="space-y-2">
        <Label htmlFor="observaciones">Referencias adicionales (opcional)</Label>
        <Textarea
          id="observaciones"
          placeholder="Ej: Portón azul, junto a la farmacia..."
          value={formData.observaciones}
          onChange={(e) => handleInputChange('observaciones', e.target.value)}
          rows={2}
        />
      </div>

      {/* Default address checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_default"
          checked={formData.is_default}
          onCheckedChange={(checked) => handleInputChange('is_default', !!checked)}
        />
        <Label htmlFor="is_default" className="text-sm font-normal cursor-pointer">
          Usar como dirección principal
        </Label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.alias || !hasValidLocation}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar dirección'
          )}
        </Button>
      </div>
    </form>
  );
}
