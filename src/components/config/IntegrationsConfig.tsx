import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Puzzle, Save, CheckCircle2, XCircle, Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export const IntegrationsConfig: React.FC = () => {
  const [mapboxToken, setMapboxToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('mapbox_token')
        .single();

      if (error) throw error;
      
      const token = data?.mapbox_token || '';
      setMapboxToken(token);
      setSavedToken(token);
      
      if (token) {
        validateToken(token);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async (token: string) => {
    if (!token.trim()) {
      setIsValid(null);
      return;
    }

    setValidating(true);
    try {
      // Test the token with a simple geocoding request
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/Santiago.json?access_token=${token}&limit=1`
      );
      
      setIsValid(response.ok);
      
      if (!response.ok) {
        toast.error('Token de Mapbox inválido');
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setIsValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('delivery_settings')
        .update({ mapbox_token: mapboxToken.trim() })
        .not('id', 'is', null);

      if (error) throw error;

      setSavedToken(mapboxToken.trim());
      
      if (mapboxToken.trim()) {
        await validateToken(mapboxToken.trim());
      } else {
        setIsValid(null);
      }
      
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = mapboxToken !== savedToken;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="w-5 h-5" />
          Integraciones
        </CardTitle>
        <CardDescription>
          Configura las integraciones con servicios externos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mapbox Integration */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MB</span>
              </div>
              <div>
                <h3 className="font-semibold">Mapbox</h3>
                <p className="text-sm text-muted-foreground">
                  Mapas, geocodificación y cálculo de distancias
                </p>
              </div>
            </div>
            {isValid !== null && (
              <Badge variant={isValid ? "default" : "destructive"} className="gap-1">
                {isValid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Conectado
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    Error
                  </>
                )}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapboxToken">Public Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="mapboxToken"
                  type={showToken ? "text" : "password"}
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  placeholder="pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJj..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => validateToken(mapboxToken)}
                disabled={validating || !mapboxToken.trim()}
              >
                {validating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Validar'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtén tu token público en{' '}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                mapbox.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
            <p className="font-medium">Con Mapbox podrás:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Dibujar zonas de delivery en el mapa</li>
              <li>Detectar automáticamente la zona por dirección</li>
              <li>Calcular tarifas por distancia en kilómetros</li>
              <li>Autocompletar direcciones de clientes</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
