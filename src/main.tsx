import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Registrar Service Worker para PWA
// Usa diferentes SW según el contexto (POS vs Customer)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isPOS = window.location.pathname.startsWith('/pos');
    const swPath = isPOS ? '/sw-pos.js' : '/sw.js';
    const swScope = isPOS ? '/pos/' : '/';
    
    navigator.serviceWorker.register(swPath, { scope: swScope })
      .then((registration) => {
        console.log(`[SW${isPOS ? '-POS' : ''}] Registered:`, registration.scope);
      })
      .catch((registrationError) => {
        console.log('SW falló al registrarse:', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
