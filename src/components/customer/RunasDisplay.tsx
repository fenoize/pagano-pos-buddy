import { Coins } from 'lucide-react';
import { formatRunas, formatCLP } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface RunasDisplayProps {
  runas: number;
  showEquivalent?: boolean;
  runaValue: number;
  className?: string;
}

export function RunasDisplay({ runas, showEquivalent = false, runaValue, className }: RunasDisplayProps) {
  return (
    <Card className={className}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-full bg-primary/10 p-3">
          <Coins className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-3xl font-bold">{formatRunas(runas)}</p>
          <p className="text-sm text-muted-foreground">runas disponibles</p>
          {showEquivalent && (
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {formatCLP(Math.floor((runas * runaValue) / 3))} en descuentos
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
