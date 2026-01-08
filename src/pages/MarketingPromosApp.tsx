import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Copy, Trash2, BarChart3 } from 'lucide-react';
import { useMarketingPromotions, MarketingPromotion } from '@/hooks/useMarketingPromotions';
import { PromoFormModal } from '@/components/marketing/PromoFormModal';
import { PromoAnalyticsDashboard } from '@/components/marketing/PromoAnalyticsDashboard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

const CTA_TYPE_LABELS: Record<string, string> = {
  open_menu: 'Ir al Menú',
  open_cart: 'Ir al Carrito',
  open_orders: 'Ir a Mis Pedidos',
  open_benefits: 'Ir a Beneficios',
  open_product: 'Ir al Producto',
  open_custom_url: 'Abrir URL',
  none: 'Sin acción',
};

export default function MarketingPromosApp() {
  const { promotions, isLoading, createPromotion, updatePromotion, deletePromotion, toggleActive } = useMarketingPromotions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<MarketingPromotion | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingPromo(null);
    setModalOpen(true);
  };

  const handleEdit = (promo: MarketingPromotion) => {
    setEditingPromo(promo);
    setModalOpen(true);
  };

  const handleDuplicate = async (promo: MarketingPromotion) => {
    const { id, created_at, updated_at, created_by, ...rest } = promo;
    await createPromotion({
      ...rest,
      title: `${promo.title} (copia)`,
      is_active: false,
    });
  };

  const handleSave = async (promoData: any) => {
    if (editingPromo) {
      await updatePromotion(promoData);
    } else {
      await createPromotion(promoData);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    await toggleActive({ id, is_active: !currentState });
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deletePromotion(deletingId);
      setDeletingId(null);
    }
  };

  const formatVigencia = (startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) return 'Siempre vigente';
    if (!startDate && endDate) return `Hasta ${format(new Date(endDate), 'dd/MM/yyyy', { locale: es })}`;
    if (startDate && !endDate) return `Desde ${format(new Date(startDate), 'dd/MM/yyyy', { locale: es })}`;
    return `${format(new Date(startDate), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(endDate), 'dd/MM/yyyy', { locale: es })}`;
  };

  const isCurrentlyActive = (promo: MarketingPromotion) => {
    if (!promo.is_active) return false;
    const today = new Date().toISOString().split('T')[0];
    const afterStart = !promo.start_date || promo.start_date <= today;
    const beforeEnd = !promo.end_date || promo.end_date >= today;
    return afterStart && beforeEnd;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promos App</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona promociones y analiza su rendimiento en la app de clientes
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Promoción
        </Button>
      </div>

      <Tabs defaultValue="promotions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="promotions">Promociones</TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Promociones Activas</CardTitle>
              <CardDescription>
                Configura las promociones que se mostrarán en la pantalla de inicio de la app de clientes.
              </CardDescription>
            </CardHeader>

            <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No hay promociones creadas aún</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primera promoción
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>CTA</TableHead>
                  <TableHead className="text-center">Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{promo.title}</div>
                        {promo.subtitle && (
                          <div className="text-sm text-muted-foreground">{promo.subtitle}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatVigencia(promo.start_date, promo.end_date)}
                        {isCurrentlyActive(promo) && (
                          <Badge variant="outline" className="ml-2 text-xs">En curso</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{CTA_TYPE_LABELS[promo.cta_type] || promo.cta_type}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{promo.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                        {promo.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(promo.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(promo)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(promo)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(promo.id, promo.is_active)}>
                            {promo.is_active ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingId(promo.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <PromoAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      <PromoFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        promo={editingPromo}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar promoción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La promoción se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
