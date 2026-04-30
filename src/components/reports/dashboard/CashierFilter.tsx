import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CashierOption } from '@/hooks/useReportsDashboard';

export function CashierFilter({
  value,
  onChange,
  cashiers,
}: {
  value: string;
  onChange: (v: string) => void;
  cashiers: CashierOption[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[200px] text-xs">
        <SelectValue placeholder="Cajero" />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value="all">Todos los cajeros</SelectItem>
        {cashiers.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
