import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FulfillmentType, Customer, Address, DeliveryZone, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeliveryZoneGrid } from './DeliveryZoneGrid';
import { useComunas } from '@/hooks/useComunas';
import { useCustomerAddresses } from '@/hooks/useCustomerAddresses';
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
}

interface FulfillmentStepProps {
  fulfillment: FulfillmentType;
  customer?: Partial<Customer>;
  initialDeliveryData?: DeliveryData | null;
  onFulfillmentChange: (fulfillment: FulfillmentType, deliveryFee?: number, deliveryZoneId?: string) => void;
  onDeliveryDataChange?: (data: DeliveryData) => void;
  onNext: () => void;
}

export default function FulfillmentStep({ fulfillment, customer, initialDeliveryData, onFulfillmentChange, onDeliveryDataChange, onNext }: FulfillmentStepProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  
  // Address fields
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [addressLine, setAddressLine] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [selectedComunaId, setSelectedComunaId] = useState('');
  const [reference, setReference] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  
  // Repartidor
  const [selectedRepartidorId, setSelectedRepartidorId] = useState('');
  const [repartidores, setRepartidores] = useState<User[]>([]);
  
  // Customer addresses
  const [customerAddresses, setCustomerAddresses] = useState<Address[]>([]);
  
  const { toast } = useToast();
  const { comunas, loading: comunasLoading } = useComunas();
  const { getCustomerAddresses } = useCustomerAddresses();
  
  // Use refs to avoid callback in dependency array
  const onDeliveryDataChangeRef = useRef(onDeliveryDataChange);
  onDeliveryDataChangeRef.current = onDeliveryDataChange;
  
  // Track if initial data has been applied
  const initialDataApplied = useRef(false);
  
  // Load repartidores
  useEffect(() => {
    loadRepartidores();
  }, []);
  
  // Restore initial delivery data ONLY once when component mounts with delivery mode
  useEffect(() => {
    if (initialDeliveryData && fulfillment === 'delivery' && !initialDataApplied.current) {
      initialDataApplied.current = true;
      if (initialDeliveryData.zone) {
        setSelectedZoneId(initialDeliveryData.zone.id);
        setSelectedZone(initialDeliveryData.zone);
        setDeliveryFee(initialDeliveryData.zone.delivery_fee);
      }
      setAddressLine(initialDeliveryData.addressLine || '');
      setAddressNumber(initialDeliveryData.addressNumber || '');
      setSelectedComunaId(initialDeliveryData.comunaId || '');
      setReference(initialDeliveryData.reference || '');
      setSelectedRepartidorId(initialDeliveryData.repartidorId || '');
      setSaveAddress(initialDeliveryData.saveAddress || false);
    }
  }, [initialDeliveryData, fulfillment]);
  
  // Load customer addresses
  useEffect(() => {
    if (customer?.id && fulfillment === 'delivery') {
      loadCustomerAddresses();
    }
  }, [customer?.id, fulfillment]);
  
  // Update delivery data when fields change - use ref to avoid callback loop
  useEffect(() => {
    if (fulfillment === 'delivery' && onDeliveryDataChangeRef.current) {
      const comunaName = comunas.find(c => c.id === selectedComunaId)?.name || '';
      const repartidorName = repartidores.find(r => r.id === selectedRepartidorId)?.full_name || '';
      
      onDeliveryDataChangeRef.current({
        zone: selectedZone,
        addressLine,
        addressNumber,
        comunaId: selectedComunaId,
        comunaName,
        reference,
        repartidorId: selectedRepartidorId,
        repartidorName,
        saveAddress
      });
    }
  }, [selectedZone, addressLine, addressNumber, selectedComunaId, reference, selectedRepartidorId, saveAddress, fulfillment, comunas, repartidores]);
  
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
      // Don't proceed to next step, wait for zone selection
      onFulfillmentChange(type);
    } else {
      onFulfillmentChange(type, 0);
      onNext();
    }
  };

  const handleZoneChange = useCallback((zoneId: string, fee: number, zone?: DeliveryZone) => {
    setSelectedZoneId(zoneId);
    setDeliveryFee(fee);
    
    if (zone) {
      setSelectedZone(zone);
    }
    
    onFulfillmentChange('delivery', fee, zoneId);
  }, [onFulfillmentChange]);
  
  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    
    if (addressId === 'new') {
      // Clear form
      setAddressLine('');
      setAddressNumber('');
      setSelectedComunaId('');
      setReference('');
      return;
    }
    
    const address = customerAddresses.find(a => a.id === addressId);
    if (address) {
      setAddressLine(address.calle);
      setAddressNumber(address.numero);
      setSelectedComunaId(address.comuna_id || '');
      setReference(address.observaciones || '');
    }
  };

  const handleContinue = () => {
    if (fulfillment === 'delivery') {
      if (!selectedZoneId) {
        toast({
          title: "Error",
          description: "Selecciona una zona de delivery",
          variant: "destructive"
        });
        return;
      }
      
      if (!addressLine.trim()) {
        toast({
          title: "Error",
          description: "Ingresa la dirección",
          variant: "destructive"
        });
        return;
      }
      
      if (!addressNumber.trim()) {
        toast({
          title: "Error",
          description: "Ingresa el número",
          variant: "destructive"
        });
        return;
      }
      
      if (!selectedComunaId) {
        toast({
          title: "Error",
          description: "Selecciona una comuna",
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

      {/* Delivery Zone Selection */}
      {fulfillment === 'delivery' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Zona de Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DeliveryZoneGrid
                selectedZoneId={selectedZoneId}
                onZoneChange={handleZoneChange}
              />
              
              {selectedZoneId && deliveryFee > 0 && (
                <div className="p-4 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Costo de delivery:</span>
                    <Badge variant="default">{formatPrice(deliveryFee)}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Form */}
          {selectedZoneId && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Dirección de Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {/* Address Form */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <Label>Dirección *</Label>
                      <Input 
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        placeholder="Calle, Avenida..."
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Label>Número *</Label>
                      <Input 
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Comuna *</Label>
                    <Select value={selectedComunaId} onValueChange={setSelectedComunaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar comuna" />
                      </SelectTrigger>
                      <SelectContent>
                        {comunas.filter(c => c.is_active).map(comuna => (
                          <SelectItem key={comuna.id} value={comuna.id}>
                            {comuna.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Referencia (opcional)</Label>
                    <Textarea 
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Depto, Torre, Color de casa..."
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
                </CardContent>
              </Card>

              {/* Repartidor Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Asignar Repartidor</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Continue Button */}
      {fulfillment === 'retiro' && (
        <Button onClick={handleContinue} className="w-full" size="lg">
          Continuar a Cliente
        </Button>
      )}
      
      {fulfillment === 'delivery' && selectedZoneId && addressLine && addressNumber && selectedComunaId && (
        <Button onClick={handleContinue} className="w-full" size="lg">
          Continuar a Cliente
        </Button>
      )}
    </div>
  );
}