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

/** Volumen de la alarma según nivel de escalada (0 = primer aviso). */
function volumeForLevel(level: number): number {
  const base = 0.35;
  const step = 0.13;
  return Math.min(1, base + Math.max(0, level) * step);
}

/**
 * Alarma tipo sirena para pedidos nuevos.
 * - Patrón de dos tonos repetidos (más perceptible que beeps suaves).
 * - `level` controla el volumen: sube con cada repetición hasta el máximo.
 */
export function playAlarm(level: number = 0) {
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const volume = volumeForLevel(level);
    const now = ctx.currentTime;

    // 3 ciclos de sirena aguda (1046 Hz) / grave (784 Hz)
    const pattern: Array<[number, number]> = [
      [1046, 0],
      [784, 0.18],
      [1046, 0.36],
      [784, 0.54],
      [1046, 0.72],
      [784, 0.9],
    ];
    const toneDuration = 0.16;

    for (const [freq, offset] of pattern) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, now + offset);

      gainNode.gain.setValueAtTime(0.0001, now + offset);
      gainNode.gain.exponentialRampToValueAtTime(volume, now + offset + 0.02);
      gainNode.gain.setValueAtTime(volume, now + offset + toneDuration - 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + offset + toneDuration);

      oscillator.start(now + offset);
      oscillator.stop(now + offset + toneDuration + 0.05);
    }
  } catch (e) {
    console.error('[audioManager] playAlarm error:', e);
  }
}
