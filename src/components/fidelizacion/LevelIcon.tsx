import { Award, Crown, Flame, Medal, Shield, Skull, Star, Sword, Swords, Target, Trophy, Zap, type LucideIcon } from 'lucide-react';

export const LEVEL_ICONS: Record<string, LucideIcon> = {
  Flame,
  Shield,
  Sword,
  Swords,
  Star,
  Zap,
  Crown,
  Trophy,
  Award,
  Skull,
  Medal,
  Target,
};

export const LEVEL_ICON_NAMES = Object.keys(LEVEL_ICONS);

export function LevelIcon({ icon, color, className = 'h-4 w-4' }: { icon: string | null | undefined; color?: string | null; className?: string }) {
  const Icon = (icon && LEVEL_ICONS[icon]) || Award;
  return <Icon className={`${className} ${color || 'text-muted-foreground'}`} />;
}
