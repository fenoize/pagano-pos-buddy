import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, Radio, ChevronDown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSalesChannels,
  SalesChannel,
  SalesChannelType,
} from '@/hooks/useSalesChannels';
import { supabase } from '@/integrations/supabase/client';

const TYPE_LABELS: Record<SalesChannelType, string> = {
  local: 'Local',
  delivery_app: 'App de Delivery',
  web: 'Web',
  phone: 'Teléfono',
};

const TYPE_BADGE_CLASS: Record<SalesChannelType, string> = {
  local: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
  delivery_app: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  web: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  phone: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

type FormState = {
  id?: string;
  name: string;
  slug: string;
  type: SalesChannelType;
  color: string;
  position: number;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  type: 'local',
  color: '#475569',
  position: 0,
};

export default function SalesChannelsConfig() {
  const { channels, isLoading, createChannel, updateChannel, toggleActive, deleteChannel } =
    useSalesChannels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, position: (channels.at(-1)?.position ?? 0) + 1 });
    setEditing(false);
    setSlugManuallyEdited(false);
    setDialogOpen(true);
  };

  const openEdit = (c: SalesChannel) => {
    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      type: c.type,
      color: c.color ?? '#475569',
      position: c.position,
    });
    setEditing(true);
    setSlugManuallyEdited(true);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Nombre y slug son obligatorios');
      return;
    }
    try {
      if (editing && form.id) {
        await updateChannel.mutateAsync({
          id: form.id,
          name: form.name.trim(),
          slug: form.slug.trim(),
          type: form.type,
          color: form.color,
          position: form.position,
        });
        toast.success('Canal actualizado');
      } else {
        await createChannel.mutateAsync({
          name: form.name.trim(),
          slug: form.slug.trim(),
          type: form.type,
          color: form.color,
          position: form.position,
          active: true,
          integration_enabled: false,
        });
        toast.success('Canal creado');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error('Error', { description: e?.message ?? 'No se pudo guardar el canal' });
    }
  };

  const handleDelete = async (c: SalesChannel) => {
    try {
      await deleteChannel.mutateAsync({ id: c.id, slug: c.slug });
      toast.success('Canal eliminado');
    } catch (e: any) {
      toast.error('No se pudo eliminar', { description: e?.message });
    }
  };

  const handleToggle = async (c: SalesChannel, active: boolean) => {
    try {
      await toggleActive.mutateAsync({ id: c.id, active });
    } catch (e: any) {
      toast.error('Error', { description: e?.message });
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Canales de Venta
              </CardTitle>
              <CardDescription>
                Administra los canales por los que ingresan las órdenes (Local, Apps de delivery,
                Web, Teléfono). Los canales inactivos no se muestran en Nueva Venta.
              </CardDescription>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo canal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Cargando canales…</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Integración</TableHead>
                    <TableHead className="text-center">Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((c) => (
                    <ChannelRow
                      key={c.id}
                      channel={c}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))}
                  {channels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No hay canales configurados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar canal' : 'Nuevo canal'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifica los datos del canal seleccionado.'
                : 'Define un nuevo canal de venta.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: slugManuallyEdited ? f.slug : slugify(name),
                  }));
                }}
                placeholder="Ej: Rappi"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                placeholder="rappi"
                disabled={editing}
              />
              {editing && (
                <p className="text-xs text-muted-foreground mt-1">
                  El slug no se puede modificar para preservar las órdenes ya registradas.
                </p>
              )}
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as SalesChannelType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="delivery_app">App de Delivery</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-9 w-12 rounded border bg-background cursor-pointer"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Posición</Label>
                <Input
                  type="number"
                  value={form.position}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, position: parseInt(e.target.value || '0', 10) }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>{editing ? 'Guardar cambios' : 'Crear canal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function ChannelRow({
  channel,
  onEdit,
  onDelete,
  onToggle,
}: {
  channel: SalesChannel;
  onEdit: (c: SalesChannel) => void;
  onDelete: (c: SalesChannel) => void;
  onToggle: (c: SalesChannel, active: boolean) => void;
}) {
  const [canDelete, setCanDelete] = useState<boolean | null>(null);
  const [integrationOpen, setIntegrationOpen] = useState(false);

  const ensureCanDelete = async () => {
    if (canDelete !== null) return canDelete;
    try {
      const { data } = await (supabase as any).rpc('can_delete_sales_channel', {
        channel_slug: channel.slug,
      });
      const result = !!data;
      setCanDelete(result);
      return result;
    } catch {
      setCanDelete(false);
      return false;
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <span
            className="inline-block h-4 w-4 rounded-full border"
            style={{ backgroundColor: channel.color ?? '#999' }}
            aria-label={`Color ${channel.color}`}
          />
        </TableCell>
        <TableCell className="font-medium">{channel.name}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">{channel.slug}</TableCell>
        <TableCell>
          <Badge variant="outline" className={TYPE_BADGE_CLASS[channel.type]}>
            {TYPE_LABELS[channel.type]}
          </Badge>
        </TableCell>
        <TableCell>
          {channel.integration_enabled ? (
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
              Integración activa
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <Switch
            checked={channel.active}
            onCheckedChange={(v) => onToggle(channel, v)}
            aria-label={`Activo ${channel.name}`}
          />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(channel)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onMouseEnter={() => {
                      void ensureCanDelete();
                    }}
                    onClick={async () => {
                      const ok = await ensureCanDelete();
                      if (!ok) {
                        toast.error('No se puede eliminar', {
                          description: 'Este canal tiene órdenes asociadas. Solo puedes desactivarlo.',
                        });
                        return;
                      }
                      if (confirm(`¿Eliminar el canal "${channel.name}"?`)) {
                        onDelete(channel);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {canDelete === false
                  ? 'Tiene órdenes asociadas — desactívalo'
                  : 'Eliminar canal'}
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>
      {channel.type === 'delivery_app' && (
        <TableRow className="bg-muted/30">
          <TableCell></TableCell>
          <TableCell colSpan={6} className="py-2">
            <Collapsible open={integrationOpen} onOpenChange={setIntegrationOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8 text-xs">
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${integrationOpen ? 'rotate-180' : ''}`}
                  />
                  Configuración de integración
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 pl-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  Integración disponible próximamente
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
