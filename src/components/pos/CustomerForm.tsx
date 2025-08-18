import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { User, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerFormProps {
  customer: Partial<Customer>;
  onCustomerChange: (customer: Partial<Customer>) => void;
}

export default function CustomerForm({ customer, onCustomerChange }: CustomerFormProps) {
  const [comunas, setComunas] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchComunas();
    if (searchTerm.length > 2) {
      searchCustomers();
    }
  }, [searchTerm]);

  const fetchComunas = async () => {
    try {
      const { data } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'comunas')
        .single();
      
      if (data) {
        setComunas(data.value as string[]);
      }
    } catch (error) {
      console.error('Error fetching comunas:', error);
    }
  };

  const searchCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,phone.like.%${searchTerm}%,rut.like.%${searchTerm}%`)
        .limit(5);
      
      if (data) {
        setExistingCustomers(data);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const selectCustomer = (selectedCustomer: Customer) => {
    onCustomerChange(selectedCustomer);
    setSearchTerm('');
    setExistingCustomers([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Información del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda de cliente existente */}
        <div className="relative">
          <Label>Buscar Cliente Existente</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {existingCustomers.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
              {existingCustomers.map((cust) => (
                <Button
                  key={cust.id}
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => selectCustomer(cust)}
                >
                  <div>
                    <div className="font-medium">{cust.name} {cust.apellido}</div>
                    <div className="text-sm text-muted-foreground">
                      {cust.phone} • {cust.rut}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nombre</Label>
            <Input
              value={customer.name || ''}
              onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
              placeholder="Nombre"
            />
          </div>
          <div>
            <Label>Apellido</Label>
            <Input
              value={customer.apellido || ''}
              onChange={(e) => onCustomerChange({ ...customer, apellido: e.target.value })}
              placeholder="Apellido"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Dirección</Label>
            <Input
              value={customer.direccion || ''}
              onChange={(e) => onCustomerChange({ ...customer, direccion: e.target.value })}
              placeholder="Dirección"
            />
          </div>
          <div>
            <Label>Numeración</Label>
            <Input
              value={customer.numeracion || ''}
              onChange={(e) => onCustomerChange({ ...customer, numeracion: e.target.value })}
              placeholder="Número"
            />
          </div>
          <div>
            <Label>Comuna</Label>
            <Select
              value={customer.comuna || ''}
              onValueChange={(value) => onCustomerChange({ ...customer, comuna: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar comuna" />
              </SelectTrigger>
              <SelectContent>
                {comunas.map((comuna) => (
                  <SelectItem key={comuna} value={comuna}>
                    {comuna}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Correo</Label>
            <Input
              type="email"
              value={customer.email || ''}
              onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input
              value={customer.phone || ''}
              onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
              placeholder="+56 9 1234 5678"
            />
          </div>
        </div>

        <div>
          <Label>RUT</Label>
          <Input
            value={customer.rut || ''}
            onChange={(e) => onCustomerChange({ ...customer, rut: e.target.value })}
            placeholder="12.345.678-9"
          />
        </div>

        {customer.cantidad_runas !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cantidad de Runas</Label>
              <Input
                type="number"
                value={customer.cantidad_runas || 0}
                onChange={(e) => onCustomerChange({ ...customer, cantidad_runas: Number(e.target.value) })}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label>Valor Cliente (Promedio)</Label>
              <Input
                value={customer.valor_cliente ? `$${customer.valor_cliente.toLocaleString()}` : '$0'}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}