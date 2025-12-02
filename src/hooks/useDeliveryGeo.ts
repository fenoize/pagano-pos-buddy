import { useState, useCallback } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import distance from '@turf/distance';
import { point, polygon as turfPolygon } from '@turf/helpers';
import { supabase } from '@/integrations/supabase/client';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodingResult {
  address: string;
  coordinates: Coordinates;
  comuna?: string;
}

export interface DeliveryZoneWithGeo {
  id: string;
  name: string;
  delivery_fee: number;
  polygon: any;
  price_per_km: number;
  min_fee: number;
  calculation_mode: 'fixed' | 'distance';
  active: boolean;
}

export const useDeliveryGeo = () => {
  const [loading, setLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token from settings
  const fetchMapboxToken = useCallback(async (): Promise<string | null> => {
    if (mapboxToken) return mapboxToken;

    try {
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('mapbox_token')
        .single();

      if (error) throw error;
      
      const token = data?.mapbox_token || null;
      setMapboxToken(token);
      return token;
    } catch (error) {
      console.error('Error fetching mapbox token:', error);
      return null;
    }
  }, [mapboxToken]);

  // Geocode an address to coordinates
  const geocodeAddress = useCallback(async (address: string): Promise<GeocodingResult | null> => {
    setLoading(true);
    try {
      const token = await fetchMapboxToken();
      if (!token) {
        console.error('Mapbox token not configured');
        return null;
      }

      const encodedAddress = encodeURIComponent(`${address}, Santiago, Chile`);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&country=cl&limit=1`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        
        // Extract comuna from context
        const comunaContext = feature.context?.find((c: any) => 
          c.id.startsWith('locality') || c.id.startsWith('place')
        );

        return {
          address: feature.place_name,
          coordinates: { lat, lng },
          comuna: comunaContext?.text
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMapboxToken]);

  // Search for address suggestions
  const searchAddresses = useCallback(async (query: string): Promise<GeocodingResult[]> => {
    if (!query || query.length < 3) return [];

    try {
      const token = await fetchMapboxToken();
      if (!token) return [];

      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&country=cl&types=address,poi&limit=5&proximity=-70.6483,-33.4569`
      );

      if (!response.ok) return [];

      const data = await response.json();
      
      return data.features?.map((feature: any) => {
        const [lng, lat] = feature.center;
        const comunaContext = feature.context?.find((c: any) => 
          c.id.startsWith('locality') || c.id.startsWith('place')
        );

        return {
          address: feature.place_name,
          coordinates: { lat, lng },
          comuna: comunaContext?.text
        };
      }) || [];
    } catch (error) {
      console.error('Error searching addresses:', error);
      return [];
    }
  }, [fetchMapboxToken]);

  // Find which zone contains the given coordinates
  const findZoneByCoordinates = useCallback((
    coordinates: Coordinates,
    zones: DeliveryZoneWithGeo[]
  ): DeliveryZoneWithGeo | null => {
    const pt = point([coordinates.lng, coordinates.lat]);

    for (const zone of zones) {
      if (!zone.polygon || !zone.active) continue;

      try {
        // Ensure polygon is in correct GeoJSON format
        let polygonCoords = zone.polygon;
        
        // If polygon is stored as array of coordinates (not GeoJSON object)
        if (Array.isArray(polygonCoords)) {
          polygonCoords = {
            type: 'Polygon',
            coordinates: [polygonCoords]
          };
        }

        // Handle GeoJSON format
        const coords = polygonCoords.coordinates || [polygonCoords];
        const poly = turfPolygon(coords);
        
        if (booleanPointInPolygon(pt, poly)) {
          return zone;
        }
      } catch (error) {
        console.error(`Error checking zone ${zone.name}:`, error);
      }
    }

    return null;
  }, []);

  // Calculate distance between two points in kilometers
  const calculateDistance = useCallback((
    origin: Coordinates,
    destination: Coordinates
  ): number => {
    const from = point([origin.lng, origin.lat]);
    const to = point([destination.lng, destination.lat]);
    
    return distance(from, to, { units: 'kilometers' });
  }, []);

  // Calculate delivery fee based on zone settings and distance
  const calculateDeliveryFee = useCallback((
    zone: DeliveryZoneWithGeo,
    distanceKm: number
  ): number => {
    if (zone.calculation_mode === 'fixed') {
      return zone.delivery_fee;
    }

    // Distance-based calculation
    const calculatedFee = Math.round(distanceKm * zone.price_per_km);
    return Math.max(zone.min_fee, calculatedFee);
  }, []);

  // Get complete delivery calculation
  const calculateDelivery = useCallback(async (
    address: string,
    storeCoordinates: Coordinates | null,
    zones: DeliveryZoneWithGeo[]
  ): Promise<{
    geocoded: GeocodingResult | null;
    zone: DeliveryZoneWithGeo | null;
    distance: number | null;
    fee: number | null;
  }> => {
    // Geocode the address
    const geocoded = await geocodeAddress(address);
    
    if (!geocoded) {
      return { geocoded: null, zone: null, distance: null, fee: null };
    }

    // Find matching zone
    const zone = findZoneByCoordinates(geocoded.coordinates, zones);
    
    if (!zone) {
      return { geocoded, zone: null, distance: null, fee: null };
    }

    // Calculate distance if store coordinates are available
    let distanceKm: number | null = null;
    if (storeCoordinates) {
      distanceKm = calculateDistance(storeCoordinates, geocoded.coordinates);
    }

    // Calculate fee
    const fee = distanceKm !== null 
      ? calculateDeliveryFee(zone, distanceKm)
      : zone.delivery_fee;

    return {
      geocoded,
      zone,
      distance: distanceKm,
      fee
    };
  }, [geocodeAddress, findZoneByCoordinates, calculateDistance, calculateDeliveryFee]);

  return {
    loading,
    geocodeAddress,
    searchAddresses,
    findZoneByCoordinates,
    calculateDistance,
    calculateDeliveryFee,
    calculateDelivery,
    fetchMapboxToken
  };
};
