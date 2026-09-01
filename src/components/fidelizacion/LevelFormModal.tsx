import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Plus, Save, Ticket, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LevelIcon, LEVEL_ICON_NAMES } from './LevelIcon';
import type { Level, LevelInput } from '@/hooks/useCustomerLevels';
import { cn } from '@/lib/utils';

export const LEVEL_COLORS = [
  { value: 'text-gray-400', label: 'Gris' },
  { value: 'text-green-500', label: 'Verde' },
  { value: 'text-blue-500', label: 'Azul' },
  { value: 'text-indigo-500', label: 'Índigo' },
  { value: 'text-violet-500', label: 'Violeta' },
  { value: 'text-orange-500', label: 'Naranja' },
  { value: 'text-amber-500', label: 'Ámbar' },
  { value: 'text-red-500', label: 'Rojo' },
  { value: 'text-yellow-400', label: 'Amarillo' },
];

export type BenefitItem = string | Record<string, string>;

interface FormState {
  level_code: string;
  level_name: string;
  level_order: number;
  min_points: number;
  max_points: string;
  is_last_level: boolean;
  points_cost: number;
  icon: string;
  color: string;
  description: string;
  benefits: BenefitItem[];
  is_active: boolean;
}

const emptyForm = (nextOrder: number): FormState => ({
  level_code: '',
  level_name: '',
  level_order: nextOrder,
  min_points: 0,
  max_points: '',
  is_last_level: false,
  points_cost: 0,
  icon: 'Star',
  color: 'text-gray-400',
  description: '',
  benefits: [''],
  is_active: true,
});

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLevel: Level | null;
  existingLevels: Level[];
  onSave: (input: LevelInput, id?: string) => Promise<void>;
  saving: boolean;
}

