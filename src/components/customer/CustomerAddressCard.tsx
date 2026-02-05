import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash, Star } from 'lucide-react';

interface Address {
  id: string;
  alias: string;
  calle: string;
  numero: string;
  depto?: string | null;
  comuna: string;
  observaciones?: string | null;
  is_default: boolean;
  formatted_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface CustomerAddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function CustomerAddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: CustomerAddressCardProps) {
  return (
    <Card className={address.is_default ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{address.alias}</h4>
          {address.is_default && <Badge>Principal</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {address.formatted_address ? (
            <p className="text-sm">{address.formatted_address}</p>
          ) : (
            <p className="text-sm">
              {address.calle} {address.numero}
              {address.depto && `, ${address.depto}`}
            </p>
          )}
          {address.depto && address.formatted_address && (
            <p className="text-sm text-muted-foreground">
              Depto/Oficina: {address.depto}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{address.comuna}</p>
          {address.observaciones && (
            <p className="text-xs text-muted-foreground italic mt-2">
              {address.observaciones}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onEdit(address)}>
            <Pencil className="w-3 h-3 mr-1" />
            Editar
          </Button>
          {!address.is_default && (
            <Button variant="outline" size="sm" onClick={() => onSetDefault(address.id)}>
              <Star className="w-3 h-3 mr-1" />
              Hacer principal
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onDelete(address.id)}>
            <Trash className="w-3 h-3 mr-1 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
