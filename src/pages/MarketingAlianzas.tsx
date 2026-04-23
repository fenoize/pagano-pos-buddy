import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart3, Copy, ExternalLink, Plus, QrCode, Trash2, Pencil, Users, ShoppingBag, Eye, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AllianceFormModal } from '@/components/marketing/AllianceFormModal';
import { MarketingAlliance, useMarketingAlliances } from '@/hooks/useMarketingAlliances';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  empresa_aliada: 'Empresa aliada',
  embajador: 'Embajador',
  convenio: 'Convenio',
  otro: 'Otro',
};

const eventLabels: Record<string, string> = {
  view: 'Lectura QR',
  signup: 'Registro',
  reward_granted: 'Beneficio entregado',
  purchase: 'Compra',
  reward_redeemed: 'Beneficio usado',
};

const getRange = (value: string) => {
  const now = new Date();
  if (value === 'all') return { start: null, end: null };
  if (value === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: start.toISOString(), end: now.toISOString() };
};

export default function MarketingAlianzas() {
  const [period, setPeriod] = useState('month');
  const range = useMemo(() => getRange(period), [period]);
  const { alliances, availableCoupons, kpis, events, isLoading, isLoadingCoupons, createAlliance, updateAlliance, deleteAlliance } = useMarketingAlliances(range);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingAlliance | null>(null);
  const [selected, setSelected] = useState<MarketingAlliance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totals = kpis.reduce((acc, item) => ({
    views: acc.views + Number(item.views || 0),
    signups: acc.signups + Number(item.signups || 0),
    purchases: acc.purchases + Number(item.purchases || 0),
    revenue: acc.revenue + Number(item.revenue || 0),
  }), { views: 0, signups: 0, purchases: 0, revenue: 0 });

  const selectedKpi = selected ? kpis.find(k => k.alliance_id === selected.id) : null;
  const selectedEvents = selected ? events.filter((event: any) => event.alliance_id === selected.id) : [];
  const publicUrl = (slug: string) => `${window.location.origin}/a/${slug}`;

  const copyUrl = async (slug: string) => {
    await navigator.clipboard.writeText(publicUrl(slug));
    toast.success('URL copiada');
  };

  const handleSave = async (data: any) => {
    if ('id' in data) await updateAlliance(data);
    else await createAlliance(data);
  };

  const openEdit = (alliance: MarketingAlliance) => {
    setEditing(alliance);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteAlliance(deletingId);
      setDeletingId(null);
      if (selected?.id === deletingId) setSelected(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alianzas</h1>
          <p className="text-muted-foreground mt-1">Campañas con QR para empresas, convenios y embajadores.</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes anterior</SelectItem>
              <SelectItem value="all">Todo</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nueva alianza
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" /> Lecturas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.views}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Registros</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.signups}</p><p className="text-xs text-muted-foreground">{totals.views ? Math.round((totals.signups / totals.views) * 100) : 0}% de lectura</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Compras</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totals.purchases}</p><p className="text-xs text-muted-foreground">{totals.signups ? Math.round((totals.purchases / totals.signups) * 100) : 0}% de registro</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Ingresos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="detail" disabled={!selected}>Detalle</TabsTrigger>
          <TabsTrigger value="events"><BarChart3 className="mr-2 h-4 w-4" /> Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campañas activas y embudo</CardTitle>
              <CardDescription>Selecciona una alianza para ver su QR, beneficios y eventos.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : alliances.length === 0 ? (
                <div className="text-center py-12"><p className="text-muted-foreground mb-4">No hay alianzas creadas aún</p><Button onClick={() => setModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Crear primera alianza</Button></div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Alianza</TableHead><TableHead>URL</TableHead><TableHead className="text-right">Lecturas</TableHead><TableHead className="text-right">Registros</TableHead><TableHead className="text-right">Compras</TableHead><TableHead className="text-right">Ingresos</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {alliances.map((alliance) => {
                      const stats = kpis.find(k => k.alliance_id === alliance.id);
                      return (
                        <TableRow key={alliance.id} className="cursor-pointer" onClick={() => setSelected(alliance)}>
                          <TableCell><div className="font-medium">{alliance.name}</div><div className="text-xs text-muted-foreground">{typeLabels[alliance.type]}</div></TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs">/a/{alliance.slug}</TableCell>
                          <TableCell className="text-right">{Number(stats?.views || 0)}</TableCell>
                          <TableCell className="text-right">{Number(stats?.signups || 0)}</TableCell>
                          <TableCell className="text-right">{Number(stats?.purchases || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(stats?.revenue || 0))}</TableCell>
                          <TableCell><Badge variant={alliance.is_active ? 'default' : 'secondary'}>{alliance.is_active ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => copyUrl(alliance.slug)}><Copy className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => window.open(publicUrl(alliance.slug), '_blank')}><ExternalLink className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(alliance)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingId(alliance.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          {selected && (
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> QR de campaña</CardTitle><CardDescription>{selected.name}</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-background p-4 flex justify-center"><QRCodeSVG value={publicUrl(selected.slug)} size={220} /></div>
                  <div className="rounded-lg bg-muted p-3 text-sm break-all">{publicUrl(selected.slug)}</div>
                  <Button className="w-full" onClick={() => copyUrl(selected.slug)}><Copy className="mr-2 h-4 w-4" /> Copiar URL</Button>
                  <p className="text-sm text-muted-foreground">Escanea este código, crea tu cuenta y recibe beneficios exclusivos de {selected.name}.</p>
                </CardContent>
              </Card>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lecturas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Number(selectedKpi?.views || 0)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Registros</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Number(selectedKpi?.signups || 0)}</p></CardContent></Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Compras</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{Number(selectedKpi?.purchases || 0)}</p></CardContent></Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>Beneficios configurados</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{selected.welcome_runas} runas registro</Badge>
                    {selected.coupon_id && <Badge variant="secondary">Cupón primera compra</Badge>}
                    {selected.free_delivery_first_order && <Badge variant="secondary">Delivery gratis primera compra</Badge>}
                    {selected.free_delivery_addresses.length > 0 && <Badge variant="secondary">Delivery gratis en {selected.free_delivery_addresses.length} dirección(es)</Badge>}
                    {selected.usage_limit && <Badge variant="outline">Límite {selected.usage_limit}</Badge>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Historial reciente</CardTitle></CardHeader>
                  <CardContent>
                    <Table><TableHeader><TableRow><TableHead>Evento</TableHead><TableHead>Cliente</TableHead><TableHead>Pedido</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader><TableBody>{selectedEvents.map((event: any) => <TableRow key={event.id}><TableCell>{eventLabels[event.event_type] || event.event_type}</TableCell><TableCell>{event.customers?.name || '—'}</TableCell><TableCell>{event.orders?.order_number ? `#${event.orders.order_number}` : '—'}</TableCell><TableCell>{format(new Date(event.created_at), 'dd/MM HH:mm', { locale: es })}</TableCell></TableRow>)}</TableBody></Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events">
          <Card><CardHeader><CardTitle>Eventos recientes</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Alianza</TableHead><TableHead>Evento</TableHead><TableHead>Cliente</TableHead><TableHead>Pedido</TableHead><TableHead>Monto</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader><TableBody>{events.map((event: any) => <TableRow key={event.id}><TableCell>{event.marketing_alliances?.name || '—'}</TableCell><TableCell>{eventLabels[event.event_type] || event.event_type}</TableCell><TableCell>{event.customers?.name || event.customers?.email || '—'}</TableCell><TableCell>{event.orders?.order_number ? `#${event.orders.order_number}` : '—'}</TableCell><TableCell>{Number(event.amount || 0) ? formatCurrency(Number(event.amount)) : '—'}</TableCell><TableCell>{format(new Date(event.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        </TabsContent>
      </Tabs>

      <AllianceFormModal open={modalOpen} onOpenChange={setModalOpen} alliance={editing} coupons={availableCoupons} isLoadingCoupons={isLoadingCoupons} onSave={handleSave} />
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar alianza</AlertDialogTitle><AlertDialogDescription>Esto eliminará la campaña y sus eventos asociados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
