import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface AllianceJoinOfferModalProps {
  open: boolean;
  allianceName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AllianceJoinOfferModal({ open, allianceName, loading, onConfirm, onCancel }: AllianceJoinOfferModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onCancel(); }}>
      <DialogContent className="customer-app max-w-sm border-primary/30">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold tracking-tight">Una alianza te espera</DialogTitle>
          <DialogDescription className="text-center text-base">
            Ya formas parte del Clan Pagano. ¿Quieres sumar los beneficios de <span className="font-semibold text-foreground">{allianceName}</span> a tu cuenta?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" size="lg" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Sí, quiero unirme
          </Button>
          <Button variant="ghost" className="w-full" onClick={onCancel} disabled={loading}>
            No, gracias
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
