import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AllianceCouponOption, MarketingAlliance, MarketingAllianceInput } from '@/hooks/useMarketingAlliances';
import { CouponTimeWindowEditor } from '@/components/coupons/CouponTimeWindowEditor';
import { useCustomerTags } from '@/hooks/useCustomerTags';
import { formatCurrency } from '@/lib/utils';

interface AllianceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alliance?: MarketingAlliance | null;
  coupons?: AllianceCouponOption[];
  isLoadingCoupons?: boolean;
  onSave: (data: MarketingAllianceInput | (Partial<MarketingAlliance> & { id: string })) => Promise<void>;
}

const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const formatCouponBenefit = (coupon: AllianceCouponOption) => {
  if (coupon.affects_delivery) {
    if (coupon.delivery_mode === 'free') return 'Delivery gratis';
    return `Delivery ${formatCurrency(Number(coupon.delivery_amount || coupon.amount || 0))}`;
  }

  if (coupon.type === 'percent' || coupon.type === 'percentage') return `${Number(coupon.amount)}%`;
  if (coupon.type === 'fixed') return formatCurrency(Number(coupon.amount || 0));
  return coupon.type;
};

export function AllianceFormModal({ open, onOpenChange, alliance, coupons = [], isLoadingCoupons = false, onSave }: AllianceFormModalProps) {
  const [saving, setSaving] = useState(false);
  const { tags, createTag } = useCustomerTags();
  const [form, setForm] = useState({
    name: '',
    type: 'empresa_aliada',
    slug: '',
    description: '',
    is_active: true,
    starts_at: '',
    ends_at: '',
    welcome_runas: 0,
    coupon_id: '',
    free_delivery_first_order: false,
    free_delivery_addresses_text: '',
    free_delivery_min_amount: '',
    free_delivery_time_windows: undefined as Record<string, string[]> | undefined,
    usage_limit: '',
    once_per_customer: true,
    internal_notes: '',
    auto_tag_id: '__none__',
  });

  useEffect(() => {
    if (alliance) {
      setForm({
        name: alliance.name,
        type: alliance.type,
        slug: alliance.slug,
        description: alliance.description || '',
        is_active: alliance.is_active,
        starts_at: alliance.starts_at?.slice(0, 10) || '',
        ends_at: alliance.ends_at?.slice(0, 10) || '',
        welcome_runas: alliance.welcome_runas || 0,
        coupon_id: alliance.coupon_id || '__none__',
        free_delivery_first_order: alliance.free_delivery_first_order,
        free_delivery_addresses_text: (alliance.free_delivery_addresses || []).join('\n'),
        usage_limit: alliance.usage_limit ? String(alliance.usage_limit) : '',
        once_per_customer: alliance.once_per_customer,
        internal_notes: alliance.internal_notes || '',
        auto_tag_id: alliance.auto_tag_id || '__none__',
      });
    } else {
      setForm({ name: '', type: 'empresa_aliada', slug: '', description: '', is_active: true, starts_at: '', ends_at: '', welcome_runas: 0, coupon_id: '__none__', free_delivery_first_order: false, free_delivery_addresses_text: '', usage_limit: '', once_per_customer: true, internal_notes: '', auto_tag_id: '__none__' });
    }
  }, [alliance, open]);

  const publicUrl = useMemo(() => `${window.location.origin}/a/${form.slug || 'slug'}`, [form.slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: MarketingAllianceInput = {
        name: form.name.trim(),
        type: form.type as MarketingAllianceInput['type'],
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        welcome_runas: Number(form.welcome_runas) || 0,
        coupon_id: form.coupon_id === '__none__' ? null : form.coupon_id,
        free_delivery_first_order: form.free_delivery_first_order,
        free_delivery_addresses: form.free_delivery_addresses_text.split('\n').map(address => address.trim()).filter(Boolean),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        once_per_customer: form.once_per_customer,
        internal_notes: form.internal_notes.trim() || null,
        auto_tag_id: form.auto_tag_id === '__none__' ? null : form.auto_tag_id,
      };
      await onSave(alliance ? { ...payload, id: alliance.id } : payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{alliance ? 'Editar alianza' : 'Crear alianza'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value, slug: prev.slug || slugify(e.target.value) }))} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(value) => setForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa_aliada">Empresa aliada</SelectItem>
                  <SelectItem value="embajador">Embajador</SelectItem>
                  <SelectItem value="convenio">Convenio</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slug público</Label>
            <Input value={form.slug} onChange={(e) => setForm(prev => ({ ...prev, slug: slugify(e.target.value) }))} required />
            <p className="text-xs text-muted-foreground break-all">{publicUrl}</p>
          </div>

          <div className="space-y-2">
            <Label>Descripción pública</Label>
            <Textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Inicio</Label><Input type="date" value={form.starts_at} onChange={(e) => setForm(prev => ({ ...prev, starts_at: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Término</Label><Input type="date" value={form.ends_at} onChange={(e) => setForm(prev => ({ ...prev, ends_at: e.target.value }))} /></div>
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold">Beneficios</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Runas registro</Label><Input type="number" min="0" value={form.welcome_runas} onChange={(e) => setForm(prev => ({ ...prev, welcome_runas: Number(e.target.value) }))} /></div>
              <div className="space-y-2 md:col-span-2">
                <Label>Cupón asociado</Label>
                <Select value={form.coupon_id} onValueChange={(value) => setForm(prev => ({ ...prev, coupon_id: value }))} disabled={isLoadingCoupons}>
                  <SelectTrigger><SelectValue placeholder={isLoadingCoupons ? 'Cargando cupones...' : 'Seleccionar cupón'} /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="__none__">Sin cupón</SelectItem>
                    {coupons.map((coupon) => (
                      <SelectItem key={coupon.id} value={coupon.id}>
                        {coupon.code} · {formatCouponBenefit(coupon)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  El cupón define sus reglas (categorías, días, % descuento, monto mínimo). Para que sea solo de primera compra, configúralo con "Límite por cliente = 1" en Cupones; sin límite será permanente.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
              <Label>Delivery gratis primera compra</Label>
              <Switch checked={form.free_delivery_first_order} onCheckedChange={(checked) => setForm(prev => ({ ...prev, free_delivery_first_order: checked }))} />
            </div>
            <div className="space-y-2">
              <Label>Direcciones exactas con delivery gratis</Label>
              <Textarea
                value={form.free_delivery_addresses_text}
                onChange={(e) => setForm(prev => ({ ...prev, free_delivery_addresses_text: e.target.value }))}
                rows={3}
                placeholder="Av. Providencia 1234, Providencia&#10;Nueva Costanera 4567, Vitacura"
              />
              <p className="text-xs text-muted-foreground">Una dirección por línea. Debe coincidir con la dirección guardada por el cliente.</p>
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Label>Etiqueta automática del cliente</Label>
              <div className="flex gap-2">
                <Select value={form.auto_tag_id} onValueChange={(value) => setForm(prev => ({ ...prev, auto_tag_id: value }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Sin etiqueta" /></SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="__none__">Sin etiqueta</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const name = window.prompt('Nombre de la nueva etiqueta:');
                    if (!name?.trim()) return;
                    const newTag = await createTag({ name: name.trim(), color: '#6366f1', description: null });
                    if (newTag) setForm(prev => ({ ...prev, auto_tag_id: (newTag as any).id }));
                  }}
                >
                  Nueva
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Los clientes que se registren por esta alianza recibirán esta etiqueta automáticamente.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Límite usos</Label><Input type="number" min="1" value={form.usage_limit} onChange={(e) => setForm(prev => ({ ...prev, usage_limit: e.target.value }))} placeholder="Sin límite" /></div>
            <div className="flex items-center justify-between rounded-md border p-3 mt-6"><Label>Activa</Label><Switch checked={form.is_active} onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))} /></div>
          </div>

          <div className="space-y-2">
            <Label>Notas internas</Label>
            <Textarea value={form.internal_notes} onChange={(e) => setForm(prev => ({ ...prev, internal_notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
