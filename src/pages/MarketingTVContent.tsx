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
import { Plus, MoreVertical, Pencil, Trash2, Image, Video, Eye, ExternalLink, Tv, Copy } from 'lucide-react';
import { useTVScreenConfigs } from '@/hooks/useTVScreenConfigs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';
import { setStaffContext } from '@/lib/dbContext';
import { useAuth } from '@/hooks/useAuth';

interface TVContent {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  video_url: string | null;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// Hook específico para contenido TV (filtra solo los que tienen media y cta_type = 'none')
function useTVContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['tv-content'],
    queryFn: async () => {
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .select('*')
        .eq('cta_type', 'none')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TVContent[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (content: Omit<TVContent, 'id' | 'created_at' | 'updated_at'>) => {
      if (user?.id) await setStaffContext(user.id);
      
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .insert([{ ...content, cta_type: 'none', cta_label: null, cta_url: null, description: null }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-content'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Contenido creado');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...content }: Partial<TVContent> & { id: string }) => {
      if (user?.id) await setStaffContext(user.id);
      
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .update({ ...content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-content'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Contenido actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (user?.id) await setStaffContext(user.id);
      
      const { error } = await configuredSupabase
        .from('marketing_app_promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-content'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Contenido eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (user?.id) await setStaffContext(user.id);
      
      const { error } = await configuredSupabase
        .from('marketing_app_promotions')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-content'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
    },
  });

  return {
    contents,
    isLoading,
    createContent: createMutation.mutateAsync,
    updateContent: updateMutation.mutateAsync,
    deleteContent: deleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
  };
}

export default function MarketingTVContent() {
  const { contents, isLoading, createContent, updateContent, deleteContent, toggleActive } = useTVContent();
  const { configs } = useTVScreenConfigs();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<TVContent | null>(null);
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
    setEditingContent(null);
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

  const handleEdit = (content: TVContent) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      subtitle: content.subtitle || '',
      image_url: content.image_url || '',
      video_url: content.video_url || '',
      is_active: content.is_active,
      priority: content.priority,
      start_date: content.start_date || '',
      end_date: content.end_date || '',
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

    const contentData = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      image_url: formData.image_url || null,
      video_url: formData.video_url || null,
      is_active: formData.is_active,
      priority: formData.priority,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    if (editingContent) {
      await updateContent({ id: editingContent.id, ...contentData });
    } else {
      await createContent(contentData);
    }
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteContent(deletingId);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tv className="h-8 w-8" />
            Contenido TV
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona imágenes y videos para las pantallas de pedidos listos
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Contenido
        </Button>
      </div>

      {/* Quick access to TV screens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pantallas TV Configuradas</CardTitle>
          <CardDescription>
            Click para copiar la URL de cada pantalla. Abre la URL en una TV para mostrar pedidos + promociones.
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
                <Copy className="mr-2 h-4 w-4" />
                {config.name}
                {config.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content management */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido del Slider</CardTitle>
          <CardDescription>
            Este contenido se muestra en los templates divididos (horizontal/vertical) de la pantalla TV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="text-center py-12">
              <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                {contents.map((content) => (
                  <TableRow key={content.id}>
                    <TableCell>
                      <div 
                        className="w-20 h-12 rounded overflow-hidden bg-muted cursor-pointer flex items-center justify-center"
                        onClick={() => setPreviewUrl(content.video_url || content.image_url)}
                      >
                        {content.video_url ? (
                          <Video className="h-6 w-6 text-muted-foreground" />
                        ) : content.image_url ? (
                          <img 
                            src={content.image_url} 
                            alt={content.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{content.title}</div>
                        {content.subtitle && (
                          <div className="text-sm text-muted-foreground">{content.subtitle}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {content.video_url ? (
                          <><Video className="mr-1 h-3 w-3" /> Video</>
                        ) : (
                          <><Image className="mr-1 h-3 w-3" /> Imagen</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{content.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={content.is_active ? 'default' : 'secondary'}>
                        {content.is_active ? 'Activo' : 'Inactivo'}
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
                          <DropdownMenuItem onClick={() => setPreviewUrl(content.video_url || content.image_url)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(content)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive({ id: content.id, is_active: !content.is_active })}>
                            {content.is_active ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingId(content.id)}
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
            <DialogTitle>{editingContent ? 'Editar Contenido' : 'Agregar Contenido TV'}</DialogTitle>
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
              {editingContent ? 'Guardar Cambios' : 'Agregar'}
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
