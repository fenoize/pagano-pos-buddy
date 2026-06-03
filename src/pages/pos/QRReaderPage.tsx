import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, QrCode, ArrowLeft, Repeat } from 'lucide-react';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ───────────────────────────────────────────────────────────

interface CameraDevice { id: string; label: string; }

interface ActiveSession {
  id: string;
  user_id: string;
  opened_at: string;
  userName: string;
  userRole: string;
}

// ─── Session Picker ──────────────────────────────────────────────────

function SessionPicker({ onSelect }: { onSelect: (s: ActiveSession) => void }) {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) return;

      // Fetch active sessions
      const { data: raw, error: e } = await supabase
        .from('cash_sessions')
        .select('id, user_id, opened_at')
        .is('closed_at', null)
        .order('opened_at', { ascending: false });

      if (e) throw e;
      if (!raw || raw.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // Fetch user names
      const userIds = [...new Set(raw.map(s => s.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, username, role')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      setSessions(raw.map(s => {
        const u = userMap.get(s.user_id);
        return {
          id: s.id,
          user_id: s.user_id,
          opened_at: s.opened_at || '',
          userName: u?.full_name || u?.username || 'Desconocido',
          userRole: u?.role || '',
        };
      }));
    } catch {
      setError('No se pudieron cargar los turnos activos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
      <QrCode className="w-16 h-16 text-primary opacity-80" />
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">Lector QR Dedicado</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Selecciona el turno activo al que deseas vincular este lector.
        </p>
      </div>

      {loading && (
        <div className="w-full max-w-sm space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {error && (
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
          </Button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">No hay turnos activos en este momento.</p>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="w-full max-w-sm space-y-3">
          {sessions.map(s => (
            <Card
              key={s.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelect(s)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.userRole} · Abierto {fmt(s.opened_at)}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">Vincular</Badge>
              </CardContent>
            </Card>
          ))}
          <Button variant="ghost" size="sm" className="w-full" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar lista
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Scanner View ────────────────────────────────────────────────────

function ScannerView({ session, onChangeSession }: { session: ActiveSession; onChangeSession: () => void }) {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ name: string } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Setup channel for this session
  useEffect(() => {
    const channelName = `pos-qr-scan-${session.id}`;
    channelRef.current = supabase.channel(channelName);
    channelRef.current.subscribe();

    initCameras();

    return () => {
      stopScanner();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [session.id]);

  // Auto-start camera
  useEffect(() => {
    if (selectedCamera && !isScanning && !isLoading) startScanner(selectedCamera);
  }, [selectedCamera]);

  const initCameras = async () => {
    try {
      setError(null);
      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) { setError('No se encontraron cámaras'); return; }
      const list = devices.map(d => ({ id: d.id, label: d.label || `Cámara ${d.id.substring(0, 8)}` }));
      setCameras(list);
      const back = list.find(c => /back|trasera|rear|environment/i.test(c.label));
      setSelectedCamera(back?.id || list[0].id);
    } catch {
      setError('No se pudo acceder a las cámaras. Verifica permisos.');
    }
  };

  const startScanner = async (cameraId: string) => {
    if (isScanning) return;
    try {
      setError(null);
      setIsScanning(true);
      scannerRef.current = new Html5Qrcode('qr-reader-dedicated', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      await scannerRef.current.start(
        cameraId,
        { fps: 10, qrbox: { width: 280, height: 280 }, aspectRatio: 1 },
        handleScan,
        () => {},
      );
    } catch {
      setError('No se pudo iniciar la cámara.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleScan = useCallback(async (text: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const match = text.match(/^PAGANOS:([a-f0-9-]{36})$/i);
      if (!match) { isProcessingRef.current = false; return; }

      const customerId = match[1];
      setIsLoading(true);
      await stopScanner();

      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) { clearStaffStorage(); navigate('/pos/login', { replace: true }); return; }

      const url = 'https://lxxfhayifyiioglfbsyj.supabase.co';
      const res = await fetch(`${url}/functions/v1/staff-list-customers?id=${customerId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        if (res.status === 401) { clearStaffStorage(); navigate('/pos/login', { replace: true }); return; }
        throw new Error('Error al buscar cliente');
      }

      const result = await res.json();

      if (result.data?.length) {
        const customer: Customer = result.data[0];
        const displayName = `${customer.nombres || customer.name || ''} ${customer.apellidos || customer.apellido || ''}`.trim();

        if (channelRef.current) {
          await channelRef.current.send({
            type: 'broadcast',
            event: 'customer-scanned',
            payload: { customer },
          });
        }

        setLastScanned({ name: displayName });
        setTimeout(() => { setLastScanned(null); if (selectedCamera) startScanner(selectedCamera); }, 2500);
      } else {
        setError('Cliente no encontrado');
        setTimeout(() => { setError(null); if (selectedCamera) startScanner(selectedCamera); }, 2000);
      }
    } catch (err) {
      console.error('QR error:', err);
      setError('Error al procesar el código QR');
      setTimeout(() => { setError(null); if (selectedCamera) startScanner(selectedCamera); }, 2000);
    } finally {
      setIsLoading(false);
      isProcessingRef.current = false;
    }
  }, [selectedCamera, navigate, session.id]);

  const handleCameraChange = async (id: string) => {
    await stopScanner();
    setSelectedCamera(id);
  };

  return (
    <>
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

      {/* Scanner */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="relative w-full max-w-sm aspect-square bg-muted rounded-xl overflow-hidden shadow-lg">
          <div id="qr-reader-dedicated" className="w-full h-full" />

          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Buscando cliente…</p>
            </div>
          )}

          {lastScanned && (
            <div className="absolute inset-0 bg-primary/90 flex flex-col items-center justify-center text-primary-foreground p-4 text-center">
              <CheckCircle2 className="h-16 w-16 mb-3" />
              <p className="text-xl font-bold">{lastScanned.name}</p>
              <p className="text-sm mt-1 opacity-90">Enviado al POS ✓</p>
            </div>
          )}

          {error && !isLoading && !lastScanned && (
            <div className="absolute inset-0 bg-background flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={() => { setError(null); initCameras(); }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
              </Button>
            </div>
          )}
        </div>

        {!error && !isLoading && !lastScanned && (
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Apunta al código QR del cliente. Se vinculará al turno de <strong>{session.userName}</strong>.
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 px-4 py-3 border-t bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Vinculado a: <strong>{session.userName}</strong>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onChangeSession}>
            <Repeat className="h-4 w-4 mr-1" /> Cambiar turno
          </Button>
        </div>
      </footer>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function QRReaderPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<ActiveSession | null>(null);

  // Restore persisted session
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
    if (!token) { navigate('/pos/login', { replace: true }); return; }

    const saved = localStorage.getItem(STORAGE_KEYS.QR_READER_SESSION);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ActiveSession;
        // Verify still open
        supabase
          .from('cash_sessions')
          .select('id')
          .eq('id', parsed.id)
          .is('closed_at', null)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setSession(parsed);
            else localStorage.removeItem(STORAGE_KEYS.QR_READER_SESSION);
          });
      } catch {
        localStorage.removeItem(STORAGE_KEYS.QR_READER_SESSION);
      }
    }
  }, []);

  const handleSelect = (s: ActiveSession) => {
    setSession(s);
    localStorage.setItem(STORAGE_KEYS.QR_READER_SESSION, JSON.stringify(s));
  };

  const handleChangeSession = () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEYS.QR_READER_SESSION);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <QrCode className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg">Lector QR</h1>
        </div>
        {session && (
          <Badge variant="outline" className="text-xs">
            {session.userName}
          </Badge>
        )}
      </header>

      {!session ? (
        <SessionPicker onSelect={handleSelect} />
      ) : (
        <ScannerView session={session} onChangeSession={handleChangeSession} />
      )}
    </div>
  );
}
