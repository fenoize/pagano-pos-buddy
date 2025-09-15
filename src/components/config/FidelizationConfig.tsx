import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Star, Save, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface FidelizationSettings {
  runa_value: number; // Cuánto se debe gastar para ganar 1 runa
  runa_reward_value: number; // Valor de cada runa al canjear
  max_runas_per_order: number; // Máximo de runas que se pueden usar por pedido
  min_purchase_for_runas: number; // Compra mínima para empezar a acumular runas
  runa_expiry_days: number; // Días de validez de las runas (0 = no expiran)
  fidelization_active: boolean; // Sistema de runas activo/inactivo
}

export function FidelizationConfig() {
  const [settings, setSettings] = useState<FidelizationSettings>({
    runa_value: 1000,
    runa_reward_value: 1000,
    max_runas_per_order: 50,
    min_purchase_for_runas: 1000,
    runa_expiry_days: 0,
    fidelization_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('key, value')
        .in('key', [
          'runa_value',
          'runa_reward_value', 
          'max_runas_per_order',
          'min_purchase_for_runas',
          'runa_expiry_days',
          'fidelization_active'
        ]);

      if (error) throw error;

      const configMap = data?.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, any>) || {};

      setSettings({
        runa_value: configMap.runa_value || 1000,
        runa_reward_value: configMap.runa_reward_value || 1000,
        max_runas_per_order: configMap.max_runas_per_order || 50,
        min_purchase_for_runas: configMap.min_purchase_for_runas || 1000,
        runa_expiry_days: configMap.runa_expiry_days || 0,
        fidelization_active: configMap.fidelization_active !== false
      });
    } catch (error) {
      console.error('Error loading fidelization settings:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Prepare config updates
      const configUpdates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString()
      }));

      // Use upsert to insert or update each config
      for (const config of configUpdates) {
        const { error } = await supabase
          .from('config')
          .upsert(config, { onConflict: 'key' });
        
        if (error) throw error;
      }

      toast({
        title: "¡Éxito!",
        description: "Configuración de fidelización guardada correctamente",
      });
    } catch (error) {
      console.error('Error saving fidelization settings:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(value);
  };

  const handleInputChange = (key: keyof FidelizationSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: typeof value === 'string' ? parseInt(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando configuración...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Sistema de Fidelización - Runas
          </CardTitle>
          <CardDescription>
            Configura cómo los clientes ganan y usan runas en sus compras
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sistema Activo */}
          <div className="flex items-center space-x-3">
            <Switch
              id="fidelization_active"
              checked={settings.fidelization_active}
              onCheckedChange={(checked) => handleInputChange('fidelization_active', checked)}
            />
            <Label htmlFor="fidelization_active" className="text-base font-medium">
              Sistema de fidelización activo
            </Label>
          </div>

          <Separator />

          {/* Configuración de Acumulación */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Acumulación de Runas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="runa_value">
                  Valor para ganar 1 runa
                </Label>
                <Input
                  id="runa_value"
                  type="number"
                  value={settings.runa_value}
                  onChange={(e) => handleInputChange('runa_value', e.target.value)}
                  min="1"
                  disabled={!settings.fidelization_active}
                />
                <p className="text-xs text-muted-foreground">
                  Por cada {formatCurrency(settings.runa_value)} gastados, el cliente gana 1 runa
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_purchase_for_runas">
                  Compra mínima para acumular runas
                </Label>
                <Input
                  id="min_purchase_for_runas"
                  type="number"
                  value={settings.min_purchase_for_runas}
                  onChange={(e) => handleInputChange('min_purchase_for_runas', e.target.value)}
                  min="0"
                  disabled={!settings.fidelization_active}
                />
                <p className="text-xs text-muted-foreground">
                  Compra mínima: {formatCurrency(settings.min_purchase_for_runas)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración de Canje */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Canje de Runas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="runa_reward_value">
                  Valor de cada runa al canjear
                </Label>
                <Input
                  id="runa_reward_value"
                  type="number"
                  value={settings.runa_reward_value}
                  onChange={(e) => handleInputChange('runa_reward_value', e.target.value)}
                  min="1"
                  disabled={!settings.fidelization_active}
                />
                <p className="text-xs text-muted-foreground">
                  Cada runa vale {formatCurrency(settings.runa_reward_value)} al canjear
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_runas_per_order">
                  Máximo de runas por pedido
                </Label>
                <Input
                  id="max_runas_per_order"
                  type="number"
                  value={settings.max_runas_per_order}
                  onChange={(e) => handleInputChange('max_runas_per_order', e.target.value)}
                  min="1"
                  disabled={!settings.fidelization_active}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo {settings.max_runas_per_order} runas ({formatCurrency(settings.max_runas_per_order * settings.runa_reward_value)}) por pedido
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuración de Expiración */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Expiración de Runas</h3>
            
            <div className="space-y-2">
              <Label htmlFor="runa_expiry_days">
                Días de validez de las runas
              </Label>
              <Input
                id="runa_expiry_days"
                type="number"
                value={settings.runa_expiry_days}
                onChange={(e) => handleInputChange('runa_expiry_days', e.target.value)}
                min="0"
                disabled={!settings.fidelization_active}
              />
              <p className="text-xs text-muted-foreground">
                {settings.runa_expiry_days === 0 
                  ? 'Las runas no expiran nunca' 
                  : `Las runas expiran después de ${settings.runa_expiry_days} días`
                }
              </p>
            </div>
          </div>

          <Separator />

          {/* Botón de Guardar */}
          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving || !settings.fidelization_active}
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </div>

          {/* Resumen de Configuración */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Resumen de Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Acumulación:</strong> 1 runa por cada {formatCurrency(settings.runa_value)} gastados
                {settings.min_purchase_for_runas > 0 && ` (mínimo ${formatCurrency(settings.min_purchase_for_runas)})`}
              </p>
              <p>
                <strong>Valor de canje:</strong> 1 runa = {formatCurrency(settings.runa_reward_value)}
              </p>
              <p>
                <strong>Límite por pedido:</strong> Máximo {settings.max_runas_per_order} runas ({formatCurrency(settings.max_runas_per_order * settings.runa_reward_value)})
              </p>
              <p>
                <strong>Expiración:</strong> {settings.runa_expiry_days === 0 ? 'Sin expiración' : `${settings.runa_expiry_days} días`}
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}