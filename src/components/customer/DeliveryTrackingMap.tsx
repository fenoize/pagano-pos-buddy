import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, AlertCircle, Clock } from 'lucide-react';
import { useDeliveryTrackingCustomer } from '@/hooks/useDeliveryTrackingCustomer';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface DeliveryTrackingMapProps {
  orderId: string;
  destinationLat: number | null;
  destinationLng: number | null;
  mapboxToken: string;
}

export const DeliveryTrackingMap: React.FC<DeliveryTrackingMapProps> = ({
  orderId,
  destinationLat,
  destinationLng,
  mapboxToken,
}) => {
  const tracking = useDeliveryTrackingCustomer(orderId);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [destinationLng || -70.65, destinationLat || -33.44],
      zoom: 14,
      attributionControl: false,
    });

    map.on('load', () => {
      setMapReady(true);
    });

    mapRef.current = map;

    // Add destination marker
    if (destinationLat && destinationLng) {
      const destEl = document.createElement('div');
      destEl.innerHTML = '📍';
      destEl.style.fontSize = '28px';
      destEl.style.cursor = 'pointer';

      destMarkerRef.current = new mapboxgl.Marker({ element: destEl })
        .setLngLat([destinationLng, destinationLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Tu dirección'))
        .addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      destMarkerRef.current = null;
      setMapReady(false);
    };
  }, [mapboxToken, destinationLat, destinationLng]);

  // Update rider marker
  useEffect(() => {
    if (!mapRef.current || !mapReady || !tracking.riderLat || !tracking.riderLng) return;

    const lngLat: [number, number] = [tracking.riderLng, tracking.riderLat];

    if (!riderMarkerRef.current) {
      const riderEl = document.createElement('div');
      riderEl.innerHTML = '🛵';
      riderEl.style.fontSize = '32px';
      riderEl.style.transition = 'transform 0.5s ease';

      riderMarkerRef.current = new mapboxgl.Marker({ element: riderEl })
        .setLngLat(lngLat)
        .addTo(mapRef.current);
    } else {
      riderMarkerRef.current.setLngLat(lngLat);
    }

    // Rotate by heading
    if (tracking.heading != null && riderMarkerRef.current) {
      const el = riderMarkerRef.current.getElement();
      el.style.transform = `rotate(${tracking.heading}deg)`;
    }

    // Fit bounds to show both markers
    if (destinationLat && destinationLng) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(lngLat);
      bounds.extend([destinationLng, destinationLat]);
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 1000 });
    } else {
      mapRef.current.flyTo({ center: lngLat, zoom: 15, duration: 1000 });
    }
  }, [tracking.riderLat, tracking.riderLng, tracking.heading, mapReady, destinationLat, destinationLng]);

  // Calculate time since last update
  const getTimeSinceUpdate = () => {
    if (!tracking.lastUpdated) return '';
    const seconds = Math.floor((Date.now() - new Date(tracking.lastUpdated).getTime()) / 1000);
    if (seconds < 10) return 'ahora';
    if (seconds < 60) return `hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `hace ${minutes}min`;
  };

  // Status message
  const getStatusMessage = () => {
    if (tracking.loading) return { icon: <Clock className="h-5 w-5 animate-pulse" />, text: 'Buscando ubicación del repartidor...' };
    if (!tracking.riderLat) return { icon: <Truck className="h-5 w-5" />, text: 'El repartidor aún no ha compartido su ubicación' };
    if (tracking.isNear) return { icon: <MapPin className="h-5 w-5 text-green-600" />, text: '¡Estamos muy cerca! Prepárate 📍' };
    if (tracking.isStale) return { icon: <AlertCircle className="h-5 w-5 text-amber-500" />, text: `Última ubicación disponible · ${getTimeSinceUpdate()}` };
    return { icon: <Truck className="h-5 w-5 text-primary" />, text: 'Tu repartidor va en camino 🛵' };
  };

  const status = getStatusMessage();

  if (!tracking.isActive && !tracking.loading && !tracking.riderLat) {
    return null; // No tracking data at all
  }

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      {/* Status banner */}
      <div className={`px-4 py-3 flex items-center gap-3 ${
        tracking.isNear ? 'bg-green-50 dark:bg-green-950/20' :
        tracking.isStale ? 'bg-amber-50 dark:bg-amber-950/20' :
        'bg-primary/5'
      }`}>
        {status.icon}
        <div className="flex-1">
          <p className="font-semibold text-sm">{status.text}</p>
          {tracking.lastUpdated && !tracking.isStale && (
            <p className="text-xs text-muted-foreground">
              Actualizado {getTimeSinceUpdate()}
            </p>
          )}
        </div>
        {tracking.isActive && (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />
            En vivo
          </Badge>
        )}
      </div>

      {/* Map */}
      <CardContent className="p-0">
        <div
          ref={mapContainerRef}
          className="w-full h-[280px] sm:h-[350px]"
        />
      </CardContent>

      {/* V1 Limitation note */}
      <div className="px-4 py-2 bg-muted/50 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Seguimiento disponible mientras el repartidor tenga la app activa
        </p>
      </div>
    </Card>
  );
};
