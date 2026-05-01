import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useBranchContext } from '@/contexts/BranchContext';

interface BranchFilterProps {
  value: string; // 'all' | branchId
  onChange: (v: string) => void;
  className?: string;
  showLabel?: boolean;
  /** If false, hides the entire filter when there's only one branch. Default true. */
  alwaysShow?: boolean;
}

/**
 * Reusable filter for selecting a branch (local) across reports/finance/sales.
 * Automatically hides itself if there's only one branch (unless alwaysShow=true).
 */
export function BranchFilter({
  value,
  onChange,
  className,
  showLabel = true,
  alwaysShow = false,
}: BranchFilterProps) {
  const { branches } = useBranchContext();
  const activeBranches = branches.filter((b) => b.is_active);

  if (!alwaysShow && activeBranches.length <= 1) return null;

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {showLabel && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          Local:
        </span>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Local" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="all">Todos los locales</SelectItem>
          {activeBranches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
