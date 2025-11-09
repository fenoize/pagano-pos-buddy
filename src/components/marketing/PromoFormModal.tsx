import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MarketingPromotion } from '@/hooks/useMarketingPromotions';
import { useAppProducts } from '@/hooks/useAppProducts';
import { format } from 'date-fns';

interface PromoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (promo: any) => Promise<void>;
  promo?: MarketingPromotion | null;
}

const CTA_TYPE_OPTIONS = [
  { value: 'open_menu', label: 'Abrir Menú' },
  { value: 'open_cart', label: 'Abrir Carrito' },
  { value: 'open_orders', label: 'Abrir Mis Pedidos' },
  { value: 'open_benefits', label: 'Abrir Beneficios' },
  { value: 'open_product', label: 'Ir a Producto' },
  { value: 'open_custom_url', label: 'Abrir URL personalizada' },
  { value: 'none', label: 'Sin acción' },
];

export function PromoFormModal({ open, onClose, onSave, promo }: PromoFormModalProps) {
  const { data: products, isLoading: productsLoading } = useAppProducts();
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    cta_label: '',
    cta_type: 'open_menu' as MarketingPromotion['cta_type'],
    cta_url: '',
    product_id: '',
    image_url: '',
    is_active: true,
    priority: 1,
    start_date: '',
    end_date: '',
  });
  const [noEndDate, setNoEndDate] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (promo) {
      setFormData({
        title: promo.title,
        subtitle: promo.subtitle || '',
        description: promo.description || '',
        cta_label: promo.cta_label || '',
        cta_type: promo.cta_type,
        cta_url: promo.cta_url || '',
        product_id: (promo as any).product_id || '',
        image_url: promo.image_url || '',
        is_active: promo.is_active,
        priority: promo.priority,
        start_date: promo.start_date || '',
        end_date: promo.end_date || '',
      });
      setNoEndDate(!promo.end_date);
    } else {
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        cta_label: '',
        cta_type: 'open_menu',
        cta_url: '',
        product_id: '',
        image_url: '',
        is_active: true,
        priority: 1,
        start_date: '',
        end_date: '',
      });
      setNoEndDate(true);
    }
  }, [promo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    if (formData.cta_type === 'open_custom_url' && !formData.cta_url.trim()) {
      return;
    }

    if (formData.cta_type === 'open_product' && !formData.product_id) {
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        subtitle: formData.subtitle.trim() || null,
        description: formData.description.trim() || null,
        cta_label: formData.cta_label.trim() || null,
        cta_url: formData.cta_url.trim() || null,
        product_id: formData.product_id || null,
        image_url: formData.image_url.trim() || null,
        start_date: formData.start_date || null,
        end_date: noEndDate ? null : (formData.end_date || null),
      };

      if (promo) {
        await onSave({ id: promo.id, ...dataToSave });
      } else {
        await onSave(dataToSave);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{promo ? 'Editar' : 'Crear'} Promoción</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="¡Promoción Especial!"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtítulo</Label>
            <Input
              id="subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Descubre nuestras ofertas exclusivas"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción más detallada de la promoción..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_type">Tipo de acción</Label>
              <Select
                value={formData.cta_type}
                onValueChange={(value) => setFormData({ ...formData, cta_type: value as any })}
              >
                <SelectTrigger id="cta_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CTA_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta_label">Texto del botón</Label>
              <Input
                id="cta_label"
                value={formData.cta_label}
                onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                placeholder="Ver Menú"
                disabled={formData.cta_type === 'none'}
              />
            </div>
          </div>

          {formData.cta_type === 'open_custom_url' && (
            <div className="space-y-2">
              <Label htmlFor="cta_url">URL personalizada *</Label>
              <Input
                id="cta_url"
                value={formData.cta_url}
                onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                placeholder="https://ejemplo.com o /ruta-interna"
                required
              />
            </div>
          )}

          {formData.cta_type === 'open_product' && (
            <div className="space-y-2">
              <Label htmlFor="product_id">Producto *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger id="product_id">
                  <SelectValue placeholder={productsLoading ? 'Cargando productos...' : 'Selecciona un producto'} />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                El cliente será redirigido a la página del producto seleccionado
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="image_url">URL de imagen (opcional)</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Vacío = vigente desde ya</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  disabled={noEndDate}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="no_end_date"
                    checked={noEndDate}
                    onCheckedChange={(checked) => {
                      setNoEndDate(checked as boolean);
                      if (checked) setFormData({ ...formData, end_date: '' });
                    }}
                  />
                  <Label htmlFor="no_end_date" className="text-xs cursor-pointer">
                    Sin fecha de término
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="99"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-muted-foreground">
                Menor número = mayor prioridad. La promo con menor prioridad activa será la que se muestre en la app.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Activo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : promo ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
