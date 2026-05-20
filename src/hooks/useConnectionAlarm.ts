import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/useCashSession';
import { useBranchContext } from '@/contexts/BranchContext';

/**
 * Detecta pérdida de conexión en el POS cuando hay sesión de caja abierta.
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isCustomerRoute = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname;
    return p.startsWith('/cliente') || p.startsWith('/customer');
  }, []);

  const isEligible = !!user?.id && !!currentSession && !isCustomerRoute();

  // Track first user interaction (autoplay policy)
  useEffect(() => {
    const markInteracted = () => { userInteractedRef.current = true; };
    document.addEventListener('click', markInteracted, { once: false });
    document.addEventListener('keydown', markInteracted, { once: false });
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

      // Pattern: 880Hz 0.3s ON, silence 0.1s, 1200Hz 0.3s ON, silence 0.3s
      const sequence: Array<{ freq: number; gain: number; dur: number }> = [
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

  const triggerDisconnect = useCallback(() => {
    if (!isEligible) return;
    if (wasDisconnectedRef.current) return;
    wasDisconnectedRef.current = true;
    setIsDisconnected(true);
    startAlarm();

    if (!notifiedRef.current) {
      notifiedRef.current = true;
      // Fire and forget
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

  // Browser online/offline
  useEffect(() => {
    if (!isEligible) return;

    const onOffline = () => triggerDisconnect();
    const onOnline = () => handleReconnect();
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && wasDisconnectedRef.current) {
        window.location.reload();
      }
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      triggerDisconnect();
    }

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isEligible, triggerDisconnect, handleReconnect]);

  // Supabase channel health check
  useEffect(() => {
    if (!isEligible) return;

    const ch = supabase.channel('connection-alarm-heartbeat');
    channelRef.current = ch;
    ch.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        triggerDisconnect();
      } else if (status === 'SUBSCRIBED') {
        handleReconnect();
      }
    });

    return () => {
      try { supabase.removeChannel(ch); } catch {}
      channelRef.current = null;
    };
  }, [isEligible, triggerDisconnect, handleReconnect]);

  // Cleanup on unmount or no longer eligible
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
