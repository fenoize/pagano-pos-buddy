import { useState, useEffect } from 'react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { CustomerAddressCard } from '@/components/customer/CustomerAddressCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useComunas } from '@/hooks/useComunas';
import { MapPin, Plus } from 'lucide-react';

export default function MyAddresses() {
  const { customer } = useCustomerAuth();
  const { toast } = useToast();
  const { comunas, loading: comunasLoading } = useComunas();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de agregar/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    alias: '',
    calle: '',
    numero: '',
    depto: '',
    comuna_id: '',
    observaciones: '',
    is_default: false,
  });

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
      setEditingId(address.id);
      setFormData({
        alias: address.alias || '',
        calle: address.calle || '',
        numero: address.numero || '',
        depto: address.depto || '',
        comuna_id: address.comuna_id || '',
        observaciones: address.observaciones || '',
        is_default: address.is_default || false,
      });
    } else {
      setEditingId(null);
      setFormData({
        alias: '',
        calle: '',
        numero: '',
        depto: '',
        comuna_id: '',
        observaciones: '',
        is_default: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveAddress = async () => {
    if (!customer?.id) return;

    // Validar máximo 5 direcciones
    if (!editingId && addresses.length >= 5) {
      toast({
        title: 'Límite alcanzado',
        description: 'Solo puedes tener un máximo de 5 direcciones guardadas',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        // Actualizar
        const { error } = await supabase
          .from('addresses')
          .update({
            alias: formData.alias,
            calle: formData.calle,
            numero: formData.numero,
            depto: formData.depto || null,
            comuna_id: formData.comuna_id,
            observaciones: formData.observaciones || null,
            is_default: formData.is_default,
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Dirección actualizada',
          description: 'Tu dirección ha sido actualizada correctamente',
        });
      } else {
        // Crear - buscar el nombre de la comuna
        const selectedComuna = comunas.find(c => c.id === formData.comuna_id);
        
        const { error } = await supabase.from('addresses').insert([{
          customer_id: customer.id,
          alias: formData.alias,
          calle: formData.calle,
          numero: formData.numero,
          depto: formData.depto || null,
          comuna_id: formData.comuna_id,
          comuna: selectedComuna?.name || '',
          observaciones: formData.observaciones || null,
          is_default: formData.is_default,
          ciudad: 'Santiago'
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
    try {
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

      {/* Dialog Agregar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Dirección' : 'Agregar Dirección'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Actualiza los datos de tu dirección'
                : 'Agrega una nueva dirección de entrega'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Alias *</Label>
              <Input
                placeholder="Casa, Trabajo, etc."
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              />
            </div>

            <div>
              <Label>Calle *</Label>
              <Input
                placeholder="Nombre de la calle"
                value={formData.calle}
                onChange={(e) => setFormData({ ...formData, calle: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número *</Label>
                <Input
                  placeholder="123"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              <div>
                <Label>Depto/Oficina</Label>
                <Input
                  placeholder="4B (opcional)"
                  value={formData.depto}
                  onChange={(e) => setFormData({ ...formData, depto: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Comuna *</Label>
              <Select
                value={formData.comuna_id}
                onValueChange={(value) => setFormData({ ...formData, comuna_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una comuna" />
                </SelectTrigger>
                <SelectContent>
                  {comunas.map((comuna) => (
                    <SelectItem key={comuna.id} value={comuna.id}>
                      {comuna.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Referencias adicionales</Label>
              <Textarea
                placeholder="Ej: Casa azul con reja blanca"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default: checked as boolean })
                }
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Dirección principal
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAddress}>
              {editingId ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
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
