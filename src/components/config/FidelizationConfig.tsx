import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Star, Save, Loader2, Award, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getStaffSupabaseClient } from '@/lib/supabaseClient';

interface FidelizationSettings {
  runa_value: number;
  runa_reward_value: number;
  max_runas_per_order: number;
  min_purchase_for_runas: number;
  runa_expiry_days: number;
  fidelization_active: boolean;
  runas_exclude_if_paid_with_runas: boolean;
  runas_exclude_if_discounted: boolean;
  runas_min_eligible_amount: number;
}

export function FidelizationConfig() {
  const [settings, setSettings] = useState<FidelizationSettings>({
    runa_value: 1000,
    runa_reward_value: 1000,
    max_runas_per_order: 50,
    min_purchase_for_runas: 1000,
    runa_expiry_days: 0,
    fidelization_active: true,
    runas_exclude_if_paid_with_runas: true,
    runas_exclude_if_discounted: true,
    runas_min_eligible_amount: 1000,
  });
  const [levels, setLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingRunas, setProcessingRunas] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadLevels();
    loadPendingSubscriptions();
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
          'fidelization_active',
          'runas_exclude_if_paid_with_runas',
          'runas_exclude_if_discounted',
          'runas_min_eligible_amount',
        ]);

      if (error) throw error;

      const configMap: any = {};
      data?.forEach(item => {
        configMap[item.key] = typeof item.value === 'object' ? item.value : item.value;
      });

      setSettings({
        runa_value: Number(configMap.runa_value) || 1000,
        runa_reward_value: Number(configMap.runa_reward_value) || 1000,
        max_runas_per_order: Number(configMap.max_runas_per_order) || 50,
        min_purchase_for_runas: Number(configMap.min_purchase_for_runas) || 1000,
        runa_expiry_days: Number(configMap.runa_expiry_days) || 0,
        fidelization_active: Boolean(configMap.fidelization_active ?? true),
        runas_exclude_if_paid_with_runas: Boolean(configMap.runas_exclude_if_paid_with_runas ?? true),
        runas_exclude_if_discounted: Boolean(configMap.runas_exclude_if_discounted ?? true),
        runas_min_eligible_amount: Number(configMap.runas_min_eligible_amount) || 1000,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la configuración',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_level_definitions')
        .select('*')
        .eq('is_active', true)
        .order('level_order', { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error: any) {
      console.error('Error loading levels:', error);
    }
  };

  const loadPendingSubscriptions = async () => {
    try {
      // Contar suscripciones pendientes de ejecutar
      const { count, error } = await supabase
        .from('customer_runa_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .lte('next_execution_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;
      setPendingCount(count || 0);

      // Obtener última ejecución
      const { data: lastExec } = await supabase
        .from('customer_runa_subscriptions')
        .select('last_executed_at')
        .not('last_executed_at', 'is', null)
        .order('last_executed_at', { ascending: false })
        .limit(1);

      if (lastExec && lastExec.length > 0) {
        setLastProcessed(lastExec[0].last_executed_at);
      }
    } catch (error) {
      console.error('Error loading pending subscriptions:', error);
    }
  };

  const processAutoRunas = async () => {
    setProcessingRunas(true);
    try {
      const { data, error } = await supabase.rpc('process_auto_runas');

      if (error) throw error;

      const result = data as { processed_count?: number; expired_count?: number } | null;
      
      toast({
        title: "Runas procesadas",
        description: `Se procesaron ${result?.processed_count || 0} suscripciones. ${result?.expired_count || 0} expiraron.`,
      });

      // Recargar datos
      await loadPendingSubscriptions();
    } catch (error: any) {
      console.error('Error processing auto runas:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron procesar las runas automáticas",
        variant: "destructive"
      });
    } finally {
      setProcessingRunas(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const staffClient = getStaffSupabaseClient();

      const configUpdates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value as any,
        updated_at: new Date().toISOString()
      }));

      const { error } = await staffClient
        .from('config')
        .upsert(configUpdates, { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "Configuración de fidelización guardada correctamente",
      });
    } catch (error: any) {
      console.error('Error saving fidelization settings:', error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo guardar la configuración",
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
      {/* Procesamiento Manual de Runas Automáticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Procesamiento de Runas Automáticas
          </CardTitle>
          <CardDescription>
            Ejecuta manualmente el procesamiento de suscripciones de runas pendientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Suscripciones pendientes: <Badge variant={pendingCount > 0 ? "destructive" : "secondary"}>{pendingCount}</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {lastProcessed 
                  ? `Último procesamiento: ${new Date(lastProcessed).toLocaleString('es-CL')}`
                  : 'Nunca se ha ejecutado'
                }
              </p>
            </div>
            <Button 
              onClick={processAutoRunas} 
              disabled={processingRunas}
              variant={pendingCount > 0 ? "default" : "outline"}
            >
              {processingRunas ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Procesar Ahora
                </>
              )}
            </Button>
          </div>
          
          {pendingCount > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Hay {pendingCount} suscripciones pendientes de entregar runas. 
                Ejecuta el procesamiento para entregarlas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restricciones de Acumulación</CardTitle>
          <CardDescription>
            Define cuándo NO se deben acumular runas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="runas_exclude_if_paid_with_runas" className="text-base font-medium">
                No acumular si se paga con runas
              </Label>
              <p className="text-sm text-muted-foreground">
                Los clientes no ganan runas en compras pagadas con runas
              </p>
            </div>
            <Switch
              id="runas_exclude_if_paid_with_runas"
              checked={settings.runas_exclude_if_paid_with_runas}
              onCheckedChange={(checked) => handleInputChange('runas_exclude_if_paid_with_runas', checked)}
              disabled={!settings.fidelization_active}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="runas_exclude_if_discounted" className="text-base font-medium">
                No acumular si hay descuentos o cupones
              </Label>
              <p className="text-sm text-muted-foreground">
                Los clientes no ganan runas en compras con descuentos aplicados
              </p>
            </div>
            <Switch
              id="runas_exclude_if_discounted"
              checked={settings.runas_exclude_if_discounted}
              onCheckedChange={(checked) => handleInputChange('runas_exclude_if_discounted', checked)}
              disabled={!settings.fidelization_active}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="runas_min_eligible_amount">
              Monto mínimo para acumular runas
            </Label>
            <Input
              id="runas_min_eligible_amount"
              type="number"
              value={settings.runas_min_eligible_amount}
              onChange={(e) => handleInputChange('runas_min_eligible_amount', e.target.value)}
              min="0"
              disabled={!settings.fidelization_active}
            />
            <p className="text-xs text-muted-foreground">
              Compras bajo este monto no acumulan runas ({formatCurrency(settings.runas_min_eligible_amount)})
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {/* Botón de Guardar */}
          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
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

          <Separator />

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
              <p>
                <strong>Restricciones:</strong> 
                {settings.runas_exclude_if_paid_with_runas && ' Sin runas si paga con runas.'}
                {settings.runas_exclude_if_discounted && ' Sin runas si hay descuentos.'}
                {settings.runas_min_eligible_amount > 0 && ` Mínimo ${formatCurrency(settings.runas_min_eligible_amount)}.`}
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Configuración de Niveles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Sistema de Niveles
          </CardTitle>
          <CardDescription>
            Los niveles se calculan automáticamente según las runas acumuladas del cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nivel</TableHead>
                <TableHead>Runas Mínimas</TableHead>
                <TableHead>Runas Máximas</TableHead>
                <TableHead>Descripción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell>
                    <Badge variant="outline" className={level.color}>
                      {level.level_name}
                    </Badge>
                  </TableCell>
                  <TableCell>{level.min_points}</TableCell>
                  <TableCell>{level.max_points ?? '∞'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {level.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {levels.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay niveles configurados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}