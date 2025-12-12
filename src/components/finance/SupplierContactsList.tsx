import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Star, Mail, Phone, MessageCircle, Loader2 } from 'lucide-react';
import { SupplierContact, useSupplierContacts, CreateSupplierContactData } from '@/hooks/useSupplierContacts';

interface SupplierContactsListProps {
  supplierId: string;
}

interface ContactFormData {
  name: string;
  position: string;
  email: string;
  phone: string;
  whatsapp: string;
  is_primary: boolean;
  receive_purchase_orders: boolean;
  receive_payments: boolean;
  notes: string;
}

const emptyContactForm: ContactFormData = {
  name: '',
  position: '',
  email: '',
  phone: '',
  whatsapp: '',
  is_primary: false,
  receive_purchase_orders: false,
  receive_payments: false,
  notes: '',
};

export function SupplierContactsList({ supplierId }: SupplierContactsListProps) {
  const { contacts, loading, createContact, updateContact, deleteContact } = useSupplierContacts(supplierId);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyContactForm);
  const [saving, setSaving] = useState(false);

  const handleOpenNew = () => {
    setEditingContact(null);
    setFormData(emptyContactForm);
    setShowModal(true);
  };

  const handleOpenEdit = (contact: SupplierContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      position: contact.position || '',
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      is_primary: contact.is_primary,
      receive_purchase_orders: contact.receive_purchase_orders,
      receive_payments: contact.receive_payments,
      notes: contact.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'El nombre es requerido', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (editingContact) {
      await updateContact(editingContact.id, formData);
    } else {
      const contactData: CreateSupplierContactData = {
        supplier_id: supplierId,
        ...formData,
        is_active: true,
      };
      await createContact(contactData);
    }

    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (contact: SupplierContact) => {
    if (confirm(`¿Eliminar el contacto "${contact.name}"?`)) {
      await deleteContact(contact.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {contacts.length} contacto{contacts.length !== 1 ? 's' : ''} registrado{contacts.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Contacto
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No hay contactos registrados</p>
          <Button variant="link" onClick={handleOpenNew}>
            Agregar el primer contacto
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {contact.is_primary && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    )}
                    <span className="font-medium">{contact.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.position || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.whatsapp && (
                      <span className="flex items-center gap-1 text-green-600">
                        <MessageCircle className="h-3 w-3" />
                        {contact.whatsapp}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.receive_purchase_orders && (
                      <Badge variant="outline" className="text-xs">Recibe OC</Badge>
                    )}
                    {contact.receive_payments && (
                      <Badge variant="outline" className="text-xs">Recibe Pagos</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contact)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Contact Form Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Nombre *</Label>
                <Input
                  id="contact-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-position">Cargo</Label>
                <Input
                  id="contact-position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Gerente Comercial"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@proveedor.cl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Teléfono</Label>
                <Input
                  id="contact-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-whatsapp">WhatsApp</Label>
                <Input
                  id="contact-whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_primary: !!checked })}
                />
                <Label htmlFor="is_primary" className="font-normal">
                  Contacto principal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="receive_po"
                  checked={formData.receive_purchase_orders}
                  onCheckedChange={(checked) => setFormData({ ...formData, receive_purchase_orders: !!checked })}
                />
                <Label htmlFor="receive_po" className="font-normal">
                  Recibe órdenes de compra
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="receive_payments"
                  checked={formData.receive_payments}
                  onCheckedChange={(checked) => setFormData({ ...formData, receive_payments: !!checked })}
                />
                <Label htmlFor="receive_payments" className="font-normal">
                  Recibe notificaciones de pago
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
