import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';

interface CustomerQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
}

export function CustomerQRModal({ isOpen, onClose, customerId, customerName }: CustomerQRModalProps) {
  // Format: PAGANOS:{uuid} for validation
  const qrValue = `PAGANOS:${customerId}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center">Mi Código QR</DialogTitle>
          <DialogDescription className="text-center">
            Muestra este código en caja para identificarte
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <QRCodeSVG
              value={qrValue}
              size={220}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* Customer Name */}
          {customerName && (
            <p className="text-sm font-medium text-foreground text-center">
              {customerName}
            </p>
          )}

          {/* Instructions */}
          <p className="text-xs text-muted-foreground text-center max-w-[250px]">
            El cajero escaneará este código para vincular tu pedido y acumular runas
          </p>
        </div>

        <Button variant="outline" onClick={onClose} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
