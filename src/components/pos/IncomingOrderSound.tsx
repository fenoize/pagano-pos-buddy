 import { useEffect, useRef, useCallback } from 'react';
 
 interface IncomingOrderSoundProps {
   enabled: boolean;
   newOrderArrived: boolean;
   onSoundPlayed: () => void;
 }
 
 export function IncomingOrderSound({ enabled, newOrderArrived, onSoundPlayed }: IncomingOrderSoundProps) {
   const audioContextRef = useRef<AudioContext | null>(null);
   const hasPlayedRef = useRef(false);
 
   const playNotificationSound = useCallback(() => {
     if (!enabled || hasPlayedRef.current) return;
 
     try {
       // Create audio context if needed
       if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
       }
 
       const ctx = audioContextRef.current;
       
       // Resume if suspended (Safari requirement)
       if (ctx.state === 'suspended') {
         ctx.resume();
       }
 
       // Create a distinctive two-tone notification sound
       // Different from kitchen sound - lower frequency, double beep
       const playTone = (frequency: number, startTime: number, duration: number) => {
         const oscillator = ctx.createOscillator();
         const gainNode = ctx.createGain();
         
         oscillator.connect(gainNode);
         gainNode.connect(ctx.destination);
         
         oscillator.frequency.value = frequency;
         oscillator.type = 'sine';
         
         // Fade in/out for smoother sound
         gainNode.gain.setValueAtTime(0, startTime);
         gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
         gainNode.gain.linearRampToValueAtTime(0.4, startTime + duration - 0.05);
         gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
         
         oscillator.start(startTime);
         oscillator.stop(startTime + duration);
       };
 
       const now = ctx.currentTime;
       
       // Double beep pattern: beep-beep ... beep-beep
       // First set
       playTone(440, now, 0.15);        // A4
       playTone(523.25, now + 0.2, 0.15); // C5
       
       // Second set (after pause)
       playTone(440, now + 0.5, 0.15);
       playTone(523.25, now + 0.7, 0.15);
 
       hasPlayedRef.current = true;
       onSoundPlayed();
 
       // Reset after a delay to allow for next notification
       setTimeout(() => {
         hasPlayedRef.current = false;
       }, 2000);
 
     } catch (error) {
       console.error('Error playing notification sound:', error);
     }
   }, [enabled, onSoundPlayed]);
 
   useEffect(() => {
     if (newOrderArrived && enabled) {
       playNotificationSound();
     }
   }, [newOrderArrived, enabled, playNotificationSound]);
 
   // Cleanup
   useEffect(() => {
     return () => {
       if (audioContextRef.current) {
         audioContextRef.current.close().catch(console.error);
       }
     };
   }, []);
 
   return null; // This is a sound-only component
 }