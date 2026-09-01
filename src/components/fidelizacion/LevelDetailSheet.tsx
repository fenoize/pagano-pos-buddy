import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { LevelIcon } from './LevelIcon';
import type { LevelWithCount } from '@/hooks/useCustomerLevels';
import { formatCLP } from '@/lib/utils';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CustomerInLevel {
  customer_id: string;
  puntos: number;
  name: string;
}

async function fetchLevelCustomers(levelCode: string): Promise<CustomerInLevel[]> {
  const { data: rows, error } = await supabase
    .from('customer_levels')
    .select('customer_id, puntos')
    .eq('level_code', levelCode)
    .order('puntos', { ascending: false });

  if (error) throw error;
  const list = (rows || []) as { customer_id: string; puntos: number }[];
  if (list.length === 0) return [];

  const ids = list.map((r) => r.customer_id);
  const { data: customers, error: cErr } = await supabase
    .from('customers')
    .select('id, nombres, apellidos, name')
    .in('id', ids);

  if (cErr) throw cErr;
  const names = new Map(
    (customers || []).map((c) => [
      c.id,
      [c.nombres, c.apellidos].filter(Boolean).join(' ').trim() || c.name || 'Cliente',
    ])
  );

  return list.map((r) => ({
    customer_id: r.customer_id,
    puntos: r.puntos,
    name: names.get(r.customer_id) || 'Cliente',
  }));
}

interface Props {
  level: LevelWithCount | null;
  onClose: () => void;
}

export function LevelDetailSheet({ level, onClose }: Props) {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['level-customers', level?.level_code],
    queryFn: () => fetchLevelCustomers(level!.level_code),
    enabled: !!level,
  });

  const benefits = level && Array.isArray(level.benefits) ? (level.benefits as string[]) : [];
  const maxPoints = level?.max_points ?? null;

  const chartData = (() => {
    if (!level || !customers || customers.length === 0) return [];
    const min = level.min_points;
    const max = maxPoints ?? Math.max(...customers.map((c) => c.puntos), min + 1);
    const binCount = 5;
    const size = Math.max(1, Math.ceil((max - min + 1) / binCount));
    const bins = Array.from({ length: binCount }, (_, i) => ({
      rango: `${min + i * size}–${min + (i + 1) * size - 1}`,
      clientes: 0,
    }));
    for (const c of customers) {
      const idx = Math.min(binCount - 1, Math.floor((c.puntos - min) / size));
      if (idx >= 0) bins[idx].clientes += 1;
    }
    return bins;
  })();

  return (
    <Sheet open={!!level} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {level && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <LevelIcon icon={level.icon} color={level.color} className="h-6 w-6" />
                {level.level_name}
              </SheetTitle>
              <SheetDescription>
                Nivel {level.level_order} · <code className="text-xs">{level.level_code}</code> ·{' '}
                {level.is_active ? 'Activo' : 'Inactivo'}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Rango de puntos</p>
                  <p className="font-semibold">
                    {level.min_points} – {maxPoints ?? '∞'}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Equivale a</p>
                  <p className="font-semibold">
                    {formatCLP(level.min_points * 100)} – {maxPoints ? formatCLP(maxPoints * 100) : '∞'}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Clientes</p>
                  <p className="font-semibold">{level.customer_count}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Costo en puntos</p>
                  <p className="font-semibold">{level.points_cost || 0}</p>
                </div>
              </div>

              {level.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm">{level.description}</p>
                </div>
              )}

              {benefits.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Beneficios</p>
                  <div className="flex flex-wrap gap-1.5">
                    {benefits.map((b) => (
                      <Badge key={b} variant="secondary">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-2">Distribución de puntos en el nivel</p>
                {isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : chartData.length > 0 ? (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="rango" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} width={24} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="clientes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin clientes en este nivel.</p>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Top 10 clientes del nivel</p>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : customers && customers.length > 0 ? (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {customers.slice(0, 10).map((c) => (
                      <li key={c.customer_id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="truncate">{c.name}</span>
                        <span className="text-muted-foreground tabular-nums">{c.puntos} pts</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Aún no hay clientes en este nivel.</p>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
