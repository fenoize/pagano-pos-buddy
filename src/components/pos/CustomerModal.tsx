import React, { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import RunasCalculator from './RunasCalculator';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Partial<Customer>;
  onCustomerChange: (customer: Partial<Customer>) => void;
  totalAmount: number;
  runaValue: number;
  runaRewardValue: number;
  onRunasChange?: (runas: number) => void;
  usedRunas: number;
}

export function CustomerModal({ 
  isOpen,
  onClose,
  customer, 
  onCustomerChange, 
  totalAmount, 
  runaValue,
  runaRewardValue,
  onRunasChange,
  usedRunas = 0
}: CustomerModalProps) {
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
      // Obtener token de sesión
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // Construir URL de Edge Function
      const supabaseUrl = (supabase as any).supabaseUrl || 'https://lxxfhayifyiioglfbsyj.supabase.co';
      
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
    const displayName = getDisplayName(selectedCustomer);
    setSearchTerm(displayName);
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
    Math.floor(totalAmount / runaRewardValue)
  );

  // Helper para obtener nombre completo
  const getDisplayName = (c: Customer | Partial<Customer>) => {
    const nombre = c.nombres || c.name || '';
    const apellido = c.apellidos || c.apellido || '';
    return `${nombre} ${apellido}`.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Cliente (opcional)
          </DialogTitle>
          <DialogDescription>
            Busca un cliente existente o crea uno nuevo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por correo o teléfono..."
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
                      {getDisplayName(result)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.phone && `📞 ${result.phone}`}
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

          {/* New Customer Form - sin RUT */}
          {showNewCustomerForm && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/5">
              <h4 className="font-medium">Nuevo Cliente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Nombres *"
                  value={customer.nombres || customer.name || ''}
                  onChange={(e) => onCustomerChange({ 
                    ...customer, 
                    nombres: e.target.value,
                    name: e.target.value 
                  })}
                />
                <Input
                  placeholder="Apellidos"
                  value={customer.apellidos || customer.apellido || ''}
                  onChange={(e) => onCustomerChange({ 
                    ...customer, 
                    apellidos: e.target.value,
                    apellido: e.target.value 
                  })}
                />
                <Input
                  placeholder="Teléfono"
                  value={customer.phone || ''}
                  onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
                />
                <Input
                  placeholder="Email (opcional)"
                  value={customer.email || ''}
                  onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
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
                    <h4 className="font-medium">{getDisplayName(customer)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone} • {customer.email}
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
                          {formatPrice(usedRunas * runaRewardValue)}
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
