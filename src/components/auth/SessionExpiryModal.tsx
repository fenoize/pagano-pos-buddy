import { useEffect, useState } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SessionExpiryModalProps {
  isOpen: boolean;
  onStayActive: () => void;
  onLogout: () => void;
}

const COUNTDOWN_SECONDS = 45; // Increased from 15 to 45 seconds

export function SessionExpiryModal({ isOpen, onStayActive, onLogout }: SessionExpiryModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  
  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(COUNTDOWN_SECONDS);
      return;
    }
    
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen, onLogout]);
  
  const progressPercentage = ((COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS) * 100;
  
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Tu sesión está por expirar
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por seguridad, tu sesión se cerrará en <strong className="text-foreground">{secondsLeft} segundos</strong>.
            ¿Deseas mantener tu sesión activa?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {/* Progress bar */}
        <Progress value={progressPercentage} className="h-2" />
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={onLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
          <Button
            variant="default"
            onClick={onStayActive}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Permanecer Activo
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
