import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTVScreenConfigs, TVScreenConfig, TVScreenConfigInput, TV_STATUS_OPTIONS } from '@/hooks/useTVScreenConfigs';
import { useTVScreenContent } from '@/hooks/useTVScreenContent';
import { Trash2, Plus, Star, Copy, Monitor, SplitSquareHorizontal, SplitSquareVertical, Sun, Moon, Image, Video, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TVConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: Partial<TVScreenConfig> | null;
  onConfigChange: (config: Partial<TVScreenConfig>) => void;
}

const TEMPLATES = [
  { value: 'full', label: 'Completa', icon: Monitor, description: 'Solo pedidos' },
  { value: 'split_horizontal', label: 'Dividida H', icon: SplitSquareHorizontal, description: 'Pedidos | Promos' },
  { value: 'split_vertical', label: 'Dividida V', icon: SplitSquareVertical, description: 'Promos arriba' },
  { value: 'promo_only', label: 'Solo Promos', icon: Image, description: 'Sin pedidos' },
] as const;

const INTERVALS = [
  { value: 5, label: '5 segundos' },
  { value: 8, label: '8 segundos' },
  { value: 10, label: '10 segundos' },
  { value: 15, label: '15 segundos' },
];

const COLUMNS = [
  { value: 2, label: '2 columnas' },
  { value: 3, label: '3 columnas' },
  { value: 4, label: '4 columnas' },
  { value: 5, label: '5 columnas' },
];

const FONT_SIZES = [
  { value: 'small', label: 'Pequeña' },
  { value: 'medium', label: 'Mediana' },
  { value: 'large', label: 'Grande' },
];

