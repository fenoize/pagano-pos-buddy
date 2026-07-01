import { useEffect, useState } from 'react';
import { Flame, Sparkles, Award, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'clan_onboarding_seen';

const slides = [
  {
    icon: Flame,
    title: 'Bienvenido al Clan Pagano',
    body: 'Has forjado tu lugar entre los Paganos. Cada hamburguesa que elijas te fortalecerá dentro del Clan.',
    cta: 'Continuar →',
  },
  {
    icon: Sparkles,
    title: 'Runas — La moneda del Clan',
    body: 'Por cada $5.000 en compras ganas 1 Runa. Úsalas para canjear descuentos exclusivos en tus próximos pedidos.',
    cta: 'Continuar →',
  },
  {
    icon: Award,
    title: 'Puntos — Tu rango en el Clan',
    body: 'Por cada $100 en compras ganas 1 Punto. Los Puntos determinan tu rango: Recluta del Clan, Guerrero Pagano o Leyenda Pagana. Más rango, más beneficios.',
    cta: '¡Comenzar!',
  },
];

export function ClanOnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else close();
  };

  if (!visible) return null;

  const slide = slides[index];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col p-6">
      <div className="flex justify-end">
        <button
          onClick={close}
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
          aria-label="Saltar"
        >
          Saltar <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8">
          <Icon className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-4">{slide.title}</h2>
        <p className="text-muted-foreground text-base leading-relaxed">{slide.body}</p>
      </div>

      <div className="flex flex-col items-center gap-6 pb-4">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <Button
          size="lg"
          className="w-full max-w-md bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
          onClick={next}
        >
          {slide.cta}
        </Button>
      </div>
    </div>
  );
}
