import { useEffect, useRef } from 'react';
import type { Order } from '@/types';

interface ReadyOrdersSoundsProps {
  orders: Order[];
  soundEnabled: boolean;
  onNewOrder?: (orderId: string) => void;
  onDelivered?: (orderId: string) => void;
}

export function ReadyOrdersSounds({ orders, soundEnabled, onNewOrder, onDelivered }: ReadyOrdersSoundsProps) {
  const prevOrdersRef = useRef<Map<string, string>>(new Map()); // id -> status
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const currentOrders = new Map(orders.map(o => [o.id, o.status]));
    
    // Skip sound on initial load
    if (initialLoadRef.current) {
      prevOrdersRef.current = currentOrders;
      initialLoadRef.current = false;
      return;
    }

    // Detectar nuevos pedidos (no existían antes)
    const newOrders = orders.filter(o => !prevOrdersRef.current.has(o.id));
    
    // Detectar pedidos que cambiaron a "Entregado"
    const newlyDelivered = orders.filter(o => {
      const prevStatus = prevOrdersRef.current.get(o.id);
      return prevStatus && prevStatus !== 'Entregado' && o.status === 'Entregado';
    });
    
    if (soundEnabled) {
      // Sonido para nuevos pedidos
      if (newOrders.length > 0) {
        playNewOrderSound();
        newOrders.forEach(o => onNewOrder?.(o.id));
      }
      
      // Sonido especial para entregados (después del sonido de nuevo si ambos ocurren)
      if (newlyDelivered.length > 0) {
        setTimeout(() => {
          playDeliveredSound();
          newlyDelivered.forEach(o => onDelivered?.(o.id));
        }, newOrders.length > 0 ? 800 : 0);
      }
    }

    prevOrdersRef.current = currentOrders;
  }, [orders, soundEnabled, onNewOrder, onDelivered]);

  return null;
}

// Sonido ascendente para nuevos pedidos (En preparación, Listo)
function playNewOrderSound() {
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
    console.error('Error playing new order sound:', error);
  }
}

// Sonido especial para "Entregado" - más celebratorio
function playDeliveredSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Doble beep celebratorio - más agudo y festivo
    const frequencies = [783.99, 987.77, 1046.50]; // G5, B5, C6 - mayor chord
    const duration = 0.12;
    const gap = 0.08;
    
    frequencies.forEach((freq, index) => {
      const startTime = audioContext.currentTime + (index * (duration + gap));
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + duration * 0.5);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.error('Error playing delivered sound:', error);
  }
}
