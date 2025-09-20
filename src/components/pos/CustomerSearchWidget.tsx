import React, { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import RunasCalculator from './RunasCalculator';

interface CustomerSearchWidgetProps {
  customer: Partial<Customer>;
  onCustomerChange: (customer: Partial<Customer>) => void;
  totalAmount: number;
  runaValue: number;
  onRunasChange?: (runas: number) => void;
  usedRunas: number;
}

export default function CustomerSearchWidget({ 
  customer, 
  onCustomerChange, 
  totalAmount, 
  runaValue,
  onRunasChange,
  usedRunas = 0
}: CustomerSearchWidgetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchCustomers();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchCustomers = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,rut.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
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

  const handleRunasUse = (runas: number) => {
    if (onRunasChange) {
      onRunasChange(runas);
    }
  };

  const maxRunasToUse = Math.min(
    customer.cantidad_runas || 0,
    Math.floor(totalAmount / runaValue)
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          Cliente (opcional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por RUT, correo o teléfono..."
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
                    {result.email && ` • ${result.email}`}
                  </div>
                </div>
                {result.cantidad_runas && result.cantidad_runas > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    <Coins className="w-3 h-3 mr-1" />
                    {formatRunas(result.cantidad_runas)} Runas
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Customer Button */}
        {searchTerm.length >= 3 && searchResults.length === 0 && !isSearching && (
          <div className="text-center p-4 border rounded-lg bg-muted/5">
            <p className="text-muted-foreground mb-2">No se encontraron clientes</p>
            <Button onClick={handleNewCustomer} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Crear cliente
            </Button>
          </div>
        )}

        {/* New Customer Form */}
        {showNewCustomerForm && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/5">
            <h4 className="font-medium">Nuevo Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Nombre *"
                value={customer.name || ''}
                onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
              />
              <Input
                placeholder="Apellido"
                value={customer.apellido || ''}
                onChange={(e) => onCustomerChange({ ...customer, apellido: e.target.value })}
              />
              <Input
                placeholder="Teléfono"
                value={customer.phone || ''}
                onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
              />
              <Input
                placeholder="RUT (opcional)"
                value={customer.rut || ''}
                onChange={(e) => onCustomerChange({ ...customer, rut: e.target.value })}
              />
              <Input
                placeholder="Email (opcional)"
                value={customer.email || ''}
                onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
                className="md:col-span-2"
              />
            </div>
          </div>
        )}

        {/* Selected Customer & Runas */}
        {customer.id && (
          <div className="space-y-4">
            {/* Customer Info */}
            <div className="border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{customer.name} {customer.apellido}</h4>
                  <p className="text-sm text-muted-foreground">
                    {customer.phone} • {customer.rut}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onCustomerChange({});
                    setSearchTerm('');
                    setShowNewCustomerForm(false);
                    if (onRunasChange) onRunasChange(0);
                  }}
                >
                  Cambiar
                </Button>
              </div>
            </div>

            {/* Runas System */}
            <div className="space-y-4">
              <RunasCalculator
                totalAmount={totalAmount}
                runaValue={runaValue}
                customerRunas={customer.cantidad_runas}
              />
              
              {/* Runas Usage Control */}
              {maxRunasToUse > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    Canje de Runas
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-sm text-muted-foreground">
                        Runas a usar (máx. {formatRunas(maxRunasToUse)})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={maxRunasToUse}
                        value={usedRunas}
                        onChange={(e) => handleRunasUse(Math.min(maxRunasToUse, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="mt-1"
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Descuento</div>
                      <div className="font-medium text-primary">
                        {formatPrice(usedRunas * runaValue)}
                      </div>
                    </div>
                  </div>
                  {usedRunas > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Quedarás con {formatRunas((customer.cantidad_runas || 0) - usedRunas)} Runas después de este canje
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}