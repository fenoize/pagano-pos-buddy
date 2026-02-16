import React, { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';

interface CustomerSearchStepProps {
  customer: Partial<Customer>;
  onCustomerChange: (customer: Partial<Customer>) => void;
  orderName: string;
  onOrderNameChange: (name: string) => void;
  onNext: () => void;
}

export default function CustomerSearchStep({ customer, onCustomerChange, orderName, onOrderNameChange, onNext }: CustomerSearchStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [runaValue, setRunaValue] = useState(1000);
  const { toast } = useToast();

  useEffect(() => {
    fetchRunaValue();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchCustomers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const fetchRunaValue = async () => {
    try {
      const { data } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'runa_value')
        .single();
      
      if (data) {
        setRunaValue(data.value as number);
      }
    } catch (error) {
      console.error('Error fetching runa value:', error);
    }
  };

  const searchCustomers = async () => {
    setIsSearching(true);
    try {
      // Obtener token de sesión
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // Construir URL de Edge Function
      const supabaseUrl = 'https://lxxfhayifyiioglfbsyj.supabase.co';
      
      // Llamar Edge Function con búsqueda
      const params = new URLSearchParams({
        q: searchTerm,
        limit: '5',
        offset: '0',
      });

      const response = await fetch(
        `${supabaseUrl}/functions/v1/staff-list-customers?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido/expirado - forzar logout
          clearStaffStorage();
          window.location.href = '/pos/login';
          return;
        }
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      setSearchResults(result.data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron buscar clientes",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCustomer = (selectedCustomer: Customer) => {
    onCustomerChange(selectedCustomer);
    setSearchTerm(`${selectedCustomer.name} ${selectedCustomer.apellido || ''}`.trim());
    setSearchResults([]);
    setShowNewCustomerForm(false);
  };

  const handleNewCustomer = () => {
    setShowNewCustomerForm(true);
    setSearchResults([]);
  };

  const formatRunas = (runas: number) => {
    return new Intl.NumberFormat('es-CL').format(runas);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Name Field */}
          <div>
            <Label htmlFor="order-name">Nombre del pedido</Label>
            <Input
              id="order-name"
              placeholder="Ej: Mesa 5, Pedido Juan, etc."
              value={orderName}
              onChange={(e) => onOrderNameChange(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este nombre aparecerá en la cocina y en los tickets
            </p>
          </div>

          {/* Cliente section - conditional */}
          {customer.id ? (
            <div className="border rounded-lg p-4 bg-primary/5">
              <Label className="text-xs text-muted-foreground mb-2 block">Cliente asociado</Label>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{customer.nombres || customer.name} {customer.apellidos || customer.apellido}</h4>
                  <p className="text-sm text-muted-foreground">
                    {[customer.phone, customer.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {customer.cantidad_runas != null && customer.cantidad_runas > 0 && (
                  <Badge variant="default">
                    {formatRunas(customer.cantidad_runas)} Runas disponibles
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onCustomerChange({});
                    setSearchTerm('');
                  }}
                >
                  Quitar cliente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onCustomerChange({});
                    setSearchTerm('');
                    setShowNewCustomerForm(false);
                  }}
                >
                  Cambiar cliente
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label>Cliente (opcional)</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente por nombre o teléfono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 border rounded-lg p-2 bg-muted/5">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 bg-background rounded border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => selectCustomer(result)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {result.nombres || result.name} {result.apellidos || result.apellido}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {[result.phone, result.email].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {result.cantidad_runas != null && result.cantidad_runas > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {formatRunas(result.cantidad_runas)} Runas
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No Results */}
              {searchTerm.length >= 3 && searchResults.length === 0 && !isSearching && (
                <div className="text-center p-4 border rounded-lg bg-muted/5">
                  <p className="text-muted-foreground mb-2">No se encontraron clientes</p>
                  <Button onClick={handleNewCustomer} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear nuevo cliente
                  </Button>
                </div>
              )}

              {/* New Customer Form */}
              {showNewCustomerForm && (
                <div className="space-y-3 border rounded-lg p-4 bg-muted/5">
                  <h4 className="font-medium">Nuevo Cliente</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={customer.nombres || customer.name || ''}
                        onChange={(e) => onCustomerChange({ ...customer, nombres: e.target.value, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="apellido">Apellido</Label>
                      <Input
                        id="apellido"
                        value={customer.apellidos || customer.apellido || ''}
                        onChange={(e) => onCustomerChange({ ...customer, apellidos: e.target.value, apellido: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={customer.phone || ''}
                        onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email (opcional)</Label>
                      <Input
                        id="email"
                        value={customer.email || ''}
                        onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Continue Button */}
          <Button onClick={onNext} className="w-full" size="lg">
            Ir al Pago
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}