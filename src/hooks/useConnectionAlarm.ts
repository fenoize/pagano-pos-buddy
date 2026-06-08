import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/useCashSession';
import { useBranchContext } from '@/contexts/BranchContext';

/**
 * Detecta pérdida de conexión del canal de pedidos entrantes.
 * - Monitorea el canal Realtime existente que entrega 'orders' (no crea uno nuevo).
 * - Reproduce alarma con Web Audio API hasta que el usuario reconecte.
 * - Notifica a administradores vía RPC (OneSignal push) una sola vez.
 */
export function useConnectionAlarm() {
  const { user } = useAuthContext();
  const { currentSession } = useCashSession();
  const { activeBranch } = useBranchContext();

  const [isDisconnected, setIsDisconnected] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const alarmTimerRef = useRef<number | null>(null);
  const userInteractedRef = useRef(false);
  const notifiedRef = useRef(false);
  const wasDisconnectedRef = useRef(false);

  const isCustomerRoute = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname;
    return p.startsWith('/cliente') || p.startsWith('/customer');
  }, []);

  const isEligible = !!user?.id && !!currentSession && !isCustomerRoute();

  // First user interaction (autoplay policy)
  useEffect(() => {
    const markInteracted = () => { userInteractedRef.current = true; };
    document.addEventListener('click', markInteracted);
    document.addEventListener('keydown', markInteracted);
    return () => {
      document.removeEventListener('click', markInteracted);
      document.removeEventListener('keydown', markInteracted);
    };
  }, []);

  const stopAlarm = useCallback(() => {
    if (alarmTimerRef.current !== null) {
      clearTimeout(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }
    try { oscRef.current?.stop(); } catch {}
    try { oscRef.current?.disconnect(); } catch {}
    try { gainRef.current?.disconnect(); } catch {}
    oscRef.current = null;
    gainRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
  }, []);

  const startAlarm = useCallback(() => {
    if (!userInteractedRef.current) return;
    if (audioCtxRef.current) return;
    try {
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      gain.connect(ctx.destination);
      gainRef.current = gain;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 880;
      osc.connect(gain);
      osc.start();
      oscRef.current = osc;

      const sequence = [
        { freq: 880, gain: 1.0, dur: 300 },
        { freq: 880, gain: 0.0, dur: 100 },
        { freq: 1200, gain: 1.0, dur: 300 },
        { freq: 1200, gain: 0.0, dur: 300 },
      ];
      let i = 0;
      const tick = () => {
        if (!oscRef.current || !gainRef.current || !audioCtxRef.current) return;
        const step = sequence[i % sequence.length];
        oscRef.current.frequency.setValueAtTime(step.freq, audioCtxRef.current.currentTime);
        gainRef.current.gain.setValueAtTime(step.gain, audioCtxRef.current.currentTime);
        i++;
        alarmTimerRef.current = window.setTimeout(tick, step.dur);
      };
      tick();
    } catch (e) {
      console.error('[useConnectionAlarm] startAlarm error:', e);
    }
  }, []);

  /**
   * Busca el canal Realtime que entrega pedidos.
   * El topic de Supabase tiene formato 'realtime:<channelName>'.
   */
  const findOrdersChannel = useCallback(() => {
    try {
      const channels = supabase.getChannels();
      return channels.find((ch) => {
        const topic = (ch as any).topic?.toLowerCase?.() ?? '';
        return topic.includes('order'); // matches 'incoming-orders', 'orders', etc.
      });
    } catch {
      return undefined;
    }
  }, []);

  const isOrdersChannelHealthy = useCallback(() => {
    const ch = findOrdersChannel();
    // Si aún no existe el canal, considerarlo sano (puede estar inicializándose)
    if (!ch) return true;
    const state = (ch as any).state;
    // 'joined' = SUBSCRIBED. Estados transitorios (joining/connecting/errored)
    // NO se consideran desconexión — son parte del ciclo normal de reconexión.
    // Solo 'closed' sostenido indica desconexión real.
    return state !== 'closed';
  }, [findOrdersChannel]);

  // Debounce: tiempo que el canal debe estar no-saludable antes de alarmar
  const unhealthySinceRef = useRef<number | null>(null);
  const UNHEALTHY_DEBOUNCE_MS = 5000;

  const triggerDisconnect = useCallback(() => {
    if (!isEligible) return;
    if (wasDisconnectedRef.current) return;
    wasDisconnectedRef.current = true;
    setIsDisconnected(true);
    startAlarm();

    if (!notifiedRef.current) {
      notifiedRef.current = true;
      supabase
        .rpc('notify_admin_disconnection' as any, {
          branch_name: activeBranch?.name ?? 'Desconocida',
          cashier_name: user?.full_name ?? user?.username ?? 'Cajero',
          disconnected_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error('[useConnectionAlarm] notify rpc error:', error);
        });
    }
  }, [isEligible, startAlarm, activeBranch?.name, user?.full_name, user?.username]);

  const handleReconnect = useCallback(() => {
    if (!wasDisconnectedRef.current) return;
    wasDisconnectedRef.current = false;
    setIsDisconnected(false);
    notifiedRef.current = false;
    stopAlarm();
  }, [stopAlarm]);

  const dismissAlarm = useCallback(() => {
    stopAlarm();
    setIsDisconnected(false);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [stopAlarm]);

  // Browser online/offline (sin cambios)
  useEffect(() => {
    if (!isEligible) return;

    const onOffline = () => triggerDisconnect();
    const onOnline = () => handleReconnect();

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      triggerDisconnect();
    }

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [isEligible, triggerDisconnect, handleReconnect]);

  // Visibilidad de pestaña + chequeo periódico del canal de pedidos
  useEffect(() => {
    if (!isEligible) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      // Pequeño delay para permitir que Realtime intente re-suscribirse
      window.setTimeout(() => {
        if (!isOrdersChannelHealthy()) {
          triggerDisconnect();
        }
      }, 1500);
    };

    document.addEventListener('visibilitychange', onVisibility);

    // Health check periódico cada 30s mientras la pestaña esté visible
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (!isOrdersChannelHealthy()) {
        triggerDisconnect();
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, [isEligible, isOrdersChannelHealthy, triggerDisconnect]);

  // Limpieza si deja de ser elegible
  useEffect(() => {
    if (!isEligible && wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      notifiedRef.current = false;
      setIsDisconnected(false);
      stopAlarm();
    }
  }, [isEligible, stopAlarm]);

  useEffect(() => () => stopAlarm(), [stopAlarm]);

  return { isDisconnected, dismissAlarm };
}
