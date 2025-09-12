import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomers, CustomerFormData } from '@/hooks/useCustomers';
import { Customer, EstadoCliente } from '@/types';

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: () => void;
}

export default function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    nombres: '',
    apellidos: '',
    phone: '',
    rut: '',
    email: '',
    fecha_nacimiento: '',
    estado_cliente: 'Activo',
    motivo_estado: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { createCustomer, updateCustomer } = useCustomers();

  // Load existing customer data
  useEffect(() => {
    if (customer) {
      setFormData({
        nombres: customer.nombres || '',
        apellidos: customer.apellidos || '',
        phone: customer.phone || '',
        rut: customer.rut || '',
        email: customer.email || '',
        fecha_nacimiento: customer.fecha_nacimiento || '',
        estado_cliente: customer.estado_cliente || 'Activo',
        motivo_estado: customer.motivo_estado || ''
      });
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let success;
      if (customer) {
        success = await updateCustomer(customer.id, formData);
      } else {
        success = await createCustomer(formData);
      }

      if (success) {
        onSuccess?.();
        if (!customer) {
          // Reset form for new customer
          setFormData({
            nombres: '',
            apellidos: '',
            phone: '',
            rut: '',
            email: '',
            fecha_nacimiento: '',
            estado_cliente: 'Activo',
            motivo_estado: ''
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatRut = (rut: string) => {
    // Remove all non-numeric characters except 'k' or 'K'
    const cleaned = rut.replace(/[^0-9kK]/g, '');
    
    if (cleaned.length === 0) return '';
    
    // Format RUT with dots and dash
    const rutNumber = cleaned.slice(0, -1);
    const checkDigit = cleaned.slice(-1);
    
    if (rutNumber.length === 0) return checkDigit;
    
    const formatted = rutNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${checkDigit}`;
  };

  const handleRutChange = (value: string) => {
    const formatted = formatRut(value);
    handleInputChange('rut', formatted);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</CardTitle>
        <CardDescription>
          {customer ? 'Modifica los datos del cliente' : 'Ingresa los datos del nuevo cliente'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombres */}
            <div className="space-y-2">
              <Label htmlFor="nombres">Nombres *</Label>
              <Input
                id="nombres"
                value={formData.nombres}
                onChange={(e) => handleInputChange('nombres', e.target.value)}
                placeholder="Ej: Juan Pablo"
                required
              />
            </div>

            {/* Apellidos */}
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input
                id="apellidos"
                value={formData.apellidos}
                onChange={(e) => handleInputChange('apellidos', e.target.value)}
                placeholder="Ej: González López"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="ejemplo@email.com"
                required
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Ej: +56912345678"
              />
            </div>

            {/* RUT */}
            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                value={formData.rut}
                onChange={(e) => handleRutChange(e.target.value)}
                placeholder="Ej: 12.345.678-9"
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="estado_cliente">Estado</Label>
              <Select 
                value={formData.estado_cliente} 
                onValueChange={(value) => handleInputChange('estado_cliente', value as EstadoCliente)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Motivo Estado - solo si está bloqueado */}
            {formData.estado_cliente === 'Bloqueado' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="motivo_estado">Motivo del Bloqueo *</Label>
                <Textarea
                  id="motivo_estado"
                  value={formData.motivo_estado}
                  onChange={(e) => handleInputChange('motivo_estado', e.target.value)}
                  placeholder="Explica el motivo del bloqueo del cliente"
                  required
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {customer ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                customer ? 'Actualizar Cliente' : 'Crear Cliente'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}