import { useEffect, useRef, useCallback } from 'react';

interface IncomingOrderSoundProps {
  enabled: boolean;
  newOrderArrived: boolean;
  onSoundPlayed: () => void;
  /** If true, sound loops until enabled becomes false or newOrderArrived resets */
  persistent?: boolean;
}

export function IncomingOrderSound({ enabled, newOrderArrived, onSoundPlayed, persistent = false }: IncomingOrderSoundProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const loopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNotifiedRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }, []);

  const playBeep = useCallback(() => {
    try {
      const ctx = getAudioContext();

      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      // Urgent double-beep pattern
      playTone(440, now, 0.15);
      playTone(523.25, now + 0.2, 0.15);
      playTone(440, now + 0.5, 0.15);
      playTone(523.25, now + 0.7, 0.15);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [getAudioContext]);

  const stopLoop = useCallback(() => {
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
  }, []);

  // Start or stop the persistent loop
  useEffect(() => {
    if (!enabled || !newOrderArrived) {
      stopLoop();
      hasNotifiedRef.current = false;
      return;
    }

    // Play immediately
    playBeep();

    if (!hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onSoundPlayed();
    }

    if (persistent) {
      // Repeat every 4 seconds until dismissed
      loopIntervalRef.current = setInterval(() => {
        playBeep();
      }, 4000);
    }

    return () => stopLoop();
  }, [enabled, newOrderArrived, persistent, playBeep, stopLoop, onSoundPlayed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, [stopLoop]);

  return null;
}