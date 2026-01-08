import { useEffect, useRef } from 'react';
import type { Order } from '@/types';

interface ReadyOrdersSoundsProps {
  orders: Order[];
  soundEnabled: boolean;
  onNewReady?: (orderId: string) => void;
}

export function ReadyOrdersSounds({ orders, soundEnabled, onNewReady }: ReadyOrdersSoundsProps) {
  const prevOrderIds = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const currentIds = new Set(orders.map(o => o.id));
    
    // Skip sound on initial load
    if (initialLoadRef.current) {
      prevOrderIds.current = currentIds;
      initialLoadRef.current = false;
      return;
    }

    // Find new orders that weren't in previous set
    const newOrders = orders.filter(o => !prevOrderIds.current.has(o.id));
    
    if (newOrders.length > 0 && soundEnabled) {
      playReadySound();
      newOrders.forEach(o => onNewReady?.(o.id));
    }

    prevOrderIds.current = currentIds;
  }, [orders, soundEnabled, onNewReady]);

  return null;
}

// Triple ascending beep for "ready" notification
function playReadySound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - ascending chord
    const duration = 0.15;
    const gap = 0.1;
    
    frequencies.forEach((freq, index) => {
      const startTime = audioContext.currentTime + (index * (duration + gap));
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration * 0.5);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.error('Error playing ready sound:', error);
  }
}