export function LevelFormModal({ open, onOpenChange, editingLevel, existingLevels, onSave, saving }: Props) {
  const [form, setForm] = useState<FormState>(() => emptyForm(existingLevels.length + 1));
  const [codeTouched, setCodeTouched] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [couponSearchOpen, setCouponSearchOpen] = useState(false);
  const [couponQuery, setCouponQuery] = useState('');
  const [couponResults, setCouponResults] = useState<{ id: string; code: string; description: string | null }[]>([]);

  const hasLevelCoupon = form.benefits.some(
    (b) => typeof b !== 'string' && (b as Record<string, string>).type === 'level_coupon'
  );

  useEffect(() => {
    if (!couponSearchOpen) return;
    const term = couponQuery.trim();
    const timer = setTimeout(async () => {
      let query = supabase
        .from('coupons')
        .select('id, code, description')
        .eq('is_active', true)
        .order('code')
        .limit(20);
      if (term) query = query.ilike('code', `%${term}%`);
      const { data } = await query;
      setCouponResults(data || []);
    }, 250);
    return () => clearTimeout(timer);
  }, [couponQuery, couponSearchOpen]);



  useEffect(() => {
    if (!open) return;
    setErrors([]);
    if (editingLevel) {
      const benefits = Array.isArray(editingLevel.benefits) ? (editingLevel.benefits as BenefitItem[]) : [];
      setForm({
        level_code: editingLevel.level_code,
        level_name: editingLevel.level_name,
        level_order: editingLevel.level_order,
        min_points: editingLevel.min_points,
        max_points: editingLevel.max_points?.toString() || '',
        is_last_level: editingLevel.max_points === null,
        points_cost: editingLevel.points_cost || 0,
        icon: editingLevel.icon || 'Star',
        color: editingLevel.color || 'text-gray-400',
        description: editingLevel.description || '',
        benefits: benefits.length > 0 ? benefits : [''],
        is_active: editingLevel.is_active ?? true,
      });
      setCodeTouched(true);
    } else {
      setForm(emptyForm(existingLevels.length + 1));
      setCodeTouched(false);
    }
  }, [open, editingLevel, existingLevels]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string[] => {
    const errs: string[] = [];
    const code = form.level_code.trim();
    const maxPoints = form.is_last_level ? null : form.max_points ? parseInt(form.max_points, 10) : null;

    if (!form.level_name.trim()) errs.push('El nombre es obligatorio.');
    if (!code) errs.push('El código es obligatorio.');
    if (code && !/^[a-z0-9_]+$/.test(code)) errs.push('El código solo puede tener letras minúsculas, números y guión bajo.');
    if (code && existingLevels.some((l) => l.level_code === code && l.id !== editingLevel?.id)) {
      errs.push(`Ya existe un nivel con el código "${code}".`);
    }
    if (!form.is_last_level) {
      if (maxPoints === null || isNaN(maxPoints)) {
        errs.push('Indica los puntos máximos o marca "Último nivel (sin límite)".');
      } else if (maxPoints <= form.min_points) {
        errs.push('Los puntos máximos deben ser mayores a los mínimos.');
      }
    }
    const previous = [...existingLevels]
      .filter((l) => l.id !== editingLevel?.id && l.level_order < form.level_order)
      .sort((a, b) => b.level_order - a.level_order)[0];
    if (previous && previous.max_points !== null && form.min_points <= previous.max_points) {
      errs.push(`Los puntos mínimos deben ser mayores al máximo del nivel anterior (${previous.level_name}: ${previous.max_points}).`);
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    const input: LevelInput = {
      level_code: form.level_code.trim(),
      level_name: form.level_name.trim(),
      level_order: form.level_order,
      min_points: form.min_points,
      max_points: form.is_last_level ? null : parseInt(form.max_points, 10),
      points_cost: form.points_cost,
      icon: form.icon,
      color: form.color,
      description: form.description.trim() || null,
      benefits: form.benefits.filter((b) => (typeof b === 'string' ? b.trim() !== '' : true)),
      is_active: form.is_active,
    };
    await onSave(input, editingLevel?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingLevel ? 'Editar Nivel' : 'Crear Nuevo Nivel'}</DialogTitle>
          <DialogDescription>
            {editingLevel ? 'Modifica los datos del nivel existente' : 'Define el nuevo nivel de fidelización'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <LevelIcon icon={form.icon} color={form.color} className="h-8 w-8" />
          <div>
            <p className="font-semibold leading-tight">{form.level_name || 'Nombre del nivel'}</p>
            <p className="text-xs text-muted-foreground">
              {form.min_points} – {form.is_last_level ? '∞' : form.max_points || '?'} puntos
            </p>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level_name">Nombre del nivel</Label>
              <Input
                id="level_name"
                placeholder="ej: Guerrero Pagano"
                value={form.level_name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    level_name: name,
                    level_code: codeTouched ? prev.level_code : slugify(name),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level_code">Código</Label>
              <Input
                id="level_code"
                placeholder="ej: guerrero"
                value={form.level_code}
                onChange={(e) => {
                  setCodeTouched(true);
                  set('level_code', e.target.value.toLowerCase());
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level_order">Orden</Label>
              <Input
                id="level_order"
                type="number"
                min={1}
                value={form.level_order}
                onChange={(e) => set('level_order', parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_points">Puntos mínimos</Label>
              <Input
                id="min_points"
                type="number"
                min={0}
                value={form.min_points}
                onChange={(e) => set('min_points', parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_points">Puntos máximos</Label>
              <Input
                id="max_points"
                type="number"
                disabled={form.is_last_level}
                placeholder="Sin límite"
                value={form.is_last_level ? '' : form.max_points}
                onChange={(e) => set('max_points', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_last_level"
              checked={form.is_last_level}
              onCheckedChange={(checked) => set('is_last_level', checked === true)}
            />
            <Label htmlFor="is_last_level" className="cursor-pointer font-normal">
              Último nivel (sin límite)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points_cost">Costo en puntos</Label>
            <Input
              id="points_cost"
              type="number"
              min={0}
              value={form.points_cost}
              onChange={(e) => set('points_cost', parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Campo informativo, sin efecto actual en la progresión de nivel.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Ícono</Label>
            <div className="grid grid-cols-6 gap-2">
              {LEVEL_ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => set('icon', name)}
                  title={name}
                  className={cn(
                    'flex items-center justify-center rounded-md border p-2 transition-colors',
                    form.icon === name
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <LevelIcon icon={name} color={form.color} className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {LEVEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('color', c.value)}
                  title={c.label}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                    form.color === c.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <span className={cn('h-3.5 w-3.5 rounded-full bg-current', c.value)} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Descripción del nivel..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Beneficios</Label>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={hasLevelCoupon}
                          onClick={() => setCouponSearchOpen((v) => !v)}
                        >
                          <Ticket className="h-4 w-4 mr-1" />
                          Vincular cupón de nivel
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {hasLevelCoupon && (
                      <TooltipContent>Ya hay un cupón de nivel vinculado</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set('benefits', [...form.benefits, ''])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar beneficio
                </Button>
              </div>
            </div>

            {couponSearchOpen && !hasLevelCoupon && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <Input
                  placeholder="Buscar cupón por código..."
                  value={couponQuery}
                  onChange={(e) => setCouponQuery(e.target.value.toUpperCase())}
                />
                {couponResults.length === 0 && couponQuery.trim().length > 0 && (
                  <p className="text-xs text-muted-foreground">Sin resultados.</p>
                )}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {couponResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        set('benefits', [
                          ...form.benefits,
                          {
                            type: 'level_coupon',
                            coupon_id: c.id,
                            coupon_code: c.code,
                            label: c.description || c.code,
                          },
                        ]);
                        setCouponSearchOpen(false);
                        setCouponQuery('');
                      }}
                      className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="font-medium">{c.code}</span>
                      <span className="text-xs text-muted-foreground truncate">{c.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {form.benefits.map((benefit, index) => {
                if (typeof benefit !== 'string') {
                  const b = benefit as Record<string, string>;
                  return (
                    <div
                      key={`coupon-${index}`}
                      className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2"
                    >
                      <Ticket className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm">{b.coupon_code}</span>
                      <Badge variant="secondary">Cupón vinculado</Badge>
                      <span className="text-xs text-muted-foreground truncate flex-1">{b.label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => set('benefits', form.benefits.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }
                return (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="ej: 5% descuento en productos"
                      value={benefit}
                      onChange={(e) =>
                        set('benefits', form.benefits.map((b, i) => (i === index ? e.target.value : b)))
                      }
                    />
                    {form.benefits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => set('benefits', form.benefits.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="is_active" className="cursor-pointer">
              Nivel activo
            </Label>
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(checked) => set('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
