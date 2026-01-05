import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PeriodPreset } from '@/hooks/useProductSalesAnalytics';

interface ReportDatePickerProps {
  periodPreset: PeriodPreset;
  onPresetChange: (preset: PeriodPreset) => void;
  customDateRange: { start: Date | null; end: Date | null };
  onCustomDateChange: (range: { start: Date | null; end: Date | null }) => void;
}

const presets: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana pasada' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes pasado' },
  { value: 'custom', label: 'Personalizado' }
];

export function ReportDatePicker({
  periodPreset,
  onPresetChange,
  customDateRange,
  onCustomDateChange
}: ReportDatePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {presets.map(preset => (
          <Button
            key={preset.value}
            variant={periodPreset === preset.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPresetChange(preset.value)}
            className="h-8 text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom date range pickers */}
      {periodPreset === 'custom' && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start text-left font-normal",
                  !customDateRange.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {customDateRange.start 
                  ? format(customDateRange.start, 'dd/MM/yyyy', { locale: es }) 
                  : 'Desde'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={customDateRange.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                onChange={(e) => onCustomDateChange({
                  ...customDateRange,
                  start: e.target.value ? new Date(e.target.value) : null
                })}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">-</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start text-left font-normal",
                  !customDateRange.end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {customDateRange.end 
                  ? format(customDateRange.end, 'dd/MM/yyyy', { locale: es }) 
                  : 'Hasta'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md text-sm"
                value={customDateRange.end ? format(customDateRange.end, 'yyyy-MM-dd') : ''}
                onChange={(e) => onCustomDateChange({
                  ...customDateRange,
                  end: e.target.value ? new Date(e.target.value) : null
                })}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
