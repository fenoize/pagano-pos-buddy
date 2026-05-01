import { Building2, Check } from 'lucide-react';
import { useBranchContext } from '@/contexts/BranchContext';
import { useCashSession } from '@/hooks/useCashSession';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function BranchIndicator() {
  const { activeBranch, branches, setActiveBranchId } = useBranchContext();
  const { currentSession } = useCashSession();
  const activeBranches = branches.filter((b) => b.is_active);

  if (!activeBranch || activeBranches.length <= 1) {
    if (!activeBranch) return null;
    return (
      <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span className="font-medium">{activeBranch.name}</span>
      </div>
    );
  }

  const handleSwitch = (id: string) => {
    if (currentSession) {
      toast.error('Cierra el turno actual antes de cambiar de local');
      return;
    }
    setActiveBranchId(id);
    toast.success('Local cambiado');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-8">
          <Building2 className="h-3.5 w-3.5" />
          <span className="font-medium">{activeBranch.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Cambiar local</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activeBranches.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onClick={() => handleSwitch(b.id)}
            disabled={!!currentSession && b.id !== activeBranch.id}
          >
            <span className="flex-1">{b.name}</span>
            {b.id === activeBranch.id && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
        {currentSession && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Cierra el turno para cambiar de local
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
