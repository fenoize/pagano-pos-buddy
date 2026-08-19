/**
 * AudioContext singleton para alarmas del POS.
 * Se desbloquea en la primera interacción del usuario (política de autoplay)
 * y se mantiene vivo para poder sonar aunque la pestaña no tenga foco.
 */
let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (e) {
    console.error('[audioManager] unlockAudio error:', e);
  }
}

export function isAudioUnlocked() {
  return !!ctx && ctx.state === 'running';
}

/** Alarma corta 880/660/880 Hz, sin archivos de audio. */
export function playAlarm() {
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('[audioManager] playAlarm error:', e);
  }
}
