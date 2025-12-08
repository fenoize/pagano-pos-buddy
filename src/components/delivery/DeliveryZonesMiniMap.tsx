import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DeliveryZone } from '@/hooks/useDeliveryZones';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';
import { MapPin } from 'lucide-react';

interface DeliveryZonesMiniMapProps {
  zones: DeliveryZone[];
}

// Generate distinct colors for zones
const ZONE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(price);
};

export function DeliveryZonesMiniMap({ zones }: DeliveryZonesMiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useDeliverySettings();

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        if (settings?.mapbox_token) {
          setMapboxToken(settings.mapbox_token);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [settings]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const storeLocation = settings?.store_lat && settings?.store_lng
      ? { lat: settings.store_lat, lng: settings.store_lng }
      : { lat: -33.4489, lng: -70.6693 }; // Default to Santiago

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [storeLocation.lng, storeLocation.lat],
      zoom: 11,
      interactive: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add store marker
      if (settings?.store_lat && settings?.store_lng) {
        new mapboxgl.Marker({ color: '#000' })
          .setLngLat([settings.store_lng, settings.store_lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>📍 Tienda</strong>'))
          .addTo(map.current);
      }

      // Add zones with polygons
      const zonesWithPolygons = zones.filter(zone => zone.polygon);
      const bounds = new mapboxgl.LngLatBounds();
      let hasBounds = false;

      zonesWithPolygons.forEach((zone, index) => {
        if (!map.current || !zone.polygon) return;

        const color = ZONE_COLORS[index % ZONE_COLORS.length];
        const sourceId = `zone-${zone.id}`;
        const layerId = `zone-fill-${zone.id}`;
        const outlineLayerId = `zone-outline-${zone.id}`;

        // Parse polygon data
        let coordinates: number[][][] = [];
        try {
          const polygonData = typeof zone.polygon === 'string' 
            ? JSON.parse(zone.polygon) 
            : zone.polygon;
          
          if (polygonData.type === 'Polygon') {
            coordinates = polygonData.coordinates;
          } else if (Array.isArray(polygonData)) {
            coordinates = [polygonData];
          }
        } catch (e) {
          console.error('Error parsing polygon:', e);
          return;
        }

        if (coordinates.length === 0 || coordinates[0].length === 0) return;

        // Add to bounds
        coordinates[0].forEach((coord: number[]) => {
          bounds.extend([coord[0], coord[1]]);
          hasBounds = true;
        });

        // Add source
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              name: zone.name,
              fee: zone.delivery_fee,
              active: zone.active
            },
            geometry: {
              type: 'Polygon',
              coordinates: coordinates
            }
          }
        });

        // Add fill layer
        map.current.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color,
            'fill-opacity': zone.active ? 0.3 : 0.1
          }
        });

        // Add outline layer
        map.current.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color,
            'line-width': 2,
            'line-opacity': zone.active ? 1 : 0.5
          }
        });

        // Add popup on click
        map.current.on('click', layerId, (e) => {
          if (!map.current) return;
          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: system-ui; padding: 4px;">
                <strong>${zone.name}</strong>
                <div style="margin-top: 4px; color: ${zone.active ? '#16a34a' : '#9ca3af'};">
                  ${zone.active ? '● Activa' : '○ Inactiva'}
                </div>
                <div style="margin-top: 4px; font-weight: 600;">
                  ${formatPrice(zone.delivery_fee)}
                </div>
              </div>
            `)
            .addTo(map.current);
        });

        // Change cursor on hover
        map.current.on('mouseenter', layerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', layerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });

      // Fit to bounds if we have zones
      if (hasBounds) {
        map.current.fitBounds(bounds, { padding: 40, maxZoom: 13 });
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, zones, settings]);

  const zonesWithPolygons = zones.filter(z => z.polygon);

  if (loading) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/50 h-64 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Cargando mapa...</p>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/50 h-48 flex flex-col items-center justify-center gap-2">
        <MapPin className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Configura Mapbox en Integraciones para ver el mapa
        </p>
      </div>
    );
  }

  if (zonesWithPolygons.length === 0) {
    return (
      <div className="mt-6 rounded-lg border bg-muted/50 h-48 flex flex-col items-center justify-center gap-2">
        <MapPin className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No hay zonas con polígonos definidos
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Vista rápida de zonas</h4>
      
      <div className="rounded-lg border overflow-hidden">
        <div ref={mapContainer} className="h-64 w-full" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {zonesWithPolygons.map((zone, index) => (
          <div 
            key={zone.id} 
            className="flex items-center gap-2 text-xs"
          >
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ 
                backgroundColor: ZONE_COLORS[index % ZONE_COLORS.length],
                opacity: zone.active ? 1 : 0.4
              }} 
            />
            <span className={zone.active ? '' : 'text-muted-foreground'}>
              {zone.name} ({formatPrice(zone.delivery_fee)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
