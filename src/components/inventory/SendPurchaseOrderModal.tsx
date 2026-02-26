import { useState, useEffect } from 'react';
import { MessageCircle, Mail, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useSupplierContacts } from '@/hooks/useSupplierContacts';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder, PurchaseOrderItem } from '@/hooks/usePurchaseOrders';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SendPurchaseOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder | null;
}

export function SendPurchaseOrderModal({ 
  open, 
  onOpenChange, 
  order 
}: SendPurchaseOrderModalProps) {
  const { toast } = useToast();
  const { contacts, loading } = useSupplierContacts(order?.supplier_id);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Filter contacts that receive purchase orders
  const poContacts = contacts.filter(c => c.receive_purchase_orders);

  useEffect(() => {
    if (poContacts.length > 0 && !selectedContactId) {
      // Select primary contact by default, or first one
      const primary = poContacts.find(c => c.is_primary);
      setSelectedContactId(primary?.id || poContacts[0]?.id || '');
    }
  }, [poContacts, selectedContactId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const generateMessage = (): string => {
    if (!order) return '';

    const items = (order.items || [])
      .map((item: PurchaseOrderItem) => 
        `• ${item.raw_material?.name || 'Material'} x ${item.qty} ${item.uom?.abbreviation || 'un'}`
      )
      .join('\n');

    return `🛒 *ORDEN DE COMPRA ${order.po_number}*
Paganos Burger

📅 Fecha: ${format(new Date(order.created_at), 'dd/MM/yyyy', { locale: es })}
${order.expected_date ? `📦 Entrega esperada: ${format(new Date(order.expected_date), 'dd/MM/yyyy', { locale: es })}` : ''}

*ITEMS:*
${items}

💰 *Total estimado: ${formatCurrency(order.total)}*

${order.notes ? `📝 Notas: ${order.notes}` : ''}`;
  };

  const handleSendWhatsApp = () => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact?.phone) {
      toast({
        title: 'Error',
        description: 'El contacto no tiene número de teléfono',
        variant: 'destructive',
      });
      return;
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = contact.phone.replace(/\D/g, '');
    // Add Chile country code if not present
    const phone = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;
    
    const message = encodeURIComponent(generateMessage());
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    onOpenChange(false);
  };

  const handleSendEmail = () => {
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact?.email) {
      toast({
        title: 'Error',
        description: 'El contacto no tiene correo electrónico',
        variant: 'destructive',
      });
      return;
    }

    const subject = encodeURIComponent(`Orden de Compra ${order?.po_number} - Paganos Burger`);
    const body = encodeURIComponent(generateMessage().replace(/\*/g, ''));
    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, '_blank');
    onOpenChange(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateMessage().replace(/\*/g, ''));
      setCopied(true);
      toast({ title: 'Copiado al portapapeles' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles',
        variant: 'destructive',
      });
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Orden de Compra</DialogTitle>
          <DialogDescription>
            Selecciona un contacto y el método de envío
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Selection */}
          <div className="space-y-3">
            <Label>Contacto</Label>
            {loading ? (
              <div className="h-20 flex items-center justify-center text-muted-foreground">
                Cargando contactos...
              </div>
            ) : poContacts.length === 0 ? (
              <div className="p-4 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                No hay contactos configurados para recibir órdenes de compra.
                <br />
                Configura los contactos en la ficha del proveedor.
              </div>
            ) : (
              <RadioGroup
                value={selectedContactId}
                onValueChange={setSelectedContactId}
                className="space-y-2"
              >
                {poContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedContactId === contact.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedContactId(contact.id)}
                  >
                    <RadioGroupItem value={contact.id} id={contact.id} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{contact.name}</span>
                        {contact.is_primary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Principal
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {contact.position && <span>{contact.position} • </span>}
                        {contact.phone && <span>{contact.phone}</span>}
                        {contact.phone && contact.email && <span> • </span>}
                        {contact.email && <span>{contact.email}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Send Methods */}
          <div className="space-y-3">
            <Label>Método de envío</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col h-auto py-4 gap-2"
                onClick={handleSendWhatsApp}
                disabled={!selectedContact?.phone}
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-4 gap-2"
                onClick={handleSendEmail}
                disabled={!selectedContact?.email}
              >
                <Mail className="h-5 w-5 text-blue-600" />
                <span className="text-xs">Email</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-4 gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
                <span className="text-xs">Copiar</span>
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Vista previa del mensaje</Label>
            <div className="p-3 bg-muted rounded-lg text-xs whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
              {generateMessage().replace(/\*/g, '')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
