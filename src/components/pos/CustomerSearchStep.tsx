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

interface CustomerSearchStepProps {
  customer: Partial<Customer>;
  onCustomerChange: (customer: Partial<Customer>) => void;
  onNext: () => void;
}

export default function CustomerSearchStep({ customer, onCustomerChange, onNext }: CustomerSearchStepProps) {
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
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,rut.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      toast({
        title: "Error",
        description: "No se pudieron buscar clientes",
        variant: "destructive"
      });
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
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nombre, RUT o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                      {result.name} {result.apellido}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.phone && `📞 ${result.phone}`}
                      {result.rut && ` • RUT: ${result.rut}`}
                    </div>
                  </div>
                  {result.cantidad_runas && result.cantidad_runas > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {formatRunas(result.cantidad_runas)} Runas
                      <span className="text-xs ml-1">
                        ({formatPrice((result.cantidad_runas || 0) * runaValue)})
                      </span>
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
                    value={customer.name || ''}
                    onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={customer.apellido || ''}
                    onChange={(e) => onCustomerChange({ ...customer, apellido: e.target.value })}
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
                  <Label htmlFor="rut">RUT (opcional)</Label>
                  <Input
                    id="rut"
                    value={customer.rut || ''}
                    onChange={(e) => onCustomerChange({ ...customer, rut: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selected Customer Info */}
          {customer.id && (
            <div className="border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{customer.name} {customer.apellido}</h4>
                  <p className="text-sm text-muted-foreground">
                    {customer.phone} • {customer.rut}
                  </p>
                </div>
                {customer.cantidad_runas && customer.cantidad_runas > 0 && (
                  <Badge variant="default">
                    {formatRunas(customer.cantidad_runas)} Runas disponibles
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Continue Button */}
          {(customer.name || customer.id) && (
            <Button onClick={onNext} className="w-full" size="lg">
              Continuar
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}