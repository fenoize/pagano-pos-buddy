import { useState } from 'react';
import { useLoyaltyCampaigns, LoyaltyCampaign, useCampaignClaims } from '@/hooks/useLoyaltyCampaigns';
import { CampaignFormModal } from './CampaignFormModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Users, Star, Calendar, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_LABELS: Record<string, string> = {
  registration: 'Registro',
  product_purchase: 'Compra productos',
  accumulated_spend: 'Monto acumulado',
  first_purchase: 'Primera compra',
  runas_multiplier: 'Multiplicador',
};

const TYPE_COLORS: Record<string, string> = {
  registration: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  product_purchase: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  accumulated_spend: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  first_purchase: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  runas_multiplier: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

function getCampaignStatus(c: LoyaltyCampaign): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (!c.is_active) return { label: 'Inactiva', variant: 'secondary' };
  const now = new Date();
  if (now < new Date(c.starts_at)) return { label: 'Programada', variant: 'outline' };
  if (now > new Date(c.ends_at)) return { label: 'Finalizada', variant: 'destructive' };
  return { label: 'Activa', variant: 'default' };
}

export function CampaignsContent() {
  const { campaigns, isLoading, createCampaign, updateCampaign, toggleActive, deleteCampaign } = useLoyaltyCampaigns();
  const [formOpen, setFormOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<LoyaltyCampaign | null>(null);
  const [claimsViewId, setClaimsViewId] = useState<string | null>(null);
  const { data: claims = [], isLoading: claimsLoading } = useCampaignClaims(claimsViewId);

  const handleSubmit = (data: Omit<LoyaltyCampaign, 'id' | 'created_at'>) => {
    if (editCampaign) {
      updateCampaign.mutate({ id: editCampaign.id, ...data }, {
        onSuccess: () => { setFormOpen(false); setEditCampaign(null); },
      });
    } else {
      createCampaign.mutate(data, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Crea campañas para otorgar runas automáticamente a tus clientes
        </p>
        <Button onClick={() => { setEditCampaign(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nueva campaña
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Sin campañas</h3>
            <p className="text-muted-foreground text-sm mt-1">Crea tu primera campaña de runas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(campaign => {
            const status = getCampaignStatus(campaign);
            return (
              <Card key={campaign.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{campaign.title}</CardTitle>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[campaign.campaign_type]}`}>
                          {TYPE_LABELS[campaign.campaign_type]}
                        </span>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={campaign.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: campaign.id, is_active: checked })}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      <span>
                        {campaign.campaign_type === 'runas_multiplier'
                          ? `x${campaign.conditions?.multiplier || 2} RUNAS`
                          : `${campaign.reward_runas} runas`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(campaign.starts_at), 'dd MMM', { locale: es })} – {format(new Date(campaign.ends_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                    {campaign.max_claims && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>Máx. {campaign.max_claims} claims</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setClaimsViewId(campaign.id)}>
                      <Users className="h-3.5 w-3.5 mr-1" /> Ver claims
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditCampaign(campaign); setFormOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => {
                      if (confirm('¿Eliminar esta campaña?')) deleteCampaign.mutate(campaign.id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        campaign={editCampaign}
        onSubmit={handleSubmit}
        loading={createCampaign.isPending || updateCampaign.isPending}
      />

      {/* Claims viewer dialog */}
      <Dialog open={!!claimsViewId} onOpenChange={() => setClaimsViewId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Claims de la campaña</DialogTitle>
          </DialogHeader>
          {claimsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : claims.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Sin claims aún</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim: any) => (
                  <TableRow key={claim.id}>
                    <TableCell>{claim.customers?.name || claim.customers?.email || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(claim.claimed_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
