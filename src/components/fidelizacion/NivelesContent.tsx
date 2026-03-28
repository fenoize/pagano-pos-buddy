import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Award, Save, Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import type { Json } from '@/integrations/supabase/types';

interface Level {
  id: string;
  level_code: string;
  level_name: string;
  level_order: number;
  min_points: number;
  max_points: number | null;
  points_cost: number;
  icon: string;
  color: string;
  description: string | null;
  benefits: Json;
  is_active: boolean;
}

const ICON_OPTIONS = [
  'Star', 'Award', 'Crown', 'Trophy', 'Medal', 'Flame', 'Zap', 'Heart'
];

const COLOR_OPTIONS = [
  { value: 'text-gray-500', label: 'Gris', bg: 'bg-gray-500' },
  { value: 'text-blue-500', label: 'Azul', bg: 'bg-blue-500' },
  { value: 'text-green-500', label: 'Verde', bg: 'bg-green-500' },
  { value: 'text-amber-500', label: 'Dorado', bg: 'bg-amber-500' },
  { value: 'text-purple-500', label: 'Púrpura', bg: 'bg-purple-500' },
  { value: 'text-red-500', label: 'Rojo', bg: 'bg-red-500' },
];

export function NivelesContent() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<Level | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    level_code: '',
    level_name: '',
    level_order: 0,
    min_points: 0,
    max_points: '',
    points_cost: 0,
    icon: 'Star',
    color: 'text-gray-500',
    description: '',
    benefits: [''],
    is_active: true,
  });

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_level_definitions')
        .select('*')
        .order('level_order', { ascending: true });

      if (error) throw error;
      setLevels((data || []) as Level[]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingLevel(null);
    setFormData({
      level_code: '',
      level_name: '',
      level_order: levels.length + 1,
      min_points: 0,
      max_points: '',
      points_cost: 0,
      icon: 'Star',
      color: 'text-gray-500',
      description: '',
      benefits: [''],
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (level: Level) => {
    setEditingLevel(level);
    const benefitsArray = Array.isArray(level.benefits) ? level.benefits as string[] : [''];
    setFormData({
      level_code: level.level_code,
      level_name: level.level_name,
      level_order: level.level_order,
      min_points: level.min_points,
      max_points: level.max_points?.toString() || '',
      points_cost: level.points_cost || 0,
      icon: level.icon,
      color: level.color,
      description: level.description || '',
      benefits: benefitsArray.length > 0 ? benefitsArray : [''],
      is_active: level.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const levelData = {
        level_code: formData.level_code.toLowerCase().trim(),
        level_name: formData.level_name.trim(),
        level_order: formData.level_order,
        min_points: formData.min_points,
        max_points: formData.max_points ? parseInt(formData.max_points) : null,
        points_cost: formData.points_cost,
        icon: formData.icon,
        color: formData.color,
        description: formData.description.trim() || null,
        benefits: formData.benefits.filter(b => b.trim() !== ''),
        is_active: formData.is_active,
      };

      if (editingLevel) {
        const { error } = await supabase
          .from('customer_level_definitions')
          .update(levelData)
          .eq('id', editingLevel.id);

        if (error) throw error;

        toast({
          title: 'Nivel actualizado',
          description: `${levelData.level_name} ha sido actualizado correctamente.`,
        });
      } else {
        const { error } = await supabase
          .from('customer_level_definitions')
          .insert(levelData);

        if (error) throw error;

        toast({
          title: 'Nivel creado',
          description: `${levelData.level_name} ha sido creado correctamente.`,
        });
      }

      setDialogOpen(false);
      loadLevels();
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

  const handleDelete = async () => {
    if (!deletingLevel) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('customer_level_definitions')
        .delete()
        .eq('id', deletingLevel.id);

      if (error) throw error;

      toast({
        title: 'Nivel eliminado',
        description: `${deletingLevel.level_name} ha sido eliminado.`,
      });

      setDeleteDialogOpen(false);
      setDeletingLevel(null);
      loadLevels();
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

  const addBenefitField = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, ''],
    }));
  };

  const removeBenefitField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => i === index ? value : b),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Gestión de Niveles
          </h2>
          <p className="text-muted-foreground mt-1">
            Administra los niveles de fidelización y sus beneficios
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Nivel
        </Button>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          Los niveles se asignan según los <strong>puntos</strong> del cliente (1 punto = $100 gastados en ventas reales).
          Al alcanzar un nivel, se consumen los puntos indicados en "Costo en puntos".
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Niveles Configurados</CardTitle>
          <CardDescription>
            {levels.length} nivel{levels.length !== 1 ? 'es' : ''} registrado{levels.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay niveles configurados</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                Crear primer nivel
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rango Puntos</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Beneficios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell>
                      <Badge variant="outline">{level.level_order}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {level.level_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Award className={`h-4 w-4 ${level.color}`} />
                        <span className="font-medium">{level.level_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{level.min_points}</span>
                        {' - '}
                        <span className="font-medium">
                          {level.max_points ?? '∞'}
                        </span>
                        {' puntos'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {Array.isArray(level.benefits) ? level.benefits.length : 0} beneficio{Array.isArray(level.benefits) && level.benefits.length !== 1 ? 's' : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={level.is_active ? 'default' : 'secondary'}>
                        {level.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(level)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingLevel(level);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLevel ? 'Editar Nivel' : 'Crear Nuevo Nivel'}
            </DialogTitle>
            <DialogDescription>
              {editingLevel 
                ? 'Modifica los datos del nivel existente' 
                : 'Define el nuevo nivel de fidelización'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level_code">Código</Label>
                <Input
                  id="level_code"
                  placeholder="ej: iniciado"
                  value={formData.level_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, level_code: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level_name">Nombre</Label>
                <Input
                  id="level_name"
                  placeholder="ej: Iniciado"
                  value={formData.level_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, level_name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level_order">Orden</Label>
                <Input
                  id="level_order"
                  type="number"
                  min="1"
                  value={formData.level_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, level_order: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_points">Puntos Mínimos</Label>
                <Input
                  id="min_points"
                  type="number"
                  min="0"
                  value={formData.min_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_points: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_points">Puntos Máximos</Label>
                <Input
                  id="max_points"
                  type="number"
                  placeholder="Vacío = ilimitado"
                  value={formData.max_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_points: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points_cost">Costo en puntos (se consumen al subir)</Label>
              <Input
                id="points_cost"
                type="number"
                min="0"
                value={formData.points_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, points_cost: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Puntos que se descuentan del saldo del cliente al alcanzar este nivel. 0 = gratis.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Ícono</Label>
                <select
                  id="icon"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                >
                  {ICON_OPTIONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <select
                  id="color"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                >
                  {COLOR_OPTIONS.map(color => (
                    <option key={color.value} value={color.value}>{color.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del nivel..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Beneficios</Label>
                <Button type="button" variant="outline" size="sm" onClick={addBenefitField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="ej: 5% descuento en productos"
                      value={benefit}
                      onChange={(e) => updateBenefit(index, e.target.value)}
                    />
                    {formData.benefits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBenefitField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <Label htmlFor="is_active" className="cursor-pointer">
                Nivel Activo
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingLevel ? 'Actualizar' : 'Crear'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmación de Eliminación */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar nivel?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El nivel{' '}
              <strong>{deletingLevel?.level_name}</strong> será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingLevel(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
