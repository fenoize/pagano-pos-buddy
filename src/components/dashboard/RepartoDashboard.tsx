import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { TruckIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const RepartoDashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirigir automáticamente a la pantalla de delivery
    navigate('/pos/delivery', { replace: true });
  }, [navigate]);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TruckIcon className="w-16 h-16 text-primary mb-4 animate-pulse" />
          <p className="text-muted-foreground">Redirigiendo a tus deliverys...</p>
        </CardContent>
      </Card>
    </div>
  );
};
