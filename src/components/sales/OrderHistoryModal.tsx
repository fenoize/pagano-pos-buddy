import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOrderEdit } from '@/hooks/useOrderEdit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History } from 'lucide-react';

interface OrderHistoryModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AuditRecord {
  id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  reason?: string;
  created_at: string;
  user_id?: string;
}

export function OrderHistoryModal({ orderId, isOpen, onClose }: OrderHistoryModalProps) {
  const [history, setHistory] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { getOrderHistory } = useOrderEdit();

  useEffect(() => {
    if (isOpen && orderId) {
      loadHistory();
    }
  }, [isOpen, orderId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getOrderHistory(orderId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatChangeValue = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed, null, 2);
      }
      return value;
    } catch {
      return value;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Cambios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Cargando historial...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cambios registrados para este pedido
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <Card key={record.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {record.field_name === 'order_edit' ? 'Edición' : record.field_name}
                        </Badge>
                        <span className="text-muted-foreground">
                          {format(new Date(record.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </span>
                      </div>
                      {record.user_id && (
                        <Badge variant="secondary" className="text-xs">
                          Usuario: {record.user_id.slice(-8)}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {record.reason && (
                      <div>
                        <span className="text-sm font-medium">Motivo:</span>
                        <p className="text-sm text-muted-foreground mt-1">{record.reason}</p>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Valor Anterior:</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {formatChangeValue(record.old_value || 'N/A')}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Valor Nuevo:</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {formatChangeValue(record.new_value || 'N/A')}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}