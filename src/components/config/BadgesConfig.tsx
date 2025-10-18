import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Edit, Trash2, Plus, Trophy, Medal, Star, Zap, Crown, Target, Gift } from 'lucide-react';

interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

const iconOptions = [
  { value: 'Trophy', label: 'Trofeo', Icon: Trophy },
  { value: 'Medal', label: 'Medalla', Icon: Medal },
  { value: 'Award', label: 'Premio', Icon: Award },
  { value: 'Star', label: 'Estrella', Icon: Star },
  { value: 'Zap', label: 'Rayo', Icon: Zap },
  { value: 'Crown', label: 'Corona', Icon: Crown },
  { value: 'Target', label: 'Objetivo', Icon: Target },
  { value: 'Gift', label: 'Regalo', Icon: Gift },
];

const categoryOptions = [
  { value: 'nivel', label: 'Nivel' },
  { value: 'compras', label: 'Compras' },
  { value: 'especiales', label: 'Especiales' },
];

export function BadgesConfig() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_badges')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setBadges(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las insignias',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (badge: Badge) => {
    try {
      const { error } = await supabase
        .from('customer_badges')
        .update({ is_active: !badge.is_active })
        .eq('id', badge.id);

      if (error) throw error;

      setBadges(badges.map(b => b.id === badge.id ? { ...b, is_active: !b.is_active } : b));
      
      toast({
        title: 'Actualizado',
        description: `Insignia ${!badge.is_active ? 'activada' : 'desactivada'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingBadge) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('customer_badges')
        .update({
          name: editingBadge.name,
          description: editingBadge.description,
          icon: editingBadge.icon,
          category: editingBadge.category,
          sort_order: editingBadge.sort_order,
        })
        .eq('id', editingBadge.id);

      if (error) throw error;

      setBadges(badges.map(b => b.id === editingBadge.id ? editingBadge : b));
      setIsDialogOpen(false);
      setEditingBadge(null);

      toast({
        title: 'Guardado',
        description: 'Insignia actualizada correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icon = iconOptions.find(opt => opt.value === iconName);
    return icon ? icon.Icon : Award;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insignias</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Insignias</CardTitle>
          <CardDescription>
            Configura las insignias que se otorgan automáticamente a los clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Ícono</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badges.map((badge) => {
                  const IconComponent = getIconComponent(badge.icon);
                  return (
                    <TableRow key={badge.id}>
                      <TableCell>
                        <IconComponent className="h-6 w-6 text-primary" />
                      </TableCell>
                      <TableCell className="font-medium">{badge.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{badge.code}</TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">{badge.category || '-'}</span>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {badge.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={badge.is_active}
                          onCheckedChange={() => handleToggleActive(badge)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(badge)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Insignias Automáticas</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>first_order</strong>: Se otorga al hacer el primer pedido</li>
              <li>• <strong>ten_orders</strong>: Se otorga al completar 10 pedidos</li>
              <li>• <strong>big_spender</strong>: Se otorga al gastar más de $100,000 en total</li>
              <li>• <strong>birthday_order</strong>: Se otorga al pedir en el día de cumpleaños</li>
              <li>• <strong>weekly_loyal</strong>: Se otorga al pedir 4 semanas consecutivas</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Insignia</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la insignia
            </DialogDescription>
          </DialogHeader>

          {editingBadge && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={editingBadge.name}
                  onChange={(e) => setEditingBadge({ ...editingBadge, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={editingBadge.description || ''}
                  onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Ícono</Label>
                <Select
                  value={editingBadge.icon}
                  onValueChange={(value) => setEditingBadge({ ...editingBadge, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.Icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={editingBadge.category || ''}
                  onValueChange={(value) => setEditingBadge({ ...editingBadge, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Orden</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={editingBadge.sort_order}
                  onChange={(e) => setEditingBadge({ ...editingBadge, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}