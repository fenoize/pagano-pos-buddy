import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiagnosticsResult {
  publicKey: {
    configured: boolean;
    valid: boolean;
    error?: string;
  };
  accessToken: {
    configured: boolean;
    valid: boolean;
    error?: string;
  };
  clientId: {
    configured: boolean;
  };
  clientSecret: {
    configured: boolean;
  };
  mode: 'sandbox' | 'production';
  overall: 'success' | 'partial' | 'error';
}

export function MPDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-diagnostics');

      if (error) throw error;

      setDiagnostics(data as DiagnosticsResult);
      
      if (data.overall === 'success') {
        toast.success('Todas las credenciales están configuradas correctamente');
      } else if (data.overall === 'partial') {
        toast.warning('Algunas credenciales necesitan atención');
      } else {
        toast.error('La configuración de MercadoPago necesita correcciones');
      }
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      toast.error('Error al ejecutar diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (configured: boolean, valid?: boolean) => {
    if (!configured) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (valid === false) {
      return <AlertCircle className="h-4 w-4 text-warning" />;
    }
    if (valid === true) {
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (configured: boolean, valid?: boolean) => {
    if (!configured) {
      return <Badge variant="destructive">No configurado</Badge>;
    }
    if (valid === false) {
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Inválido</Badge>;
    }
    if (valid === true) {
      return <Badge variant="default" className="bg-success text-success-foreground">Válido</Badge>;
    }
    return <Badge variant="secondary">Configurado</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Diagnóstico de MercadoPago</CardTitle>
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={loading}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Ejecutar diagnóstico
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Verifica el estado de todas las credenciales de MercadoPago
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!diagnostics && !loading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ejecuta el diagnóstico para verificar la configuración de MercadoPago
            </AlertDescription>
          </Alert>
        )}

        {diagnostics && (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Modo:</span>
                <Badge variant={diagnostics.mode === 'production' ? 'default' : 'secondary'}>
                  {diagnostics.mode === 'production' ? 'Producción' : 'Sandbox (Pruebas)'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {/* Public Key */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostics.publicKey.configured, diagnostics.publicKey.valid)}
                  <div>
                    <p className="text-sm font-medium">Public Key</p>
                    {diagnostics.publicKey.error && (
                      <p className="text-xs text-muted-foreground">{diagnostics.publicKey.error}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(diagnostics.publicKey.configured, diagnostics.publicKey.valid)}
              </div>

              {/* Access Token */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostics.accessToken.configured, diagnostics.accessToken.valid)}
                  <div>
                    <p className="text-sm font-medium">Access Token</p>
                    {diagnostics.accessToken.error && (
                      <p className="text-xs text-muted-foreground">{diagnostics.accessToken.error}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(diagnostics.accessToken.configured, diagnostics.accessToken.valid)}
              </div>

              {/* Client ID */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostics.clientId.configured)}
                  <div>
                    <p className="text-sm font-medium">Client ID</p>
                  </div>
                </div>
                {getStatusBadge(diagnostics.clientId.configured)}
              </div>

              {/* Client Secret */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostics.clientSecret.configured)}
                  <div>
                    <p className="text-sm font-medium">Client Secret</p>
                  </div>
                </div>
                {getStatusBadge(diagnostics.clientSecret.configured)}
              </div>
            </div>

            {/* Overall Status */}
            {diagnostics.overall === 'success' && (
              <Alert className="border-success bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  ✓ Todas las credenciales están configuradas y son válidas
                </AlertDescription>
              </Alert>
            )}

            {diagnostics.overall === 'partial' && (
              <Alert className="border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  ⚠ Algunas credenciales necesitan atención. Revisa los detalles arriba.
                </AlertDescription>
              </Alert>
            )}

            {diagnostics.overall === 'error' && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  ✗ La configuración necesita correcciones. Completa todas las credenciales requeridas.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
