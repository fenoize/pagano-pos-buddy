import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatRunas } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface LevelProgressProps {
  currentLevel: string;
  currentRunas: number;
  minPoints: number;
  nextLevelPoints: number | null;
  nextLevelName: string | null;
}

export function LevelProgress({
  currentLevel,
  currentRunas,
  minPoints,
  nextLevelPoints,
  nextLevelName,
}: LevelProgressProps) {
  // Si no hay próximo nivel, está en el nivel máximo
  const isMaxLevel = !nextLevelPoints || !nextLevelName;

  const progress = isMaxLevel
    ? 100
    : Math.min(100, ((currentRunas - minPoints) / (nextLevelPoints - minPoints)) * 100);

  const remaining = isMaxLevel ? 0 : Math.max(0, nextLevelPoints - currentRunas);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progreso de Nivel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-sm">
              {currentLevel}
            </Badge>
            {!isMaxLevel && (
              <Badge variant="outline" className="text-sm">
                {nextLevelName}
              </Badge>
            )}
          </div>

          <Progress value={progress} className="h-3" />

          <div className="text-center">
            {isMaxLevel ? (
              <p className="text-sm text-muted-foreground">
                🎉 ¡Has alcanzado el <strong>nivel máximo</strong>!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Te faltan <strong>{formatRunas(remaining)} runas</strong> para {nextLevelName}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
