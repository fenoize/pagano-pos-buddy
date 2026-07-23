import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDeliveryGeo, DeliveryZoneWithGeo } from '@/hooks/useDeliveryGeo';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { toast } from 'sonner';

interface Coords { lat: number; lng: number; }

export interface QuoteResult {
  address: string;
  coordinates: Coords;
  zone: DeliveryZoneWithGeo | null;
  distanceKm: number | null;
  fee: number | null;
}

interface AddressQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAddress?: string;
  initialCoordinates?: Coords | null;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: (result: QuoteResult) => void;
}

const formatPrice = (p: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(p);

export function AddressQuoteModal({
  isOpen,
  onClose,
  initialAddress = '',
  initialCoordinates = null,
  title = 'Cotizar dirección',
  description = 'Busca una dirección, arrastra el pin para ajustar la ubicación exacta y obtén el costo de envío.',
  confirmLabel,
  onConfirm,
}: AddressQuoteModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const { zones } = useDeliveryZones();
  const { settings, getStoreLocation } = useDeliverySettings();
  const { searchAddresses, findZoneByCoordinates, calculateDistance, calculateDeliveryFee, fetchMapboxToken } = useDeliveryGeo();

  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reverseAddress, setReverseAddress] = useState<string>(initialAddress);
  const [coords, setCoords] = useState<Coords | null>(initialCoordinates);

  const activeZones: DeliveryZoneWithGeo[] = (zones as any[])
    .filter((z: any) => z.active && z.polygon)
    .map((z: any) => ({
      id: z.id,
      name: z.name,
      delivery_fee: z.delivery_fee,
      polygon: z.polygon,
      price_per_km: z.price_per_km ?? 0,
      min_fee: z.min_fee ?? 0,
      calculation_mode: (z.calculation_mode ?? 'fixed') as 'fixed' | 'distance',
      active: z.active,
    }));

  const store = getStoreLocation();

  // Fetch token
  useEffect(() => {
    if (!isOpen) return;
    fetchMapboxToken().then(setToken);
  }, [isOpen, fetchMapboxToken]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      setSearch(initialAddress);
      setCoords(initialCoordinates);
      setReverseAddress(initialAddress);
    }
  }, [isOpen, initialAddress, initialCoordinates]);

  // Init map
  useEffect(() => {
    if (!isOpen || !token || !mapContainer.current || map.current) return;
    mapboxgl.accessToken = token;
    const center = initialCoordinates ?? (store ? { lat: store.lat, lng: store.lng } : { lat: -33.4489, lng: -70.6693 });
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 14,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;
      // Store marker
      if (store) {
        new mapboxgl.Marker({ color: '#000' })
          .setLngLat([store.lng, store.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>📍 Tienda</strong>'))
          .addTo(map.current);
      }
      // Zones
      activeZones.forEach((zone, idx) => {
        if (!map.current) return;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
        const color = colors[idx % colors.length];
        let coordsPoly: number[][][] = [];
        try {
          const poly = typeof zone.polygon === 'string' ? JSON.parse(zone.polygon) : zone.polygon;
          if (poly.type === 'Polygon') coordsPoly = poly.coordinates;
          else if (Array.isArray(poly)) coordsPoly = [poly];
        } catch { return; }
        if (!coordsPoly.length) return;
        const srcId = `q-zone-${zone.id}`;
        map.current.addSource(srcId, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coordsPoly } },
        });
        map.current.addLayer({ id: `${srcId}-fill`, type: 'fill', source: srcId, paint: { 'fill-color': color, 'fill-opacity': 0.15 } });
        map.current.addLayer({ id: `${srcId}-line`, type: 'line', source: srcId, paint: { 'line-color': color, 'line-width': 2 } });
      });

      setMapReady(true);

      if (initialCoordinates) placeMarker(initialCoordinates);
    });

    map.current.on('click', (e) => {
      placeMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token]);

  const reverseGeocode = useCallback(async (c: Coords) => {
    if (!token) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${c.lng},${c.lat}.json?access_token=${token}&country=cl&limit=1`
      );
      const data = await res.json();
      const place = data.features?.[0]?.place_name;
      if (place) setReverseAddress(place);
    } catch (e) { console.error(e); }
  }, [token]);

  const placeMarker = useCallback((c: Coords) => {
    if (!map.current) return;
    if (!marker.current) {
      marker.current = new mapboxgl.Marker({ color: '#ef4444', draggable: true })
        .setLngLat([c.lng, c.lat])
        .addTo(map.current);
      marker.current.on('dragend', () => {
        const ll = marker.current!.getLngLat();
        const nc = { lat: ll.lat, lng: ll.lng };
        setCoords(nc);
        reverseGeocode(nc);
      });
    } else {
      marker.current.setLngLat([c.lng, c.lat]);
    }
    setCoords(c);
    map.current.flyTo({ center: [c.lng, c.lat], zoom: Math.max(map.current.getZoom(), 15) });
    reverseGeocode(c);
  }, [reverseGeocode]);

  // Debounced search
  useEffect(() => {
    if (!search || search.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const results = await searchAddresses(search);
      setSuggestions(results);
      setShowSuggestions(true);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search, searchAddresses]);

  const handlePickSuggestion = (s: any) => {
    setSearch(s.address);
    setReverseAddress(s.address);
    setShowSuggestions(false);
    placeMarker(s.coordinates);
  };

  // Compute quote
  const zone = coords ? findZoneByCoordinates(coords, activeZones) : null;
  const distanceKm = coords && store ? calculateDistance(store, coords) : null;
  const fee = zone && distanceKm !== null ? calculateDeliveryFee(zone, distanceKm) : zone ? zone.delivery_fee : null;

  const handleConfirm = () => {
    if (!coords) {
      toast.error('Selecciona una ubicación en el mapa');
      return;
    }
    onConfirm?.({
      address: reverseAddress || search,
      coordinates: coords,
      zone,
      distanceKm,
      fee,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search */}
          <div className="relative">
            <Label>Dirección</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Ej: Av. Providencia 1234, Providencia"
                className="pl-9"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-56 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePickSuggestion(s)}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-start gap-2 border-b last:border-b-0"
                  >
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <span>{s.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="relative rounded-lg border overflow-hidden bg-muted" style={{ height: 360 }}>
            {!token ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                Configura Mapbox en Integraciones para usar el mapa
              </div>
            ) : (
              <div ref={mapContainer} className="w-full h-full" />
            )}
            {coords && (
              <div className="absolute top-2 left-2 bg-background/95 backdrop-blur px-3 py-1.5 rounded-md text-xs shadow border">
                💡 Arrastra el pin rojo para ajustar la ubicación
              </div>
            )}
          </div>

          {/* Result */}
          {coords && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <div>
                <div className="text-xs text-muted-foreground">Dirección seleccionada</div>
                <div className="text-sm font-medium">{reverseAddress || 'Ubicación personalizada'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </div>
              </div>

              {zone ? (
                <div className="flex items-start gap-3 pt-3 border-t">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default">{zone.name}</Badge>
                      <span className="text-xs text-muted-foreground capitalize">
                        {zone.calculation_mode === 'distance' ? 'Por distancia' : 'Tarifa fija'}
                      </span>
                    </div>
                    {distanceKm !== null && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Distancia: {distanceKm.toFixed(2)} km desde la tienda
                      </div>
                    )}
                    <div className="text-2xl font-bold text-primary mt-2">
                      {fee !== null ? formatPrice(fee) : '-'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 pt-3 border-t">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Fuera de zonas de cobertura</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Esta ubicación no está dentro de ninguna zona activa. Arrastra el pin o busca otra dirección.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {onConfirm && (
            <Button onClick={handleConfirm} disabled={!coords}>
              {confirmLabel ?? 'Usar esta dirección'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
