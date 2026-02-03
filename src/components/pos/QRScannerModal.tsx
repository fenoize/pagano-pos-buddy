import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types';
import { toast } from 'sonner';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerFound: (customer: Customer) => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

export function QRScannerModal({ isOpen, onClose, onCustomerFound }: QRScannerModalProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  // Initialize cameras on mount
  useEffect(() => {
    if (isOpen) {
      initializeCameras();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Start scanning when camera is selected
  useEffect(() => {
    if (selectedCamera && isOpen && !isScanning) {
      startScanner(selectedCamera);
    }
  }, [selectedCamera, isOpen]);

  const initializeCameras = async () => {
    try {
      setError(null);
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        const cameraList = devices.map(device => ({
          id: device.id,
          label: device.label || `Cámara ${device.id.substring(0, 8)}`
        }));
        setCameras(cameraList);
        
        // Auto-select first camera (usually back camera on mobile)
        const backCamera = cameraList.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('trasera') ||
          c.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera?.id || cameraList[0].id);
      } else {
        setError('No se encontraron cámaras disponibles');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('No se pudo acceder a las cámaras. Verifica los permisos del navegador.');
    }
  };

  const startScanner = async (cameraId: string) => {
    if (isScanning || !containerRef.current) return;

    try {
      setError(null);
      setIsScanning(true);

      // Create new scanner instance
      scannerRef.current = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        handleScanSuccess,
        handleScanError
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('No se pudo iniciar la cámara. Verifica los permisos.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent multiple simultaneous processing
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Validate format: PAGANOS:{uuid}
      const match = decodedText.match(/^PAGANOS:([a-f0-9-]{36})$/i);
      
      if (!match) {
        toast.error('QR no válido', {
          description: 'Este código no corresponde a un cliente de Paganos'
        });
        isProcessingRef.current = false;
        return;
      }

      const customerId = match[1];
      setIsLoading(true);

      // Stop scanner immediately
      await stopScanner();

      // Fetch customer from database
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        toast.error('Sesión expirada');
        clearStaffStorage();
        window.location.href = '/pos/login';
        return;
      }

      const supabaseUrl = 'https://lxxfhayifyiioglfbsyj.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/staff-list-customers?id=${customerId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          clearStaffStorage();
          window.location.href = '/pos/login';
          return;
        }
        throw new Error('Error al buscar cliente');
      }

      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        const customer = result.data[0];
        toast.success('Cliente identificado', {
          description: `${customer.nombres || customer.name || ''} ${customer.apellidos || customer.apellido || ''}`.trim()
        });
        onCustomerFound(customer);
        onClose();
      } else {
        toast.error('Cliente no encontrado', {
          description: 'El código QR no corresponde a un cliente registrado'
        });
        // Restart scanning
        if (selectedCamera) {
          startScanner(selectedCamera);
        }
      }
    } catch (err) {
      console.error('Error processing QR:', err);
      toast.error('Error al procesar el código QR');
      // Restart scanning
      if (selectedCamera) {
        startScanner(selectedCamera);
      }
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, [selectedCamera, onCustomerFound, onClose]);

  const handleScanError = (errorMessage: string) => {
    // Ignore "No QR code found" errors - these are normal during scanning
    if (errorMessage.includes('No MultiFormat Readers') || 
        errorMessage.includes('NotFoundException')) {
      return;
    }
    console.debug('Scan error:', errorMessage);
  };

  const handleCameraChange = async (cameraId: string) => {
    await stopScanner();
    setSelectedCamera(cameraId);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    initializeCameras();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear QR del Cliente
          </DialogTitle>
          <DialogDescription>
            Apunta al código QR del cliente para identificarlo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Selector */}
          {cameras.length > 1 && (
            <Select value={selectedCamera} onValueChange={handleCameraChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cámara" />
              </SelectTrigger>
              <SelectContent>
                {cameras.map(camera => (
                  <SelectItem key={camera.id} value={camera.id}>
                    {camera.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Scanner Container */}
          <div 
            ref={containerRef}
            className="relative aspect-square bg-muted rounded-lg overflow-hidden"
          >
            <div id="qr-reader" className="w-full h-full" />
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Buscando cliente...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            )}
          </div>

          {/* Instructions */}
          {!error && !isLoading && (
            <p className="text-xs text-muted-foreground text-center">
              Posiciona el código QR dentro del recuadro para escanearlo
            </p>
          )}

          {/* Close Button */}
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
