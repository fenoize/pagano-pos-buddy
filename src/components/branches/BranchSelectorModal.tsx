import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBranchContext } from '@/contexts/BranchContext';
import { Building2, MapPin } from 'lucide-react';

export function BranchSelectorModal() {
  const { needsBranchSelection, branches, setActiveBranchId } = useBranchContext();
  const activeBranches = branches.filter((b) => b.is_active);

  return (
    <Dialog open={needsBranchSelection}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecciona tu local
          </DialogTitle>
          <DialogDescription>
            Elige el local en el que vas a operar este turno.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {activeBranches.map((b) => (
            <Button
              key={b.id}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => setActiveBranchId(b.id)}
            >
              <div className="text-left">
                <div className="font-semibold">{b.name}</div>
                {b.address && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {b.address}
                  </div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
