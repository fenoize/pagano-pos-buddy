import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Send,
  ShoppingCart,
  MessageSquare,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const steps = [
  {
    icon: FileText,
    title: 'Revisar las Órdenes de Compra (OC)',
    description: 'Se generarán OC agrupadas por proveedor. Revisa que los ítems, cantidades y precios estén correctos.',
  },
  {
    icon: Send,
    title: 'Enviar las OC a proveedores',
    description: 'Envía cada OC al proveedor correspondiente por WhatsApp, email o el medio que prefieras.',
  },
  {
    icon: ShoppingCart,
    title: 'Realizar las compras directas',
    description: 'Completa la lista de compra directa marcando cada ítem con su precio real y cantidad comprada.',
  },
  {
    icon: MessageSquare,
    title: 'Añadir comentarios si es necesario',
    description: 'Usa las notas de gestión para registrar observaciones, cambios o incidencias durante el proceso.',
  },
  {
    icon: CheckCheck,
    title: 'Finalizar la gestión',
    description: 'Una vez que todos los ítems estén resueltos y las OC procesadas, finaliza la gestión para actualizar costos.',
  },
];

export default function StartManagementOnboarding({ open, onClose, onConfirm, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">¿Listo para iniciar la gestión?</DialogTitle>
          <DialogDescription>
            Sigue estos pasos para completar la compra exitosamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="font-medium text-sm leading-tight">{step.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? 'Iniciando…' : 'Iniciar Gestión'}
            {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
