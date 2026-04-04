import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Layers, Plus, X } from 'lucide-react';
import { useVariantGroups } from '@/hooks/useVariantGroups';

interface ProductVariantGroupsAssignmentProps {
  productId?: string;
}

export default function ProductVariantGroupsAssignment({ productId }: ProductVariantGroupsAssignmentProps) {
  const { groups, loading, getProductGroups, assignGroupToProduct, removeGroupFromProduct } = useVariantGroups();
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    if (productId) fetchAssignments();
  }, [productId]);

  const fetchAssignments = async () => {
    if (!productId) return;
    setLoadingAssignments(true);
    const pvgs = await getProductGroups(productId);
    setAssignedGroupIds(pvgs.map((p: any) => p.group_id));
    setLoadingAssignments(false);
  };

  const handleToggle = async (groupId: string, checked: boolean) => {
    if (!productId) return;
    if (checked) {
      await assignGroupToProduct(productId, groupId);
    } else {
      await removeGroupFromProduct(productId, groupId);
    }
    await fetchAssignments();
  };

  if (!productId) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          Guarda el producto primero para asignar grupos de variantes.
        </CardContent>
      </Card>
    );
  }

  if (loading || loadingAssignments) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          Cargando grupos...
        </CardContent>
      </Card>
    );
  }

  const activeGroups = groups.filter(g => g.active);

  if (activeGroups.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          No hay grupos de variantes creados. Crea uno en Configuración → Grupos de Variantes.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Grupos de Variantes (Dimensiones Adicionales)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Asigna grupos como "Proteína" para que el cliente seleccione opciones adicionales (ej: Carne / Pollo).
          El precio se define por combinación en la tabla de variantes de arriba.
        </p>
        {activeGroups.map(group => (
          <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">{group.name}</span>
              <Badge variant="secondary" className="text-xs">
                {group.options.filter(o => o.active).length} opciones
              </Badge>
              {group.options.filter(o => o.active).length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({group.options.filter(o => o.active).map(o => o.name).join(', ')})
                </span>
              )}
            </div>
            <Switch
              checked={assignedGroupIds.includes(group.id)}
              onCheckedChange={checked => handleToggle(group.id, checked)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
