import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FulfillmentType, Customer, Address, DeliveryZone, User, PickupMode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Truck, MapPin, Edit2, Check, AlertCircle, Loader2, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useComunas } from '@/hooks/useComunas';
import { useCustomerAddresses } from '@/hooks/useCustomerAddresses';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';
import { useDeliveryGeo, DeliveryZoneWithGeo } from '@/hooks/useDeliveryGeo';
import { AddressAutocomplete } from './AddressAutocomplete';
import { supabase } from '@/integrations/supabase/client';

export interface DeliveryData {
  zone: DeliveryZone | null;
  addressLine: string;
  addressNumber: string;
  comunaId: string;
  comunaName: string;
  reference: string;
  repartidorId: string;
  repartidorName: string;
  saveAddress: boolean;
  coordinates?: { lat: number; lng: number };
  distance?: number;
  calculatedFee?: number;
}

interface FulfillmentStepProps {
  fulfillment: FulfillmentType;
  pickupMode?: PickupMode;
  customer?: Partial<Customer>;
  initialDeliveryData?: DeliveryData | null;
  onFulfillmentChange: (fulfillment: FulfillmentType, deliveryFee?: number, deliveryZoneId?: string) => void;
  onPickupModeChange?: (mode: PickupMode) => void;
  onDeliveryDataChange?: (data: DeliveryData) => void;
  onNext: () => void;
}

