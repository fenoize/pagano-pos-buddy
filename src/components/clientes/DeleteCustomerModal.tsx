import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Customer } from "@/types";

interface DeleteCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeactivate: (customer: Customer) => Promise<void>;
  onConfirmDeletePermanently: (customer: Customer) => Promise<void>;
  type: 'deactivate' | 'permanent' | null;
}

export default function DeleteCustomerModal({
  customer,
  isOpen,
  onClose,
  onConfirmDeactivate,
  onConfirmDeletePermanently,
  type
}: DeleteCustomerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSecondConfirmation, setShowSecondConfirmation] = useState(false);

  if (!customer || !type) return null;

  const customerName = `${customer.nombres || customer.name} ${customer.apellidos || customer.apellido}`;

  const handleClose = () => {
    setShowSecondConfirmation(false);
    setIsLoading(false);
    onClose();
  };

  const handleFirstConfirm = () => {
    if (type === 'permanent') {
      setShowSecondConfirmation(true);
    } else {
      handleFinalConfirm();
    }
  };

  const handleFinalConfirm = async () => {
    setIsLoading(true);
    try {
      if (type === 'deactivate') {
        await onConfirmDeactivate(customer);
      } else {
        await onConfirmDeletePermanently(customer);
      }
      handleClose();
    } catch (error) {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'deactivate' ? (
              <>
                <Trash2 className="w-5 h-5 text-red-500" />
                Desactivar Cliente
              </>
            ) : (
              <>
                <X className="w-5 h-5 text-red-700" />
                Eliminar Definitivamente
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showSecondConfirmation ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  {type === 'deactivate' 
                    ? `¿Estás seguro de que quieres desactivar al cliente ${customerName}?`
                    : `¿Estás seguro de que quieres eliminar definitivamente al cliente ${customerName}?`
                  }
                </AlertDescription>
              </Alert>

              {type === 'deactivate' && (
                <p className="text-sm text-muted-foreground">
                  El cliente se marcará como inactivo pero podrás reactivarlo más tarde.
                </p>
              )}

              {type === 'permanent' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ Esta acción eliminará permanentemente todos los datos del cliente.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Si el cliente tiene órdenes asociadas, no podrá ser eliminado.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>CONFIRMACIÓN FINAL</strong><br />
                  Esta acción NO se puede deshacer. ¿Confirmas la eliminación definitiva de {customerName}?
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          
          {!showSecondConfirmation ? (
            <Button
              variant={type === 'deactivate' ? 'destructive' : 'destructive'}
              onClick={handleFirstConfirm}
              disabled={isLoading}
              className={type === 'permanent' ? 'bg-red-700 hover:bg-red-800' : ''}
            >
              {type === 'deactivate' ? (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Desactivar
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Continuar
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleFinalConfirm}
              disabled={isLoading}
              className="bg-red-700 hover:bg-red-800"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Eliminar Definitivamente
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}