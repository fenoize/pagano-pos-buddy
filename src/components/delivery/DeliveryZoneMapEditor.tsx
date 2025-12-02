import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

interface DeliveryZoneMapEditorProps {
  polygon?: any;
  onPolygonChange: (polygon: any) => void;
  storeLocation?: { lat: number; lng: number } | null;
  readonly?: boolean;
  height?: string;
}

export function DeliveryZoneMapEditor({
  polygon,
  onPolygonChange,
  storeLocation,
  readonly = false,
  height = "400px"
}: DeliveryZoneMapEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const storeMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Default center (Santiago, Chile)
  const defaultCenter: [number, number] = [-70.6483, -33.4569];

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase
          .from('delivery_settings')
          .select('mapbox_token')
          .single();

        if (error) throw error;
        
        if (data?.mapbox_token) {
          setMapboxToken(data.mapbox_token);
        }
      } catch (error) {
        console.error('Error fetching mapbox token:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: storeLocation ? [storeLocation.lng, storeLocation.lat] : defaultCenter,
      zoom: 12
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // Add polygon source and layer
      map.current?.addSource('zone-polygon', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: polygon ? {
            type: 'Polygon',
            coordinates: polygon.coordinates || [polygon]
          } : {
            type: 'Polygon',
            coordinates: [[]]
          }
        }
      });

      map.current?.addLayer({
        id: 'zone-polygon-fill',
        type: 'fill',
        source: 'zone-polygon',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.3
        }
      });

      map.current?.addLayer({
        id: 'zone-polygon-outline',
        type: 'line',
        source: 'zone-polygon',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2
        }
      });

      // Add store marker if location exists
      if (storeLocation) {
        const el = document.createElement('div');
        el.className = 'store-marker';
        el.innerHTML = `<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`;

        storeMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([storeLocation.lng, storeLocation.lat])
          .addTo(map.current!);
      }
    });

    // Click handler for drawing mode
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (!isDrawing || readonly) return;

      const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setDrawnPoints(prev => [...prev, point]);
    };

    map.current.on('click', handleMapClick);

    return () => {
      markersRef.current.forEach(m => m.remove());
      storeMarkerRef.current?.remove();
      map.current?.remove();
    };
  }, [mapboxToken, storeLocation]);

  // Update polygon display when polygon prop changes
  useEffect(() => {
    if (!map.current || !polygon) return;

    const source = map.current.getSource('zone-polygon') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: polygon.coordinates || [polygon]
        }
      });
    }
  }, [polygon]);

  // Update markers when drawing
  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!map.current || !isDrawing) return;

    // Add markers for each point
    drawnPoints.forEach((point, index) => {
      const el = document.createElement('div');
      el.className = 'point-marker';
      el.style.cssText = `
        width: 12px;
        height: 12px;
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;

      const marker = new mapboxgl.Marker(el, { draggable: true })
        .setLngLat(point)
        .addTo(map.current!);

      marker.on('drag', () => {
        const lngLat = marker.getLngLat();
        setDrawnPoints(prev => {
          const newPoints = [...prev];
          newPoints[index] = [lngLat.lng, lngLat.lat];
          return newPoints;
        });
      });

      markersRef.current.push(marker);
    });

    // Update preview polygon
    if (drawnPoints.length >= 3) {
      const closedPolygon = [...drawnPoints, drawnPoints[0]];
      const source = map.current.getSource('zone-polygon') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [closedPolygon]
          }
        });
      }
    }
  }, [drawnPoints, isDrawing]);

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawnPoints([]);
    
    // Clear existing polygon
    const source = map.current?.getSource('zone-polygon') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[]]
        }
      });
    }
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setDrawnPoints([]);
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Restore original polygon
    if (polygon) {
      const source = map.current?.getSource('zone-polygon') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: polygon.coordinates || [polygon]
          }
        });
      }
    }
  };

  const confirmDrawing = () => {
    if (drawnPoints.length < 3) {
      toast.error('Necesitas al menos 3 puntos para crear un polígono');
      return;
    }

    const closedPolygon = [...drawnPoints, drawnPoints[0]];
    const geoJson = {
      type: 'Polygon',
      coordinates: [closedPolygon]
    };

    onPolygonChange(geoJson);
    setIsDrawing(false);
    setDrawnPoints([]);
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    toast.success('Zona guardada correctamente');
  };

  const clearPolygon = () => {
    onPolygonChange(null);
    const source = map.current?.getSource('zone-polygon') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[]]
        }
      });
    }
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg"
        style={{ height }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div 
        className="flex flex-col items-center justify-center bg-muted rounded-lg p-6 text-center"
        style={{ height }}
      >
        <p className="text-muted-foreground mb-2">Token de Mapbox no configurado</p>
        <p className="text-sm text-muted-foreground">
          Configura el token en la sección de Integraciones
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div 
        ref={mapContainer} 
        className="rounded-lg overflow-hidden border"
        style={{ height }}
      />
      
      {!readonly && (
        <div className="flex gap-2">
          {isDrawing ? (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={confirmDrawing}
                disabled={drawnPoints.length < 3}
              >
                <Check className="w-4 h-4 mr-1" />
                Confirmar ({drawnPoints.length} puntos)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelDrawing}
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startDrawing}
              >
                <Pencil className="w-4 h-4 mr-1" />
                {polygon ? 'Redibujar zona' : 'Dibujar zona'}
              </Button>
              {polygon && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearPolygon}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Borrar zona
                </Button>
              )}
            </>
          )}
        </div>
      )}
      
      {isDrawing && (
        <p className="text-sm text-muted-foreground">
          Haz clic en el mapa para agregar puntos. Arrastra los puntos para ajustarlos.
        </p>
      )}
    </div>
  );
}
