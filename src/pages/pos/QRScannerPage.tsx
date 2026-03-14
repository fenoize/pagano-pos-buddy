import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, Smartphone, ArrowLeft } from 'lucide-react';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';

interface CameraDevice {
  id: string;
  label: string;
}

export default function QRScannerPage() {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ name: string } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
    if (!token) {
      navigate('/pos/login', { replace: true });
      return;
    }

    // Subscribe to broadcast channel
    channelRef.current = supabase.channel('pos-qr-scan');
    channelRef.current.subscribe();

    initializeCameras();

    return () => {
      stopScanner();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Auto-start when camera selected
  useEffect(() => {
    if (selectedCamera && !isScanning && !isLoading) {
      startScanner(selectedCamera);
    }
  }, [selectedCamera]);

  const initializeCameras = async () => {
    try {
      setError(null);
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const cameraList = devices.map(d => ({
          id: d.id,
          label: d.label || `Cámara ${d.id.substring(0, 8)}`
        }));
        setCameras(cameraList);
        const back = cameraList.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('trasera') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(back?.id || cameraList[0].id);
      } else {
        setError('No se encontraron cámaras disponibles');
      }
    } catch {
      setError('No se pudo acceder a las cámaras. Verifica los permisos del navegador.');
    }
  };

  const startScanner = async (cameraId: string) => {
    if (isScanning) return;
    try {
      setError(null);
      setIsScanning(true);
      scannerRef.current = new Html5Qrcode('qr-reader-page', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      await scannerRef.current.start(
        cameraId,
        { fps: 10, qrbox: { width: 280, height: 280 }, aspectRatio: 1 },
        handleScanSuccess,
        () => {} // ignore no-qr errors
      );
    } catch {
      setError('No se pudo iniciar la cámara.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const match = decodedText.match(/^PAGANOS:([a-f0-9-]{36})$/i);
      if (!match) {
        setLastScanned(null);
        isProcessingRef.current = false;
        return;
      }

      const customerId = match[1];
      setIsLoading(true);
      await stopScanner();

      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        clearStaffStorage();
        navigate('/pos/login', { replace: true });
        return;
      }

      const supabaseUrl = 'https://lxxfhayifyiioglfbsyj.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/staff-list-customers?id=${customerId}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        if (response.status === 401) {
          clearStaffStorage();
          navigate('/pos/login', { replace: true });
          return;
        }
        throw new Error('Error al buscar cliente');
      }

      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const customer: Customer = result.data[0];
        const displayName = `${customer.nombres || customer.name || ''} ${customer.apellidos || customer.apellido || ''}`.trim();

        // Broadcast to POS
        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'customer-scanned',
            payload: { customer }
          });
        }

        setLastScanned({ name: displayName });

        // Resume scanning after 2.5s
        setTimeout(() => {
          setLastScanned(null);
          if (selectedCamera) startScanner(selectedCamera);
        }, 2500);
      } else {
        setError('Cliente no encontrado');
        setTimeout(() => {
          setError(null);
          if (selectedCamera) startScanner(selectedCamera);
        }, 2000);
      }
    } catch (err) {
      console.error('Error processing QR:', err);
      setError('Error al procesar el código QR');
      setTimeout(() => {
        setError(null);
        if (selectedCamera) startScanner(selectedCamera);
      }, 2000);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, [selectedCamera]);

  const handleCameraChange = async (cameraId: string) => {
    await stopScanner();
    setSelectedCamera(cameraId);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Smartphone className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg">Lector QR Remoto</h1>
        </div>
      </header>

      {/* Camera selector */}
      {cameras.length > 1 && (
        <div className="px-4 py-2 shrink-0">
          <Select value={selectedCamera} onValueChange={handleCameraChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar cámara" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="relative w-full max-w-sm aspect-square bg-muted rounded-xl overflow-hidden shadow-lg">
          <div id="qr-reader-page" className="w-full h-full" />

          {/* Loading */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Buscando cliente…</p>
            </div>
          )}

          {/* Success overlay */}
          {lastScanned && (
            <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center text-white p-4 text-center">
              <CheckCircle2 className="h-16 w-16 mb-3" />
              <p className="text-xl font-bold">{lastScanned.name}</p>
              <p className="text-sm mt-1 opacity-90">Enviado al POS ✓</p>
            </div>
          )}

          {/* Error overlay */}
          {error && !isLoading && !lastScanned && (
            <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setError(null); initializeCameras(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          )}
        </div>

        {!error && !isLoading && !lastScanned && (
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Apunta la cámara al código QR del cliente. Se vinculará automáticamente con la venta activa en el POS.
          </p>
        )}
      </div>

      {/* Footer info */}
      <footer className="shrink-0 px-4 py-3 border-t bg-card text-center">
        <p className="text-xs text-muted-foreground">
          <Camera className="inline w-3 h-3 mr-1" />
          Conectado al canal POS — los escaneos se envían en tiempo real
        </p>
      </footer>
    </div>
  );
}