export default function FulfillmentStep({ fulfillment, pickupMode, customer, initialDeliveryData, onFulfillmentChange, onPickupModeChange, onDeliveryDataChange, onNext }: FulfillmentStepProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [manualFee, setManualFee] = useState<string>('');
  
  // Address fields
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [fullAddress, setFullAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [selectedComunaId, setSelectedComunaId] = useState('');
  const [reference, setReference] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  
  // Geo data
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  
  // Exception mode for addresses outside coverage zone
  const [isExceptionMode, setIsExceptionMode] = useState(false);
  const [exceptionAddress, setExceptionAddress] = useState('');
  const [exceptionFee, setExceptionFee] = useState('');
  
  // Store location
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Repartidor
  const [selectedRepartidorId, setSelectedRepartidorId] = useState('');
  const [repartidores, setRepartidores] = useState<User[]>([]);
  
  // Customer addresses
  const [customerAddresses, setCustomerAddresses] = useState<Address[]>([]);
  
  const { toast } = useToast();
  const { comunas } = useComunas();
  const { getCustomerAddresses } = useCustomerAddresses();
  const { zones } = useDeliveryZones();
  const { findZoneByCoordinates, calculateDistance, calculateDeliveryFee } = useDeliveryGeo();
  
  // Use refs to avoid callback in dependency array
  const onDeliveryDataChangeRef = useRef(onDeliveryDataChange);
  onDeliveryDataChangeRef.current = onDeliveryDataChange;
  
  // Track if initial data has been applied
  const initialDataApplied = useRef(false);
  
  // Load repartidores and store location
  useEffect(() => {
    loadRepartidores();
    loadStoreLocation();
  }, []);
  
  const loadStoreLocation = async () => {
    try {
      const { data } = await supabase
        .from('delivery_settings')
        .select('store_lat, store_lng')
        .single();
      
      if (data?.store_lat && data?.store_lng) {
        setStoreLocation({ lat: data.store_lat, lng: data.store_lng });
      }
    } catch (error) {
      console.error('Error loading store location:', error);
    }
  };
  
  // Restore initial delivery data ONLY once when component mounts with delivery mode
  useEffect(() => {
    if (initialDeliveryData && fulfillment === 'delivery' && !initialDataApplied.current) {
      initialDataApplied.current = true;
      if (initialDeliveryData.zone) {
        setSelectedZoneId(initialDeliveryData.zone.id);
        setSelectedZone(initialDeliveryData.zone);
        setDeliveryFee(initialDeliveryData.zone.delivery_fee);
      }
      setFullAddress(initialDeliveryData.addressLine || '');
      setAddressNumber(initialDeliveryData.addressNumber || '');
      setSelectedComunaId(initialDeliveryData.comunaId || '');
      setReference(initialDeliveryData.reference || '');
      setSelectedRepartidorId(initialDeliveryData.repartidorId || '');
      setSaveAddress(initialDeliveryData.saveAddress || false);
      if (initialDeliveryData.coordinates) {
        setCoordinates(initialDeliveryData.coordinates);
      }
      if (initialDeliveryData.distance) {
        setDistance(initialDeliveryData.distance);
      }
      if (initialDeliveryData.calculatedFee) {
        setDeliveryFee(initialDeliveryData.calculatedFee);
      }
    }
  }, [initialDeliveryData, fulfillment]);
  
  // Load customer addresses when customer changes
  useEffect(() => {
    if (customer?.id && fulfillment === 'delivery') {
      loadCustomerAddresses();
    } else if (!customer?.id) {
      setCustomerAddresses([]);
      setSelectedAddressId('');
    }
  }, [customer?.id, fulfillment]);
  
  // Update delivery data when fields change - use ref to avoid callback loop
  useEffect(() => {
    if (fulfillment === 'delivery' && onDeliveryDataChangeRef.current) {
      const comunaName = comunas.find(c => c.id === selectedComunaId)?.name || '';
      const repartidorName = repartidores.find(r => r.id === selectedRepartidorId)?.full_name || '';
      
      onDeliveryDataChangeRef.current({
        zone: selectedZone,
        addressLine: fullAddress,
        addressNumber,
        comunaId: selectedComunaId,
        comunaName,
        reference,
        repartidorId: selectedRepartidorId,
        repartidorName,
        saveAddress,
        coordinates: coordinates || undefined,
        distance: distance || undefined,
        calculatedFee: deliveryFee
      });
    }
  }, [selectedZone, fullAddress, addressNumber, selectedComunaId, reference, selectedRepartidorId, saveAddress, fulfillment, comunas, repartidores, coordinates, distance, deliveryFee]);
  
  const loadRepartidores = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, username, role, active, created_at, updated_at, can_do_delivery')
        .eq('can_do_delivery', true)
        .eq('active', true)
        .order('full_name');
      
      if (error) throw error;
      setRepartidores((data || []).map(u => ({
        ...u,
        role: u.role as any
      })));
    } catch (error) {
      console.error('Error loading repartidores:', error);
    }
  };
  
  const loadCustomerAddresses = async () => {
    if (!customer?.id) return;
    
    try {
      const addresses = await getCustomerAddresses(customer.id);
      setCustomerAddresses(addresses);
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleFulfillmentSelect = (type: FulfillmentType) => {
    if (type === 'delivery') {
      onFulfillmentChange(type);
    } else {
      onFulfillmentChange(type, 0);
      // Don't auto-advance for retiro - let user select pickup mode first
    }
  };

  const handlePickupModeSelect = (mode: PickupMode) => {
    // Call pickup mode change - parent will handle advancing to next step
    onPickupModeChange?.(mode);
  };

  // Handle address selection from autocomplete
  const handleAddressSelect = useCallback(async (result: { address: string; coordinates: { lat: number; lng: number }; comuna?: string }) => {
    setFullAddress(result.address);
    setCoordinates(result.coordinates);
    setZoneError(null);
    setIsCalculating(true);
    
    try {
      // Convert zones to DeliveryZoneWithGeo format
      const zonesWithGeo: DeliveryZoneWithGeo[] = zones
        .filter(z => z.active)
        .map(z => ({
          id: z.id,
          name: z.name,
          delivery_fee: z.delivery_fee,
          polygon: z.polygon,
          price_per_km: z.price_per_km || 1000,
          min_fee: z.min_fee || 2000,
          calculation_mode: (z.calculation_mode || 'fixed') as 'fixed' | 'distance',
          active: z.active
        }));
      
      // Find zone by coordinates
      const detectedZone = findZoneByCoordinates(result.coordinates, zonesWithGeo);
      
      if (!detectedZone) {
        setZoneError('La dirección está fuera de las zonas de cobertura');
        setSelectedZoneId('');
        setSelectedZone(null);
        setDeliveryFee(0);
        setDistance(null);
        return;
      }
      
      // Calculate distance if store location is available
      let distanceKm: number | null = null;
      if (storeLocation) {
        distanceKm = calculateDistance(storeLocation, result.coordinates);
        setDistance(distanceKm);
      }
      
      // Calculate fee
      const fee = distanceKm !== null 
        ? calculateDeliveryFee(detectedZone, distanceKm)
        : detectedZone.delivery_fee;
      
      // Update state
      setSelectedZoneId(detectedZone.id);
      setSelectedZone({
        id: detectedZone.id,
        name: detectedZone.name,
        delivery_fee: fee,
        active: detectedZone.active,
        polygon: detectedZone.polygon,
        price_per_km: detectedZone.price_per_km,
        min_fee: detectedZone.min_fee,
        calculation_mode: detectedZone.calculation_mode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setDeliveryFee(fee);
      
      // Update fulfillment with fee
      onFulfillmentChange('delivery', fee, detectedZone.id);
      
      // Try to set comuna from result
      if (result.comuna) {
        const matchingComuna = comunas.find(c => 
          c.name.toLowerCase().includes(result.comuna?.toLowerCase() || '') ||
          result.comuna?.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchingComuna) {
          setSelectedComunaId(matchingComuna.id);
        }
      }
    } catch (error) {
      console.error('Error calculating delivery:', error);
      setZoneError('Error al calcular la zona de delivery');
    } finally {
      setIsCalculating(false);
    }
  }, [zones, storeLocation, findZoneByCoordinates, calculateDistance, calculateDeliveryFee, onFulfillmentChange, comunas]);
  
  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    
    if (addressId === 'new') {
      setFullAddress('');
      setAddressNumber('');
      setSelectedComunaId('');
      setReference('');
      setCoordinates(null);
      setDistance(null);
      setSelectedZoneId('');
      setSelectedZone(null);
      setDeliveryFee(0);
      setZoneError(null);
      return;
    }
    
    const address = customerAddresses.find(a => a.id === addressId);
    if (address) {
      const fullAddr = `${address.calle} ${address.numero}, ${address.comuna}`;
      setFullAddress(fullAddr);
      setAddressNumber(address.numero);
      setSelectedComunaId(address.comuna_id || '');
      setReference(address.observaciones || '');
      
      // Trigger geocoding for saved address
      handleAddressSelect({
        address: fullAddr,
        coordinates: { lat: -33.4569, lng: -70.6483 },
        comuna: address.comuna
      });
    }
  };

  const handleEditFee = () => {
    setManualFee(deliveryFee.toString());
    setIsEditingFee(true);
  };

  const handleSaveFee = () => {
    const newFee = parseInt(manualFee) || 0;
    setDeliveryFee(newFee);
    setIsEditingFee(false);
    onFulfillmentChange('delivery', newFee, selectedZoneId);
  };

  const handleContinue = () => {
    if (fulfillment === 'delivery') {
      // Exception mode - use manual address and fee
      if (isExceptionMode) {
        if (!exceptionAddress.trim()) {
          toast({
            title: "Error",
            description: "Ingresa la dirección de excepción",
            variant: "destructive"
          });
          return;
        }
        if (!exceptionFee || parseInt(exceptionFee) <= 0) {
          toast({
            title: "Error",
            description: "Ingresa el costo de delivery para la excepción",
            variant: "destructive"
          });
          return;
        }
        // Update fee and address for exception
        const fee = parseInt(exceptionFee);
        setFullAddress(exceptionAddress);
        setDeliveryFee(fee);
        onFulfillmentChange('delivery', fee, undefined);
        onNext();
        return;
      }
      
      // Normal mode
      if (!fullAddress.trim()) {
        toast({
          title: "Error",
          description: "Ingresa la dirección de entrega",
          variant: "destructive"
        });
        return;
      }
      
      if (zoneError && !isExceptionMode) {
        toast({
          title: "Error",
          description: zoneError,
          variant: "destructive"
        });
        return;
      }
    }
    
    onNext();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modalidad de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Retiro */}
            <Button
              variant={fulfillment === 'retiro' ? 'default' : 'outline'}
              className="h-24 flex flex-col gap-2"
              onClick={() => handleFulfillmentSelect('retiro')}
            >
              <Store className="w-8 h-8" />
              <div className="text-center">
                <div className="font-medium">Retiro</div>
                <div className="text-sm opacity-80">En local</div>
              </div>
            </Button>

            {/* Delivery */}
            <Button
              variant={fulfillment === 'delivery' ? 'default' : 'outline'}
              className="h-24 flex flex-col gap-2"
              onClick={() => handleFulfillmentSelect('delivery')}
            >
              <Truck className="w-8 h-8" />
              <div className="text-center">
                <div className="font-medium">Delivery</div>
                <div className="text-sm opacity-80">A domicilio</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pickup Mode Selection - Only show when retiro is selected */}
      {fulfillment === 'retiro' && (
        <Card>
          <CardHeader>
            <CardTitle>¿Para servir o para llevar?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={pickupMode === 'servir' ? 'default' : 'outline'}
                className="h-24 flex flex-col gap-2"
                onClick={() => handlePickupModeSelect('servir')}
              >
                <UtensilsCrossed className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-medium">Para Servir</div>
                  <div className="text-sm opacity-80">Comer en local</div>
                </div>
              </Button>

              <Button
                variant={pickupMode === 'llevar' ? 'default' : 'outline'}
                className="h-24 flex flex-col gap-2"
                onClick={() => handlePickupModeSelect('llevar')}
              >
                <ShoppingBag className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-medium">Para Llevar</div>
                  <div className="text-sm opacity-80">Take away</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Address Section */}
      {fulfillment === 'delivery' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Dirección de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Two-column layout: Form on left, Map on right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <div className="space-y-4">
                  {/* Saved Addresses Selector */}
                  {customer?.id && customerAddresses.length > 0 && (
                    <div>
                      <Label>Direcciones guardadas</Label>
                      <Select value={selectedAddressId} onValueChange={handleSelectSavedAddress}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar dirección guardada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">+ Nueva dirección</SelectItem>
                          {customerAddresses.map(addr => (
                            <SelectItem key={addr.id} value={addr.id}>
                              {addr.calle} {addr.numero}, {addr.comuna}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Address Autocomplete */}
                  <div>
                    <Label>Buscar dirección *</Label>
                    <AddressAutocomplete
                      value={fullAddress}
                      onChange={setFullAddress}
                      onSelect={handleAddressSelect}
                      placeholder="Escribe la dirección completa..."
                    />
                  </div>
                  
                  {/* Calculating indicator */}
                  {isCalculating && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Calculando zona y tarifa...</span>
                    </div>
                  )}
                  
                  {/* Zone Error with Exception Option */}
                  {zoneError && !isExceptionMode && (
                    <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5 space-y-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        <span>{zoneError}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsExceptionMode(true);
                          setExceptionAddress(fullAddress);
                        }}
                      >
                        Agregar como excepción
                      </Button>
                    </div>
                  )}
                  
                  {/* Exception Mode Form */}
                  {isExceptionMode && (
                    <div className="p-4 border border-amber-400 rounded-lg bg-amber-50 dark:bg-amber-950/20 space-y-4">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
                        <AlertCircle className="w-5 h-5" />
                        Pedido con excepción de zona
                      </div>
                      
                      <div>
                        <Label>Dirección completa *</Label>
                        <Input 
                          value={exceptionAddress}
                          onChange={(e) => setExceptionAddress(e.target.value)}
                          placeholder="Ingresa la dirección manualmente"
                        />
                      </div>
                      
                      <div>
                        <Label>Costo de delivery (manual) *</Label>
                        <Input
                          type="number"
                          value={exceptionFee}
                          onChange={(e) => setExceptionFee(e.target.value)}
                          placeholder="Ej: 5000"
                        />
                      </div>
                      
                      {/* Repartidor en excepción */}
                      <div>
                        <Label>Repartidor (opcional)</Label>
                        <Select value={selectedRepartidorId} onValueChange={setSelectedRepartidorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {repartidores.map(rep => (
                              <SelectItem key={rep.id} value={rep.id}>
                                {rep.full_name || rep.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setIsExceptionMode(false);
                          setExceptionAddress('');
                          setExceptionFee('');
                        }}
                      >
                        Cancelar excepción
                      </Button>
                    </div>
                  )}
                  
                  {/* Delivery Fee Display */}
                  {selectedZone && !zoneError && (
                    <div className="p-4 border rounded-lg bg-primary/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-muted-foreground">Zona detectada:</span>
                          <Badge variant="secondary" className="ml-2">{selectedZone.name}</Badge>
                        </div>
                      </div>
                      
                      {distance !== null && (
                        <div className="text-sm text-muted-foreground">
                          Distancia: {distance.toFixed(1)} km
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Costo de delivery:</span>
                        <div className="flex items-center gap-2">
                          {isEditingFee ? (
                            <>
                              <Input
                                type="number"
                                value={manualFee}
                                onChange={(e) => setManualFee(e.target.value)}
                                className="w-24 h-8"
                              />
                              <Button size="sm" variant="ghost" onClick={handleSaveFee}>
                                <Check className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="default" className="text-base">
                                {formatPrice(deliveryFee)}
                              </Badge>
                              <Button size="sm" variant="ghost" onClick={handleEditFee}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional fields - No comuna field */}
                  {selectedZone && (
                    <div className="space-y-4 pt-4 border-t">
                      <div>
                        <Label>Número / Depto</Label>
                        <Input 
                          value={addressNumber}
                          onChange={(e) => setAddressNumber(e.target.value)}
                          placeholder="123, Depto 45..."
                        />
                      </div>

                      <div>
                        <Label>Referencia (opcional)</Label>
                        <Textarea 
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="Torre, color de casa, referencias..."
                          rows={2}
                        />
                      </div>

                      {/* Save Address Checkbox */}
                      {customer?.id && (
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="save-address"
                            checked={saveAddress}
                            onCheckedChange={(checked) => setSaveAddress(checked as boolean)}
                          />
                          <Label htmlFor="save-address" className="cursor-pointer">
                            Guardar en la ficha del cliente
                          </Label>
                        </div>
                      )}

                      {/* Repartidor Selection - now inside form column */}
                      <div className="pt-4 border-t">
                        <Label>Repartidor (opcional)</Label>
                        <Select value={selectedRepartidorId} onValueChange={setSelectedRepartidorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {repartidores.map(rep => (
                              <SelectItem key={rep.id} value={rep.id}>
                                {rep.full_name || rep.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Map Preview */}
                <div className="lg:sticky lg:top-4">
                  {coordinates ? (
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                      <div className="aspect-square lg:aspect-[4/3]">
                        <DeliveryMapPreview 
                          coordinates={coordinates}
                          storeLocation={storeLocation}
                          zoneName={selectedZone?.name}
                        />
                      </div>
                      <div className="p-3 bg-background border-t">
                        <p className="text-sm font-medium truncate">{fullAddress}</p>
                        {selectedZone && (
                          <p className="text-xs text-muted-foreground">
                            Zona: {selectedZone.name} • {distance?.toFixed(1)} km
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg bg-muted/30 aspect-square lg:aspect-[4/3] flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Ingresa una dirección para ver el mapa</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Continue Button - only one, no duplicate */}
      {fulfillment === 'delivery' && ((selectedZone && fullAddress) || isExceptionMode) && (
        <Button onClick={handleContinue} className="w-full" size="lg">
          Continuar a Cliente
        </Button>
      )}
    </div>
  );
}

// Map Preview Component
function DeliveryMapPreview({ 
  coordinates, 
  storeLocation, 
  zoneName 
}: { 
  coordinates: { lat: number; lng: number }; 
  storeLocation: { lat: number; lng: number } | null;
  zoneName?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      const { data } = await supabase
        .from('delivery_settings')
        .select('mapbox_token')
        .single();
      if (data?.mapbox_token) {
        setMapboxToken(data.mapbox_token);
      }
    };
    fetchToken();
  }, []);

  // Initialize and update map when token or coordinates change
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return;

    // Remove existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Dynamically import mapbox
    import('mapbox-gl').then((mapboxgl) => {
      if (!mapContainerRef.current) return;
      
      mapboxgl.default.accessToken = mapboxToken;
      
      const map = new mapboxgl.default.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [coordinates.lng, coordinates.lat],
        zoom: 14,
        interactive: false
      });

      mapRef.current = map;

      map.on('load', () => {
        // Add destination marker (red)
        new mapboxgl.default.Marker({ color: '#ef4444' })
          .setLngLat([coordinates.lng, coordinates.lat])
          .addTo(map);

        // Add store marker (green) if available
        if (storeLocation) {
          new mapboxgl.default.Marker({ color: '#22c55e' })
            .setLngLat([storeLocation.lng, storeLocation.lat])
            .addTo(map);

          // Fit bounds to show both markers
          const bounds = new mapboxgl.default.LngLatBounds()
            .extend([coordinates.lng, coordinates.lat])
            .extend([storeLocation.lng, storeLocation.lat]);
          
          map.fitBounds(bounds, { padding: 50 });
        }
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxToken, coordinates.lat, coordinates.lng, storeLocation]);

  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
