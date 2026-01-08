import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Plus, MoreVertical, Pencil, Trash2, Image, Video, Eye, ExternalLink, Tv } from 'lucide-react';
import { useMarketingPromotions, MarketingPromotion, MarketingPromotionInput } from '@/hooks/useMarketingPromotions';
import { useTVScreenConfigs } from '@/hooks/useTVScreenConfigs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export function TVContentTab() {
  const { promotions, isLoading, createPromotion, updatePromotion, deletePromotion, toggleActive } = useMarketingPromotions();
  const { configs } = useTVScreenConfigs();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<MarketingPromotion | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    video_url: '',
    is_active: true,
    priority: 1,
    start_date: '',
    end_date: '',
  });

  const handleCreate = () => {
    setEditingPromo(null);
    setFormData({
      title: '',
      subtitle: '',
      image_url: '',
      video_url: '',
      is_active: true,
      priority: 1,
      start_date: '',
      end_date: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (promo: MarketingPromotion) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title,
      subtitle: promo.subtitle || '',
      image_url: promo.image_url || '',
      video_url: promo.video_url || '',
      is_active: promo.is_active,
      priority: promo.priority,
      start_date: promo.start_date || '',
      end_date: promo.end_date || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return;
    }

    if (!formData.image_url && !formData.video_url) {
      toast.error('Debes agregar una imagen o video');
      return;
    }

    const promoData: MarketingPromotionInput = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      description: null,
      cta_label: null,
      cta_type: 'none',
      cta_url: null,
      image_url: formData.image_url || null,
      video_url: formData.video_url || null,
      is_active: formData.is_active,
      priority: formData.priority,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    if (editingPromo) {
      await updatePromotion({ id: editingPromo.id, ...promoData });
    } else {
      await createPromotion(promoData);
    }
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deletePromotion(deletingId);
      setDeletingId(null);
    }
  };

  const copyScreenUrl = (configId?: string) => {
    const url = configId 
      ? `${window.location.origin}/pos/pedido-listo?screen=${configId}`
      : `${window.location.origin}/pos/pedido-listo`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  const getMediaType = (promo: MarketingPromotion) => {
    if (promo.video_url) return 'video';
    if (promo.image_url) return 'imagen';
    return 'sin media';
  };

  return (
    <div className="space-y-6">
      {/* Quick access to TV screens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Pantallas TV Configuradas
          </CardTitle>
          <CardDescription>
            Acceso rápido a las pantallas TV. El contenido de abajo se mostrará en los templates divididos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => copyScreenUrl()}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Pantalla Default
            </Button>
            {configs.map((config) => (
              <Button 
                key={config.id} 
                variant="outline" 
                size="sm"
                onClick={() => copyScreenUrl(config.id)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {config.name}
                {config.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Click en una pantalla para copiar su URL. Abre la URL en una TV para mostrar los pedidos listos con promociones.
          </p>
        </CardContent>
      </Card>

      {/* Content management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Contenido para TV</CardTitle>
            <CardDescription>
              Imágenes y videos que se mostrarán en el slider de las pantallas TV con template dividido.
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Contenido
          </Button>
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
              <p className="text-muted-foreground mb-4">No hay contenido para TV</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar primer contenido
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div 
                        className="w-20 h-12 rounded overflow-hidden bg-muted cursor-pointer flex items-center justify-center"
                        onClick={() => setPreviewUrl(promo.video_url || promo.image_url)}
                      >
                        {promo.video_url ? (
                          <Video className="h-6 w-6 text-muted-foreground" />
                        ) : promo.image_url ? (
                          <img 
                            src={promo.image_url} 
                            alt={promo.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{promo.title}</div>
                        {promo.subtitle && (
                          <div className="text-sm text-muted-foreground">{promo.subtitle}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {promo.video_url ? (
                          <><Video className="mr-1 h-3 w-3" /> Video</>
                        ) : (
                          <><Image className="mr-1 h-3 w-3" /> Imagen</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{promo.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                        {promo.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewUrl(promo.video_url || promo.image_url)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(promo)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive({ id: promo.id, is_active: !promo.is_active })}>
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

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Editar Contenido' : 'Agregar Contenido TV'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Nueva Smash Bacon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtítulo</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Ej: ¡Pruébala ahora!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL de Imagen</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">Se usa si no hay video</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_url">URL de Video</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">MP4 recomendado. Tiene prioridad sobre imagen.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-muted-foreground">Menor = aparece primero</p>
              </div>

              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="is_active">Activo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingPromo ? 'Guardar Cambios' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {previewUrl?.includes('.mp4') || previewUrl?.includes('video') ? (
              <video
                src={previewUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={previewUrl || ''}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contenido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
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
