import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Smartphone, ShoppingCart } from 'lucide-react';

interface PWAConfig {
  id: string;
  app_type: 'customer' | 'pos';
  app_name: string;
  app_short_name: string;
  app_description: string;
  theme_color: string;
  background_color: string;
  icon_192_url: string | null;
  icon_512_url: string | null;
  icon_maskable_url: string | null;
}

export function PWAConfig() {
  const [activeTab, setActiveTab] = useState<'customer' | 'pos'>('customer');
  const [customerConfig, setCustomerConfig] = useState<PWAConfig | null>(null);
  const [posConfig, setPosConfig] = useState<PWAConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Form state
  const [appName, setAppName] = useState('');
  const [appShortName, setAppShortName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [themeColor, setThemeColor] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    // Update form when switching tabs
    const config = activeTab === 'customer' ? customerConfig : posConfig;
    if (config) {
      setAppName(config.app_name);
      setAppShortName(config.app_short_name);
      setAppDescription(config.app_description);
      setThemeColor(config.theme_color);
      setBackgroundColor(config.background_color);
    }
  }, [activeTab, customerConfig, posConfig]);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('pwa_config')
        .select('*');

      if (error) throw error;

      if (data) {
        const customer = data.find(c => c.app_type === 'customer') as PWAConfig | undefined;
        const pos = data.find(c => c.app_type === 'pos') as PWAConfig | undefined;
        
        setCustomerConfig(customer || null);
        setPosConfig(pos || null);

        // Load first available config into form
        const activeConfig = customer || pos;
        if (activeConfig) {
          setAppName(activeConfig.app_name);
          setAppShortName(activeConfig.app_short_name);
          setAppDescription(activeConfig.app_description);
          setThemeColor(activeConfig.theme_color);
          setBackgroundColor(activeConfig.background_color);
        }
      }
    } catch (error) {
      console.error('Error loading PWA config:', error);
      toast.error('Error al cargar la configuración de PWA');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!appName || !appShortName) {
      toast.error('El nombre y nombre corto son obligatorios');
      return;
    }

    setSaving(true);

    try {
      const configData = {
        app_type: activeTab,
        app_name: appName,
        app_short_name: appShortName,
        app_description: appDescription,
        theme_color: themeColor,
        background_color: backgroundColor,
        updated_at: new Date().toISOString(),
      };

      const currentConfig = activeTab === 'customer' ? customerConfig : posConfig;

      if (currentConfig) {
        // Update existing config
        const { error } = await supabase
          .from('pwa_config')
          .update(configData)
          .eq('id', currentConfig.id);

        if (error) throw error;
      } else {
        // Insert new config
        const { data, error } = await supabase
          .from('pwa_config')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        
        if (activeTab === 'customer') {
          setCustomerConfig(data as PWAConfig);
        } else {
          setPosConfig(data as PWAConfig);
        }
      }

      toast.success(`Configuración ${activeTab === 'customer' ? 'del Portal' : 'del POS'} guardada exitosamente`);
      await loadConfigs();
    } catch (error) {
      console.error('Error saving PWA config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    iconType: '192' | '512' | 'maskable'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2MB');
      return;
    }

    setUploading(iconType);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `icon-${iconType}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('pwa-icons')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('pwa-icons')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update config with new icon URL
      const currentConfig = activeTab === 'customer' ? customerConfig : posConfig;
      
      if (!currentConfig) {
        toast.error('Primero guarda la configuración básica');
        return;
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (iconType === '192') updateData.icon_192_url = publicUrl;
      if (iconType === '512') updateData.icon_512_url = publicUrl;
      if (iconType === 'maskable') updateData.icon_maskable_url = publicUrl;

      const { error: updateError } = await supabase
        .from('pwa_config')
        .update(updateData)
        .eq('id', currentConfig.id);

      if (updateError) throw updateError;

      toast.success(`Ícono ${iconType}x${iconType} subido exitosamente`);
      await loadConfigs();
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Error al subir el ícono');
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentConfig = activeTab === 'customer' ? customerConfig : posConfig;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <CardTitle>Configuración de PWA</CardTitle>
        </div>
        <CardDescription>
          Personaliza el nombre y los íconos de las aplicaciones móviles (PWA)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'pos')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Portal de Clientes
            </TabsTrigger>
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sistema POS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-6 mt-6">
            {renderConfigForm()}
          </TabsContent>

          <TabsContent value="pos" className="space-y-6 mt-6">
            {renderConfigForm()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  function renderConfigForm() {
    return (
      <>
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app-name">Nombre de la aplicación</Label>
            <Input
              id="app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Paganos Burger"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Nombre completo que se mostrará en la pantalla de instalación
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-short-name">Nombre corto</Label>
            <Input
              id="app-short-name"
              value={appShortName}
              onChange={(e) => setAppShortName(e.target.value)}
              placeholder="Paganos"
              maxLength={12}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Máximo 12 caracteres. Se muestra debajo del ícono en el dispositivo
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-description">Descripción</Label>
            <Textarea
              id="app-description"
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="Portal de clientes y sistema POS de Paganos Burger"
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme-color">Color del tema</Label>
              <div className="flex gap-2">
                <Input
                  id="theme-color"
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  disabled={saving}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  disabled={saving}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bg-color">Color de fondo</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={saving}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={saving}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Configuración'
            )}
          </Button>
        </div>

        {/* Icon Uploads */}
        {currentConfig && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Íconos de la aplicación</h3>
            <p className="text-sm text-muted-foreground">
              Se recomiendan imágenes PNG cuadradas con fondo sólido
            </p>

            {/* Icon 192x192 */}
            <div className="space-y-2">
              <Label htmlFor={`icon-192-${activeTab}`}>Ícono 192x192</Label>
              <div className="flex items-center gap-4">
                {currentConfig.icon_192_url && (
                  <img
                    src={currentConfig.icon_192_url}
                    alt="Icon 192"
                    className="w-12 h-12 rounded border"
                  />
                )}
                <div className="flex-1">
                  <Input
                    id={`icon-192-${activeTab}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleIconUpload(e, '192')}
                    disabled={!!uploading}
                  />
                </div>
                {uploading === '192' && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {/* Icon 512x512 - Only for customer */}
            {activeTab === 'customer' && (
              <div className="space-y-2">
                <Label htmlFor="icon-512">Ícono 512x512</Label>
                <div className="flex items-center gap-4">
                  {currentConfig.icon_512_url && (
                    <img
                      src={currentConfig.icon_512_url}
                      alt="Icon 512"
                      className="w-12 h-12 rounded border"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="icon-512"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleIconUpload(e, '512')}
                      disabled={!!uploading}
                    />
                  </div>
                  {uploading === '512' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
            )}

            {/* Icon Maskable - Only for customer */}
            {activeTab === 'customer' && (
              <div className="space-y-2">
                <Label htmlFor="icon-maskable">Ícono Maskable 512x512</Label>
                <div className="flex items-center gap-4">
                  {currentConfig.icon_maskable_url && (
                    <img
                      src={currentConfig.icon_maskable_url}
                      alt="Icon Maskable"
                      className="w-12 h-12 rounded border"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="icon-maskable"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleIconUpload(e, 'maskable')}
                      disabled={!!uploading}
                    />
                  </div>
                  {uploading === 'maskable' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Versión adaptativa del ícono con safe zone para diferentes formas
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="pt-4 border-t space-y-2">
          <h3 className="font-semibold text-sm">Notas importantes:</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Los cambios en el nombre se reflejarán cuando los usuarios reinstalen la PWA</li>
            <li>Los íconos deben ser imágenes cuadradas (mismo ancho y alto)</li>
            <li>Se recomienda usar formato PNG con fondo sólido</li>
            {activeTab === 'customer' && (
              <li>El ícono maskable debe tener un área de seguridad de 80% en el centro</li>
            )}
            {activeTab === 'pos' && (
              <li>El POS solo requiere ícono 192x192 y se muestra en modo navegador</li>
            )}
          </ul>
        </div>
      </>
    );
  }
}
