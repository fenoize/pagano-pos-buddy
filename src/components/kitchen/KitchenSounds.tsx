import { useEffect, useRef } from 'react';
import { Order } from '@/types';

interface KitchenSoundsProps {
  orders: Order[];
  soundEnabled: boolean;
}

export function KitchenSounds({ orders, soundEnabled }: KitchenSoundsProps) {
  const lastOrderCountRef = useRef(0);
  const lastReadyCountRef = useRef(0);

  useEffect(() => {
    if (!soundEnabled) return;

    const currentOrderCount = orders.length;
    const currentReadyCount = orders.filter(order => order.status === 'Listo').length;

    // New order sound
    if (currentOrderCount > lastOrderCountRef.current) {
      playNewOrderSound();
    }

    // Order ready sound
    if (currentReadyCount > lastReadyCountRef.current) {
      playOrderReadySound();
    }

    lastOrderCountRef.current = currentOrderCount;
    lastReadyCountRef.current = currentReadyCount;
  }, [orders, soundEnabled]);

  const playNewOrderSound = () => {
    // Create a simple beep sound for new orders
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const playOrderReadySound = () => {
    // Create a different beep pattern for ready orders
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First beep
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator1.type = 'sine';
    
    gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.2);

    // Second beep
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime + 0.3);
    oscillator2.type = 'sine';
    
    gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator2.start(audioContext.currentTime + 0.3);
    oscillator2.stop(audioContext.currentTime + 0.5);
  };

  return null; // This component doesn't render anything
}