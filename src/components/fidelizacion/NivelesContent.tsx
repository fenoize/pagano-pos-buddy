import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerLevels, useLevelMutations, type LevelInput, type LevelWithCount } from '@/hooks/useCustomerLevels';
import { LevelIcon } from './LevelIcon';
import { LevelFormModal } from './LevelFormModal';
import { LevelDetailSheet } from './LevelDetailSheet';
import { formatCLP } from '@/lib/utils';

const rangeLabel = (level: LevelWithCount) =>
  `${level.min_points} – ${level.max_points ?? '∞'}`;

const clpLabel = (level: LevelWithCount) =>
  `${formatCLP(level.min_points * 100)} – ${level.max_points ? formatCLP(level.max_points * 100) : '∞'}`;

export function NivelesContent() {
  const { data: levels = [], isLoading } = useCustomerLevels();
  const { createLevel, updateLevel, toggleActive, deleteLevel } = useLevelMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LevelWithCount | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<LevelWithCount | null>(null);
  const [detailLevel, setDetailLevel] = useState<LevelWithCount | null>(null);
  const [saving, setSaving] = useState(false);

  const savingAny =
    saving || createLevel.isPending || updateLevel.isPending || deleteLevel.isPending;

  const openCreate = () => {
    setEditingLevel(null);
    setFormOpen(true);
  };

  const openEdit = (level: LevelWithCount) => {
    setEditingLevel(level);
    setFormOpen(true);
  };

  const handleSave = async (input: LevelInput, id?: string) => {
    setSaving(true);
    try {
      if (id) {
        await updateLevel.mutateAsync({ id, ...input });
        toast.success('Nivel actualizado', { description: `${input.level_name} ha sido actualizado correctamente.` });
      } else {
        await createLevel.mutateAsync(input);
        toast.success('Nivel creado', { description: `${input.level_name} ha sido creado correctamente.` });
      }
      setFormOpen(false);
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (level: LevelWithCount, active: boolean) => {
    try {
      await toggleActive.mutateAsync({ id: level.id, is_active: active });
      toast.success(active ? 'Nivel activado' : 'Nivel desactivado', { description: level.level_name });
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingLevel) return;
    if (deletingLevel.customer_count > 0) {
      toast.error(
        `No se puede eliminar un nivel con ${deletingLevel.customer_count} clientes activos. Primero reasigna los clientes.`
      );
      return;
    }
    try {
      await deleteLevel.mutateAsync(deletingLevel.id);
      toast.success('Nivel eliminado', { description: `${deletingLevel.level_name} ha sido eliminado.` });
      setDeletingLevel(null);
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
  };

  const benefitsOf = (level: LevelWithCount) =>
    Array.isArray(level.benefits) ? (level.benefits as string[]) : [];

  if (isLoading) {
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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar nivel
        </Button>
      </div>

      <Alert className="mb-6">
        <AlertDescription>
          Los niveles se asignan automáticamente según los <strong>puntos</strong> del cliente (1 punto = $100 en ventas reales),
          usando el rango de puntos de cada nivel.
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
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                Crear primer nivel
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Orden</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Rango de puntos</TableHead>
                      <TableHead>Equivale a</TableHead>
                      <TableHead>Clientes</TableHead>
                      <TableHead>Beneficios</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.map((level) => {
                      const benefits = benefitsOf(level);
                      return (
                        <TableRow
                          key={level.id}
                          className="cursor-pointer"
                          onClick={() => setDetailLevel(level)}
                        >
                          <TableCell>
                            <Badge variant="outline">{level.level_order}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <LevelIcon icon={level.icon} color={level.color} />
                              <div>
                                <p className="font-medium leading-tight">{level.level_name}</p>
                                <code className="text-xs text-muted-foreground">{level.level_code}</code>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium tabular-nums">{rangeLabel(level)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm tabular-nums">{clpLabel(level)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{level.customer_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {benefits.slice(0, 3).map((b) => (
                                <Badge key={b} variant="outline" className="text-xs font-normal">
                                  {b}
                                </Badge>
                              ))}
                              {benefits.length > 3 && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  +{benefits.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={level.is_active ?? false}
                              onCheckedChange={(checked) => handleToggle(level, checked)}
                            />
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-9 w-9" onClick={() => openEdit(level)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 w-9"
                                        disabled={level.customer_count > 0}
                                        onClick={() => setDeletingLevel(level)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {level.customer_count > 0 && (
                                    <TooltipContent>
                                      {level.customer_count} clientes activos en este nivel
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {levels.map((level) => {
                  const benefits = benefitsOf(level);
                  return (
                    <div
                      key={level.id}
                      className="rounded-lg border border-border p-4 space-y-3 cursor-pointer"
                      onClick={() => setDetailLevel(level)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LevelIcon icon={level.icon} color={level.color} className="h-5 w-5" />
                          <div>
                            <p className="font-medium leading-tight">{level.level_name}</p>
                            <code className="text-xs text-muted-foreground">{level.level_code}</code>
                          </div>
                        </div>
                        <Badge variant="outline">#{level.level_order}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Puntos</p>
                          <p className="font-medium tabular-nums">{rangeLabel(level)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Equivale a</p>
                          <p className="font-medium tabular-nums">{clpLabel(level)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clientes</p>
                          <p className="font-medium">{level.customer_count}</p>
                        </div>
                      </div>
                      {benefits.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {benefits.slice(0, 3).map((b) => (
                            <Badge key={b} variant="outline" className="text-xs font-normal">
                              {b}
                            </Badge>
                          ))}
                          {benefits.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal">
                              +{benefits.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div
                        className="flex items-center justify-between pt-2 border-t border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={level.is_active ?? false}
                            onCheckedChange={(checked) => handleToggle(level, checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {level.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-9 w-9" onClick={() => openEdit(level)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9"
                            disabled={level.customer_count > 0}
                            onClick={() => setDeletingLevel(level)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <LevelFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingLevel={editingLevel}
        existingLevels={levels}
        onSave={handleSave}
        saving={savingAny}
      />

      <LevelDetailSheet level={detailLevel} onClose={() => setDetailLevel(null)} />

      <Dialog open={!!deletingLevel} onOpenChange={(open) => !open && setDeletingLevel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar nivel?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El nivel <strong>{deletingLevel?.level_name}</strong> será
              eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLevel(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLevel.isPending}>
              {deleteLevel.isPending ? (
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
