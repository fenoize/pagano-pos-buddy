import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Layers, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { useVariantGroups } from '@/hooks/useVariantGroups';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function VariantGroupsConfig() {
  const { groups, loading, createGroup, updateGroup, deleteGroup, createOption, updateOption, deleteOption } = useVariantGroups();
  const [newGroupName, setNewGroupName] = useState('');
  const [newOptionNames, setNewOptionNames] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionName, setEditingOptionName] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const ok = await createGroup(newGroupName.trim());
    if (ok) setNewGroupName('');
  };

  const handleCreateOption = async (groupId: string) => {
    const name = newOptionNames[groupId]?.trim();
    if (!name) return;
    await createOption(groupId, name);
    setNewOptionNames(prev => ({ ...prev, [groupId]: '' }));
  };

  if (loading) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">Cargando grupos...</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Grupos de Variantes
          </CardTitle>
          <CardDescription>
            Crea dimensiones adicionales para tus productos (ej: Proteína → Carne / Pollo).
            Luego asígnalas a productos individuales desde el editor de producto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create new group */}
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del grupo (ej: Proteína)"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
            />
            <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Crear
            </Button>
          </div>

          {/* Existing groups */}
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay grupos de variantes creados aún.
            </p>
          )}

          {groups.map(group => {
            const isExpanded = expandedGroups.has(group.id);
            return (
              <Card key={group.id} className="border">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                  onClick={() => toggleExpand(group.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input
                          value={editingGroupName}
                          onChange={e => setEditingGroupName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (editingGroupName.trim()) updateGroup(group.id, { name: editingGroupName.trim() });
                              setEditingGroupId(null);
                            }
                            if (e.key === 'Escape') setEditingGroupId(null);
                          }}
                          className="h-7 w-40"
                          autoFocus
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          if (editingGroupName.trim()) updateGroup(group.id, { name: editingGroupName.trim() });
                          setEditingGroupId(null);
                        }}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGroupId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">{group.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={e => { e.stopPropagation(); setEditingGroupId(group.id); setEditingGroupName(group.name); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Badge variant="secondary">{group.options.length} opciones</Badge>
                    {!group.active && <Badge variant="outline">Inactivo</Badge>}
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Switch
                      checked={group.active}
                      onCheckedChange={active => updateGroup(group.id, { active })}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar grupo "{group.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esto eliminará el grupo y todas sus opciones. Los productos que lo usan perderán esta dimensión.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteGroup(group.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    {/* Options list */}
                    {group.options.map(option => (
                      <div key={option.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span>{option.name}</span>
                          {option.is_default && <Badge variant="secondary" className="text-xs">Predeterminado</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          {!option.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                // Unset all defaults first, then set this one
                                group.options.forEach(o => {
                                  if (o.is_default) updateOption(o.id, { is_default: false });
                                });
                                updateOption(option.id, { is_default: true });
                              }}
                            >
                              Hacer predeterminado
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteOption(option.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add new option */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nueva opción (ej: Pollo)"
                        value={newOptionNames[group.id] || ''}
                        onChange={e => setNewOptionNames(prev => ({ ...prev, [group.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleCreateOption(group.id)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateOption(group.id)}
                        disabled={!newOptionNames[group.id]?.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
