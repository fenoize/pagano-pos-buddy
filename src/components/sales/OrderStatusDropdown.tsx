import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderStatusDropdownProps {
  orderId: string;
  currentStatus: string;
  updatedAt: string;
  onStatusChange: (newStatus: string, updatedAt: string) => void;
}

interface StatusOption {
  id: string;
  label: string;
}

export const OrderStatusDropdown: React.FC<OrderStatusDropdownProps> = ({
  orderId,
  currentStatus,
  updatedAt,
  onStatusChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Pendiente': return 'secondary';
      case 'En preparación': return 'default';
      case 'En pausa': return 'outline';
      case 'Listo': return 'default';
      case 'Entregado': return 'default';
      case 'Cancelado': return 'destructive';
      default: return 'secondary';
    }
  };

  // Load status options when dropdown opens or current status changes
  useEffect(() => {
    if (isOpen && statusOptions.length === 0) {
      loadStatusOptions();
    }
  }, [isOpen, currentStatus]);

  // Reset options when current status changes to ensure fresh options
  useEffect(() => {
    setStatusOptions([]);
  }, [currentStatus]);

  const loadStatusOptions = async () => {
    setIsLoading(true);
    try {
      // Get available status transitions from the order status enum
      // For now, we'll use the predefined statuses - in a real app this would come from backend
      const allStatuses = [
        { id: 'Pendiente', label: 'Pendiente' },
        { id: 'En preparación', label: 'En preparación' },
        { id: 'En pausa', label: 'En pausa' },
        { id: 'Listo', label: 'Listo' },
        { id: 'Entregado', label: 'Entregado' },
        { id: 'Cancelado', label: 'Cancelado' },
      ];
      
      // Filter out current status
      const availableStatuses = allStatuses.filter(status => status.id !== currentStatus);
      setStatusOptions(availableStatuses);
    } catch (error) {
      console.error('Error loading status options:', error);
      toast.error('Error cargando opciones de estado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsChangingStatus(true);
    setIsOpen(false);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus as any, // Cast to avoid enum type issues
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('updated_at', updatedAt) // Optimistic concurrency check
        .select('status, updated_at')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('El pedido fue actualizado por otro usuario. Recarga e intenta de nuevo.');
          return;
        }
        throw error;
      }

      onStatusChange(data.status, data.updated_at);
      toast.success('Estado actualizado');
      
    } catch (error: any) {
      console.error('Error updating order status:', error);
      
      // Handle specific error messages
      if (error.message?.includes('permission')) {
        toast.error('No tienes permisos para cambiar este estado.');
      } else if (error.message?.includes('transition')) {
        toast.error('Transición no permitida para este pedido.');
      } else {
        toast.error('Error actualizando el estado');
      }
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-0 hover:bg-transparent"
          disabled={isChangingStatus}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center gap-1">
            <Badge variant={getStatusBadgeVariant(currentStatus)} className="cursor-pointer">
              {isChangingStatus ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {currentStatus}
                </div>
              ) : (
                currentStatus
              )}
            </Badge>
            {!isChangingStatus && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {isLoading ? (
          <DropdownMenuItem disabled>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Cargando...
          </DropdownMenuItem>
        ) : (
          statusOptions.map((status) => (
            <DropdownMenuItem
              key={status.id}
              onClick={() => handleStatusChange(status.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStatusChange(status.id);
                }
              }}
              className="cursor-pointer"
            >
              <Badge variant={getStatusBadgeVariant(status.id)}>
                {status.label}
              </Badge>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};