export function TVConfigModal({ open, onOpenChange, currentConfig, onConfigChange }: TVConfigModalProps) {
  const { configs, createConfig, updateConfig, deleteConfig, isLoading } = useTVScreenConfigs();
  const [newConfigName, setNewConfigName] = useState('');
  const [saving, setSaving] = useState(false);

  // Content management for selected config
  const selectedConfigId = currentConfig?.id;
  const { 
    content, 
    availablePromotions, 
    addContent, 
    removeContent,
    isLoading: contentLoading 
  } = useTVScreenContent(selectedConfigId);

  const handleTemplateChange = (template: TVScreenConfig['template']) => {
    onConfigChange({ ...currentConfig, template });
  };

  const handleIntervalChange = (value: string) => {
    onConfigChange({ ...currentConfig, slider_interval_seconds: parseInt(value) });
  };

  const handleColumnsChange = (value: string) => {
    onConfigChange({ ...currentConfig, columns: parseInt(value) });
  };

  const handleFontSizeChange = (value: string) => {
    onConfigChange({ ...currentConfig, font_size: value as TVScreenConfig['font_size'] });
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    onConfigChange({ ...currentConfig, theme });
  };

  const handleToggle = (key: 'show_logo' | 'show_clock' | 'sound_enabled' | 'hide_header_fullscreen' | 'auto_fullscreen', value: boolean) => {
    onConfigChange({ ...currentConfig, [key]: value });
  };

  const handleStatusToggle = (status: string, checked: boolean) => {
    const current = currentConfig?.visible_statuses || ['En preparación', 'Listo', 'Entregado'];
    const updated = checked 
      ? [...current, status]
      : current.filter(s => s !== status);
    onConfigChange({ ...currentConfig, visible_statuses: updated });
  };

  const handleIdleScreenChange = (value: string) => {
    onConfigChange({ 
      ...currentConfig, 
      idle_screen_config_id: value === 'none' ? null : value 
    });
  };

  const handleSaveNew = async () => {
    if (!newConfigName.trim()) {
      toast.error('Ingresa un nombre para la configuración');
      return;
    }

    setSaving(true);
    try {
      const newConfig: TVScreenConfigInput = {
        name: newConfigName.trim(),
        template: currentConfig?.template || 'full',
        slider_interval_seconds: currentConfig?.slider_interval_seconds || 8,
        show_logo: currentConfig?.show_logo ?? true,
        show_clock: currentConfig?.show_clock ?? true,
        sound_enabled: currentConfig?.sound_enabled ?? true,
        columns: currentConfig?.columns || 4,
        font_size: currentConfig?.font_size || 'medium',
        theme: currentConfig?.theme || 'light',
        hide_header_fullscreen: currentConfig?.hide_header_fullscreen ?? false,
        auto_fullscreen: currentConfig?.auto_fullscreen ?? false,
        visible_statuses: currentConfig?.visible_statuses || ['En preparación', 'Listo', 'Entregado'],
        idle_screen_config_id: currentConfig?.idle_screen_config_id || null,
        is_default: false,
      };
      const created = await createConfig(newConfig);
      setNewConfigName('');
      // Cargar la config recién creada
      onConfigChange(created as TVScreenConfig);
    } finally {
      setSaving(false);
    }
  };

  // Actualizar configuración existente
  const handleUpdateCurrent = async () => {
    if (!currentConfig?.id) {
      toast.error('Primero carga una configuración');
      return;
    }

    setSaving(true);
    try {
      await updateConfig({
        id: currentConfig.id,
        name: currentConfig.name,
        slug: currentConfig.slug,
        template: currentConfig.template,
        slider_interval_seconds: currentConfig.slider_interval_seconds,
        show_logo: currentConfig.show_logo,
        show_clock: currentConfig.show_clock,
        sound_enabled: currentConfig.sound_enabled,
        columns: currentConfig.columns,
        font_size: currentConfig.font_size,
        theme: currentConfig.theme,
        hide_header_fullscreen: currentConfig.hide_header_fullscreen,
        auto_fullscreen: currentConfig.auto_fullscreen,
        visible_statuses: currentConfig.visible_statuses,
        idle_screen_config_id: currentConfig.idle_screen_config_id,
      });
      toast.success('Configuración actualizada');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadConfig = (config: TVScreenConfig) => {
    onConfigChange(config);
    toast.success(`Configuración "${config.name}" cargada`);
  };

  const handleSetDefault = async (config: TVScreenConfig) => {
    await updateConfig({ id: config.id, is_default: true });
  };

  const handleDelete = async (config: TVScreenConfig) => {
    if (confirm(`¿Eliminar la configuración "${config.name}"?`)) {
      await deleteConfig(config.id);
    }
  };

  const copyScreenUrl = (config: TVScreenConfig) => {
    const url = `${window.location.origin}/pos/pedido-listo/${config.slug}`;
    navigator.clipboard.writeText(url);
    toast.success(`URL copiada: /pos/pedido-listo/${config.slug}`);
  };

  const handleAddContent = async (promotionId: string) => {
    if (!selectedConfigId) {
      toast.error('Primero guarda la configuración');
      return;
    }
    await addContent({ promotionId });
  };

  const handleRemoveContent = async (contentId: string) => {
    await removeContent(contentId);
  };

  const currentTheme = currentConfig?.theme || 'light';

  // Filtrar pantallas disponibles para modo espera (excluir la actual)
  const idleScreenOptions = configs.filter(c => c.id !== currentConfig?.id);

  // Contenido ya asignado (IDs)
  const assignedPromotionIds = new Set(content.map(c => c.promotion_id));

  // Promociones disponibles para agregar
  const unassignedPromotions = availablePromotions.filter(p => !assignedPromotionIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración de Pantalla TV</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="screens">Pantallas</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6 mt-4">
            {/* Template selector */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Template</Label>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map(({ value, label, icon: Icon, description }) => (
                  <Card
                    key={value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      currentConfig?.template === value && "border-primary ring-2 ring-primary/20"
                    )}
                    onClick={() => handleTemplateChange(value)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Theme selector */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tema</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    currentTheme === 'light' && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => handleThemeChange('light')}
                >
                  <CardContent className="p-4 text-center">
                    <Sun className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="font-medium">Claro</p>
                  </CardContent>
                </Card>
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    currentTheme === 'dark' && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => handleThemeChange('dark')}
                >
                  <CardContent className="p-4 text-center">
                    <Moon className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className="font-medium">Oscuro</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Columns selector */}
            <div className="space-y-2">
              <Label>Columnas de tarjetas</Label>
              <Select
                value={String(currentConfig?.columns || 4)}
                onValueChange={handleColumnsChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNS.map(({ value, label }) => (
                    <SelectItem key={value} value={String(value)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font size selector */}
            <div className="space-y-2">
              <Label>Tamaño de letra</Label>
              <Select
                value={currentConfig?.font_size || 'medium'}
                onValueChange={handleFontSizeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Slider interval (only for split layouts) */}
            {currentConfig?.template !== 'full' && (
              <div className="space-y-2">
                <Label>Intervalo del slider</Label>
                <Select
                  value={String(currentConfig?.slider_interval_seconds || 8)}
                  onValueChange={handleIntervalChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map(({ value, label }) => (
                      <SelectItem key={value} value={String(value)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Estados visibles */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-medium">Estados visibles en pantalla</Label>
                <p className="text-sm text-muted-foreground">Selecciona qué estados de pedidos mostrar</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {TV_STATUS_OPTIONS.map(({ value, label }) => {
                  const isChecked = (currentConfig?.visible_statuses || ['En preparación', 'Listo', 'Entregado']).includes(value);
                  return (
                    <div key={value} className="flex items-center space-x-3">
                      <Checkbox
                        id={`status-${value}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleStatusToggle(value, !!checked)}
                      />
                      <label 
                        htmlFor={`status-${value}`} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pantalla de espera */}
            <div className="space-y-2">
              <div>
                <Label className="text-base font-medium">Pantalla de espera (sin pedidos)</Label>
                <p className="text-sm text-muted-foreground">
                  Cuando no hay pedidos, mostrar el contenido de otra pantalla
                </p>
              </div>
              <Select
                value={currentConfig?.idle_screen_config_id || 'none'}
                onValueChange={handleIdleScreenChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin pantalla de espera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin pantalla de espera</SelectItem>
                  {idleScreenOptions.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mostrar logo</Label>
                  <p className="text-sm text-muted-foreground">Logo de Paganos en el header</p>
                </div>
                <Switch
                  checked={currentConfig?.show_logo ?? true}
                  onCheckedChange={(v) => handleToggle('show_logo', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Mostrar reloj</Label>
                  <p className="text-sm text-muted-foreground">Hora actual en el header</p>
                </div>
                <Switch
                  checked={currentConfig?.show_clock ?? true}
                  onCheckedChange={(v) => handleToggle('show_clock', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sonido habilitado</Label>
                  <p className="text-sm text-muted-foreground">Sonido al recibir pedidos o al cambiar a Entregado</p>
                </div>
                <Switch
                  checked={currentConfig?.sound_enabled ?? true}
                  onCheckedChange={(v) => handleToggle('sound_enabled', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Ocultar header en pantalla completa</Label>
                  <p className="text-sm text-muted-foreground">Solo muestra pedidos al usar pantalla completa</p>
                </div>
                <Switch
                  checked={currentConfig?.hide_header_fullscreen ?? false}
                  onCheckedChange={(v) => handleToggle('hide_header_fullscreen', v)}
                />
              </div>
            </div>

            {/* Slug (URL única) — sólo visible cuando existe una config cargada */}
            {currentConfig?.id && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Código de URL (slug)</Label>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground shrink-0">/pos/pedido-listo/</span>
                  <Input
                    value={currentConfig.slug || ''}
                    onChange={(e) => onConfigChange({ ...currentConfig, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    placeholder="pa1a2b3"
                    className="font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Sólo letras minúsculas y números. Guarda esta URL en tu navegador para abrir siempre esta pantalla.
                </p>
              </div>
            )}

            {/* Botón para actualizar configuración existente */}
            {currentConfig?.id && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleUpdateCurrent} 
                  disabled={saving}
                  className="w-full"
                >
                  Guardar cambios en "{currentConfig.name}"
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            {!selectedConfigId ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Primero carga o guarda una configuración de pantalla</p>
                <p className="text-sm">para poder asignarle contenido</p>
              </div>
            ) : (
              <>
                {/* Contenido asignado */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Contenido asignado a esta pantalla</Label>
                  {contentLoading ? (
                    <p className="text-muted-foreground text-sm">Cargando...</p>
                  ) : content.length === 0 ? (
                    <Card className="p-4">
                      <p className="text-muted-foreground text-center text-sm">
                        Sin contenido asignado. Se mostrará todo el contenido TV activo.
                      </p>
                    </Card>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-4">
                        {content.map((item) => (
                          <Card key={item.id} className="p-3">
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <div className="flex-1 flex items-center gap-2">
                                {item.promotion?.video_url ? (
                                  <Video className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <Image className="w-4 h-4 text-green-500" />
                                )}
                                <span className="font-medium truncate">
                                  {item.promotion?.title || 'Sin título'}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveContent(item.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Agregar contenido */}
                {unassignedPromotions.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Agregar contenido</Label>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-4">
                        {unassignedPromotions.map((promo) => (
                          <Card key={promo.id} className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 flex items-center gap-2">
                                {promo.video_url ? (
                                  <Video className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <Image className="w-4 h-4 text-green-500" />
                                )}
                                <span className="font-medium truncate">{promo.title}</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddContent(promo.id)}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {availablePromotions.length === 0 && (
                  <Card className="p-4">
                    <p className="text-muted-foreground text-center text-sm">
                      No hay contenido TV disponible. Crea contenido en Marketing → Contenido TV.
                    </p>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="screens" className="space-y-4 mt-4">
            {/* Create new */}
            <div className="flex gap-2">
              <Input
                placeholder="Nombre de la configuración"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
              />
              <Button onClick={handleSaveNew} disabled={saving}>
                <Plus className="w-4 h-4 mr-1" />
                Guardar
              </Button>
            </div>

            {/* Saved configs list */}
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-muted-foreground text-center py-4">Cargando...</p>
              ) : configs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay configuraciones guardadas
                </p>
              ) : (
                configs.map((config) => (
                  <Card key={config.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{config.name}</span>
                          {config.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {TEMPLATES.find(t => t.value === config.template)?.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {config.theme === 'dark' ? '🌙' : '☀️'}
                          </Badge>
                        </div>
                        <code className="text-xs text-muted-foreground truncate">
                          /pos/pedido-listo/{config.slug}
                        </code>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleLoadConfig(config)}
                        >
                          Cargar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyScreenUrl(config)}
                          title="Copiar URL"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {!config.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetDefault(config)}
                            title="Marcar como default"
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(config)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
