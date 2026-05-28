import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LoyaltyCampaign } from '@/hooks/useLoyaltyCampaigns';
import { useAllProducts } from '@/hooks/useAllProducts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CampaignFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: LoyaltyCampaign | null;
  onSubmit: (data: Omit<LoyaltyCampaign, 'id' | 'created_at'>) => void;
  loading?: boolean;
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  registration: 'Registro de cliente',
  product_purchase: 'Compra de productos',
  accumulated_spend: 'Monto acumulado',
  first_purchase: 'Primera compra',
  runas_multiplier: '✕ Multiplicador de Runas',
};

export function CampaignFormModal({ open, onOpenChange, campaign, onSubmit, loading }: CampaignFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [campaignType, setCampaignType] = useState<LoyaltyCampaign['campaign_type']>('registration');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [rewardRunas, setRewardRunas] = useState(1);
  const [maxClaims, setMaxClaims] = useState<string>('');
  const [onePerCustomer, setOnePerCustomer] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Conditions
  const [productIds, setProductIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [minQuantity, setMinQuantity] = useState(1);
  const [minAmount, setMinAmount] = useState(0);
  const [multiplier, setMultiplier] = useState(2);

  const { data: products = [] } = useAllProducts();
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-campaigns'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name').eq('active', true).order('name');
      return data || [];
    },
  });

  useEffect(() => {
    if (campaign) {
      setTitle(campaign.title);
      setDescription(campaign.description || '');
      setCampaignType(campaign.campaign_type);
      setStartsAt(campaign.starts_at.slice(0, 16));
      setEndsAt(campaign.ends_at.slice(0, 16));
      setRewardRunas(campaign.reward_runas);
      setMaxClaims(campaign.max_claims?.toString() || '');
      setOnePerCustomer(campaign.one_per_customer);
      setIsActive(campaign.is_active);
      const c = campaign.conditions || {};
      setProductIds(c.product_ids || []);
      setCategoryIds(c.category_ids || []);
      setMinQuantity(c.min_quantity || 1);
      setMinAmount(c.min_amount || 0);
      setMultiplier(c.multiplier || 2);
    } else {
      setTitle('');
      setDescription('');
      setCampaignType('registration');
      setStartsAt('');
      setEndsAt('');
      setRewardRunas(1);
      setMaxClaims('');
      setOnePerCustomer(true);
      setIsActive(true);
      setProductIds([]);
      setCategoryIds([]);
      setMinQuantity(1);
      setMinAmount(0);
      setMultiplier(2);
    }
  }, [campaign, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let conditions: Record<string, any> = {};
    if (campaignType === 'product_purchase') {
      conditions = {
        ...(productIds.length > 0 && { product_ids: productIds }),
        ...(categoryIds.length > 0 && { category_ids: categoryIds }),
        min_quantity: minQuantity,
      };
    } else if (campaignType === 'accumulated_spend') {
      conditions = { min_amount: minAmount };
    } else if (campaignType === 'runas_multiplier') {
      conditions = { multiplier };
    }

    onSubmit({
      title,
      description: description || null,
      campaign_type: campaignType,
      is_active: isActive,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      reward_runas: campaignType === 'runas_multiplier' ? 0 : rewardRunas,
      conditions,
      max_claims: maxClaims ? parseInt(maxClaims) : null,
      one_per_customer: onePerCustomer,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Editar campaña' : 'Nueva campaña'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ej: Bonus de bienvenida" />
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción interna" />
          </div>

          <div className="space-y-2">
            <Label>Tipo de campaña</Label>
            <Select value={campaignType} onValueChange={v => setCampaignType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CAMPAIGN_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Inicio</Label>
              <Input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Runas a otorgar</Label>
              <Input type="number" min={1} value={rewardRunas} onChange={e => setRewardRunas(parseInt(e.target.value) || 1)} required />
            </div>
            <div className="space-y-2">
              <Label>Máx. claims (vacío = ilimitado)</Label>
              <Input type="number" min={1} value={maxClaims} onChange={e => setMaxClaims(e.target.value)} placeholder="Ilimitado" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={onePerCustomer} onCheckedChange={setOnePerCustomer} />
            <Label>Solo 1 vez por cliente</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Campaña activa</Label>
          </div>

          {/* Conditional fields */}
          {campaignType === 'product_purchase' && (
            <div className="space-y-3 border rounded-lg p-3">
              <h4 className="font-medium text-sm text-foreground">Condiciones de producto</h4>
              <div className="space-y-2">
                <Label>Categorías (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Button
                      key={cat.id}
                      type="button"
                      size="sm"
                      variant={categoryIds.includes(cat.id) ? 'default' : 'outline'}
                      onClick={() => setCategoryIds(prev =>
                        prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                      )}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Productos específicos (opcional)</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {products.map(p => (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={productIds.includes(p.id) ? 'default' : 'outline'}
                      onClick={() => setProductIds(prev =>
                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      )}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cantidad mínima</Label>
                <Input type="number" min={1} value={minQuantity} onChange={e => setMinQuantity(parseInt(e.target.value) || 1)} />
              </div>
            </div>
          )}

          {campaignType === 'accumulated_spend' && (
            <div className="space-y-3 border rounded-lg p-3">
              <h4 className="font-medium text-sm text-foreground">Condiciones de monto</h4>
              <div className="space-y-2">
                <Label>Monto mínimo (CLP)</Label>
                <Input type="number" min={0} value={minAmount} onChange={e => setMinAmount(parseInt(e.target.value) || 0)} />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {campaign ? 'Guardar cambios' : 'Crear campaña'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
