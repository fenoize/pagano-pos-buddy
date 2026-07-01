import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Send, CheckCircle } from 'lucide-react';
import { useOrderFeedback } from '@/hooks/useOrderFeedback';
import { cn } from '@/lib/utils';

interface OrderFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  customerId: string;
  orderNumber: string;
}

type FeedbackStep = 'rating' | 'comment' | 'thanks';

export function OrderFeedbackModal({
  open,
  onClose,
  orderId,
  customerId,
  orderNumber
}: OrderFeedbackModalProps) {
  const [step, setStep] = useState<FeedbackStep>('rating');
  const [selectedRating, setSelectedRating] = useState<'positive' | 'negative' | null>(null);
  const [comment, setComment] = useState('');
  const { submitFeedback, loading } = useOrderFeedback();

  const handleRatingSelect = async (rating: 'positive' | 'negative') => {
    setSelectedRating(rating);
    
    if (rating === 'positive') {
      // Submit immediately for positive ratings
      const success = await submitFeedback(orderId, customerId, rating);
      if (success) {
        setStep('thanks');
      }
    } else {
      // Show comment field for negative ratings
      setStep('comment');
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedRating) return;
    
    const success = await submitFeedback(orderId, customerId, selectedRating, comment);
    if (success) {
      setStep('thanks');
    }
  };

  const handleClose = () => {
    // Reset state on close
    setStep('rating');
    setSelectedRating(null);
    setComment('');
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent className="customer-app max-w-md p-0 overflow-hidden dark bg-background text-foreground border-border">
        {/* Header */}
        <div className="relative bg-primary/10 p-6 text-center">
          <AlertDialogTitle className="text-xl font-bold">
            {step === 'thanks' 
              ? '¡Gracias por tu feedback!' 
              : '¿Cómo estuvo tu pedido?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
            Pedido #{orderNumber}
          </AlertDialogDescription>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'rating' && (
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleRatingSelect('positive')}
                disabled={loading}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border transition-all",
                  "hover:border-green-500 hover:bg-green-950/20",
                  "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-background",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center">
                  <ThumbsUp className="h-8 w-8 text-green-500" />
                </div>
                <span className="font-medium text-green-400">
                  ¡Me gustó!
                </span>
              </button>

              <button
                onClick={() => handleRatingSelect('negative')}
                disabled={loading}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border transition-all",
                  "hover:border-red-500 hover:bg-red-950/20",
                  "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
                  <ThumbsDown className="h-8 w-8 text-red-500" />
                </div>
                <span className="font-medium text-red-400">
                  Tuve un problema
                </span>
              </button>
            </div>
          )}

          {step === 'comment' && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">
                Lamentamos que hayas tenido un problema. Cuéntanos qué pasó para poder mejorar.
              </p>
              
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntanos qué pasó con tu pedido..."
                rows={4}
                className="resize-none bg-muted/50 border-border"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('rating')}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </div>
          )}

          {step === 'thanks' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              
              <p className="text-muted-foreground">
                {selectedRating === 'positive'
                  ? '¡Nos alegra que hayas disfrutado tu pedido! Tu opinión nos ayuda a seguir mejorando.'
                  : 'Gracias por contarnos. Revisaremos tu comentario y trabajaremos para mejorar.'}
              </p>

              <Button onClick={handleClose} className="w-full">
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
