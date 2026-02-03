import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomers, CustomerFormData } from '@/hooks/useCustomers';
import { Customer, EstadoCliente } from '@/types';
import CustomerFieldsForm, { CustomerFieldsData } from '@/components/shared/CustomerFieldsForm';

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: () => void;
}

export default function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const [fieldsData, setFieldsData] = useState<CustomerFieldsData>({
    nombres: '',
    apellidos: '',
    email: '',
    phone: '',
    fecha_nacimiento: '',
  });
  const [estadoCliente, setEstadoCliente] = useState<EstadoCliente>('Activo');
  const [motivoEstado, setMotivoEstado] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { createCustomer, updateCustomer } = useCustomers();

  // Load existing customer data
  useEffect(() => {
    if (customer) {
      setFieldsData({
        nombres: customer.nombres || customer.name || '',
        apellidos: customer.apellidos || customer.apellido || '',
        email: customer.email || '',
        phone: customer.phone || '',
        fecha_nacimiento: customer.fecha_nacimiento || '',
      });
      setEstadoCliente(customer.estado_cliente || 'Activo');
      setMotivoEstado(customer.motivo_estado || '');
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData: CustomerFormData = {
        nombres: fieldsData.nombres,
        apellidos: fieldsData.apellidos,
        phone: fieldsData.phone || '',
        email: fieldsData.email || '',
        fecha_nacimiento: fieldsData.fecha_nacimiento || '',
        estado_cliente: estadoCliente,
        motivo_estado: motivoEstado,
      };

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
          setFieldsData({
            nombres: '',
            apellidos: '',
            email: '',
            phone: '',
            fecha_nacimiento: '',
          });
          setEstadoCliente('Activo');
          setMotivoEstado('');
        }
      }
    } finally {
      setLoading(false);
    }
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
          {/* Campos unificados */}
          <CustomerFieldsForm
            data={fieldsData}
            onChange={setFieldsData}
            disabled={loading}
            showEmail={true}
            phoneRequired={false}
            birthDateRequired={false}
          />

          {/* Estado y Motivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado_cliente">Estado</Label>
              <Select 
                value={estadoCliente} 
                onValueChange={(value) => setEstadoCliente(value as EstadoCliente)}
                disabled={loading}
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
            {estadoCliente === 'Bloqueado' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="motivo_estado">Motivo del Bloqueo *</Label>
                <Textarea
                  id="motivo_estado"
                  value={motivoEstado}
                  onChange={(e) => setMotivoEstado(e.target.value)}
                  placeholder="Explica el motivo del bloqueo del cliente"
                  required
                  disabled={loading}
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
