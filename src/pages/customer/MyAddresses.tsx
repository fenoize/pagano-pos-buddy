import { useState, useEffect } from 'react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { CustomerAddressCard } from '@/components/customer/CustomerAddressCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus } from 'lucide-react';
import { AddressFormWithMap } from '@/components/customer/AddressFormWithMap';

// Helper to validate UUID format
const isValidUUID = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

interface AddressFormData {
  alias: string;
  calle: string;
  numero: string;
  depto: string;
  comuna: string;
  observaciones: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
}

export default function MyAddresses() {
  const { customer } = useCustomerAuth();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);

  // Modal de agregar/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  // Modal de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    if (!customer?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', customer.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus direcciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [customer?.id]);

  const handleOpenDialog = (address?: any) => {
    if (address) {
      setEditingAddress(address);
    } else {
      setEditingAddress(null);
    }
    setDialogOpen(true);
  };

  const handleSaveAddress = async (formData: AddressFormData) => {
    // Validar que customer.id sea un UUID válido
    if (!customer?.id || !isValidUUID(customer.id)) {
      console.error('Invalid customer ID:', customer?.id);
      toast({
        title: 'Error',
        description: 'No se pudo identificar tu cuenta. Por favor, cierra sesión e inicia nuevamente.',
        variant: 'destructive',
      });
      return;
    }

    // Validar máximo 5 direcciones
    if (!editingAddress && addresses.length >= 5) {
      toast({
        title: 'Límite alcanzado',
        description: 'Solo puedes tener un máximo de 5 direcciones guardadas',
        variant: 'destructive',
      });
      return;
    }

    setSavingAddress(true);
    try {
      // If setting this as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('customer_id', customer.id);
      }

      if (editingAddress) {
        // Validar que editingAddress.id sea un UUID válido
        if (!editingAddress.id || !isValidUUID(editingAddress.id)) {
          console.error('Invalid address ID for update:', editingAddress.id);
          throw new Error('ID de dirección inválido');
        }
        
        // Update existing address
        const { error } = await supabase
          .from('addresses')
          .update({
            alias: formData.alias,
            calle: formData.calle,
            numero: formData.numero,
            depto: formData.depto || null,
            comuna: formData.comuna,
            observaciones: formData.observaciones || null,
            is_default: formData.is_default,
            latitude: formData.latitude,
            longitude: formData.longitude,
            formatted_address: formData.formatted_address,
          })
          .eq('id', editingAddress.id);

        if (error) throw error;

        toast({
          title: 'Dirección actualizada',
          description: 'Tu dirección ha sido actualizada correctamente',
        });
      } else {
        // Create new address
        const { error } = await supabase.from('addresses').insert([{
          customer_id: customer.id,
          alias: formData.alias,
          calle: formData.calle,
          numero: formData.numero,
          depto: formData.depto || null,
          comuna: formData.comuna,
          observaciones: formData.observaciones || null,
          is_default: formData.is_default || addresses.length === 0, // First address is default
          ciudad: 'Santiago',
          latitude: formData.latitude,
          longitude: formData.longitude,
          formatted_address: formData.formatted_address,
        }]);

        if (error) throw error;

        toast({
          title: 'Dirección agregada',
          description: 'Tu dirección ha sido agregada correctamente',
        });
      }

      setDialogOpen(false);
      fetchAddresses();
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la dirección',
        variant: 'destructive',
      });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from('addresses').delete().eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'Dirección eliminada',
        description: 'La dirección ha sido eliminada correctamente',
      });

      setDeleteDialogOpen(false);
      fetchAddresses();
    } catch (error: any) {
      console.error('Error deleting address:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la dirección',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    // Validar ambos UUIDs
    if (!customer?.id || !isValidUUID(customer.id)) {
      console.error('Invalid customer ID:', customer?.id);
      toast({
        title: 'Error',
        description: 'No se pudo identificar tu cuenta',
        variant: 'destructive',
      });
      return;
    }
    
    if (!isValidUUID(id)) {
      console.error('Invalid address ID:', id);
      toast({
        title: 'Error',
        description: 'ID de dirección inválido',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Unset all defaults first
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('customer_id', customer.id);

      // Set the new default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Dirección principal actualizada',
        description: 'Esta dirección ahora es tu dirección principal',
      });

      fetchAddresses();
    } catch (error: any) {
      console.error('Error setting default address:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la dirección principal',
        variant: 'destructive',
      });
    }
  };

  const canAddMore = addresses.length < 5;

  return (
    <CustomerLayout title="Mis Direcciones">
      <div className="mb-6">
        <Button onClick={() => handleOpenDialog()} disabled={!canAddMore}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Dirección
        </Button>
        {!canAddMore && (
          <p className="text-sm text-muted-foreground mt-2">
            Has alcanzado el límite de 5 direcciones guardadas
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <MapPin className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-lg font-medium">No tienes direcciones guardadas</h3>
          <p className="text-sm text-muted-foreground text-center">
            Agrega una dirección para facilitar tus pedidos de delivery
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <CustomerAddressCard
              key={address.id}
              address={address}
              onEdit={handleOpenDialog}
              onDelete={(id) => {
                setDeleteId(id);
                setDeleteDialogOpen(true);
              }}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Dialog Agregar/Editar con Mapbox */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Dirección' : 'Agregar Dirección'}
            </DialogTitle>
            <DialogDescription>
              {editingAddress
                ? 'Actualiza los datos de tu dirección'
                : 'Busca tu dirección y confirma la ubicación en el mapa'}
            </DialogDescription>
          </DialogHeader>

          <AddressFormWithMap
            initialData={editingAddress ? {
              alias: editingAddress.alias,
              calle: editingAddress.calle,
              numero: editingAddress.numero,
              depto: editingAddress.depto || '',
              comuna: editingAddress.comuna,
              observaciones: editingAddress.observaciones || '',
              is_default: editingAddress.is_default,
              latitude: editingAddress.latitude,
              longitude: editingAddress.longitude,
              formatted_address: editingAddress.formatted_address || '',
            } : undefined}
            onSubmit={handleSaveAddress}
            onCancel={() => setDialogOpen(false)}
            isLoading={savingAddress}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar dirección?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La dirección será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomerLayout>
  );
}
