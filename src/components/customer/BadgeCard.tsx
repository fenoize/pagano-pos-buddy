import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Lock, Trophy, Medal, Award, Star, Zap, Crown, Target, Gift } from 'lucide-react';
import { formatDateShort } from '@/lib/dateUtils';

interface BadgeCardProps {
  badge: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon: string;
    category: string | null;
  };
  awarded: boolean;
  awardedDate?: string;
  onClick: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  Trophy,
  Medal,
  Award,
  Star,
  Zap,
  Crown,
  Target,
  Gift,
};

const getBadgeColor = (category: string | null): string => {
  switch (category?.toLowerCase()) {
    case 'nivel':
      return 'text-amber-500';
    case 'compras':
      return 'text-blue-500';
    case 'especiales':
      return 'text-purple-500';
    default:
      return 'text-primary';
  }
};

export function BadgeCard({ badge, awarded, awardedDate, onClick }: BadgeCardProps) {
  const IconComponent = iconMap[badge.icon] || Trophy;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:scale-105 hover:shadow-lg',
        awarded ? 'border-primary/50' : 'opacity-60 grayscale'
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center p-6 space-y-3">
        <div className="relative">
          <IconComponent
            size={64}
            className={cn(awarded ? getBadgeColor(badge.category) : 'text-muted-foreground')}
          />
          {!awarded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="text-center space-y-1">
          <h4 className="font-semibold text-sm">{badge.name}</h4>
          {awarded && awardedDate && (
            <p className="text-xs text-muted-foreground">
              Obtenida el {formatDateShort(awardedDate)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
