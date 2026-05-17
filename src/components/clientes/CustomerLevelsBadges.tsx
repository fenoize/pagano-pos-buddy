import { useState, useEffect, useCallback } from 'react';
import { Award, Crown, Flame, TrendingUp, Zap, Cake, Plus, Minus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from "sonner";

interface CustomerLevelsBadgesProps {
  customerId: string;
}

interface LevelDefinition {
  id: string;
  level_code: string;
  level_name: string;
  level_order: number;
  min_points: number;
  max_points: number | null;
  points_cost: number;
  icon: string | null;
  color: string | null;
  description: string | null;
  benefits: string[] | null;
}

interface CustomerLevelData {
  puntos: number;
  puntos_lifetime: number;
  level_code: string | null;
  level_name: string | null;
  min_points: number | null;
  next_level_points: number | null;
  next_level_name: string | null;
  icon: string | null;
  color: string | null;
}

interface BadgeDef {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: string | null;
  sort_order: number;
}

interface AwardedBadge extends BadgeDef {
  awarded_at: string;
}

interface PointsLogEntry {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

const iconMap: Record<string, React.ReactNode> = {
  Flame: <Flame className="w-5 h-5" />,
  Award: <Award className="w-5 h-5" />,
  Crown: <Crown className="w-5 h-5" />,
  TrendingUp: <TrendingUp className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Cake: <Cake className="w-5 h-5" />,
};

const getIcon = (iconName: string | null) => {
  if (!iconName) return <Award className="w-5 h-5" />;
  return iconMap[iconName] || <span className="text-xl">{iconName}</span>;
};

export default function CustomerLevelsBadges({ customerId }: CustomerLevelsBadgesProps) {
  const [levelData, setLevelData] = useState<CustomerLevelData | null>(null);
  const [levelDefs, setLevelDefs] = useState<LevelDefinition[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDef[]>([]);
  const [awardedBadges, setAwardedBadges] = useState<AwardedBadge[]>([]);
  const [pointsLog, setPointsLog] = useState<PointsLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [pointsMode, setPointsMode] = useState<'add' | 'subtract'>('add');
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsMotivo, setPointsMotivo] = useState('');

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [selectedLevelCode, setSelectedLevelCode] = useState('');

  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetches
      const [levelRes, defsRes, allBadgesRes, awardedRes, logRes] = await Promise.all([
        supabase.from('customer_levels').select('*').eq('customer_id', customerId).maybeSingle(),
        supabase.from('customer_level_definitions').select('*').eq('is_active', true).order('level_order'),
        supabase.from('customer_badges').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('customer_badges_awarded').select('badge_id, awarded_at, customer_badges(id, code, name, description, icon, category, sort_order)').eq('customer_id', customerId),
        supabase.from('customer_points_log').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50),
      ]);

      setLevelData(levelRes.data as CustomerLevelData | null);
      setLevelDefs((defsRes.data || []) as LevelDefinition[]);
      setAllBadges((allBadgesRes.data || []) as BadgeDef[]);
      setAwardedBadges(
        (awardedRes.data || []).map((item: any) => ({
          ...item.customer_badges,
          awarded_at: item.awarded_at,
        }))
      );
      setPointsLog((logRes.data || []) as PointsLogEntry[]);
    } catch (error) {
      console.error('Error loading levels/badges:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) loadData();
  }, [customerId, loadData]);

  // --- Points adjustment ---
  const handlePointsAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pointsAmount <= 0) return;

    const finalAmount = pointsMode === 'add' ? pointsAmount : -pointsAmount;

    try {
      // Insert log entry
      const { error: logError } = await supabase.from('customer_points_log').insert({
        customer_id: customerId,
        amount: finalAmount,
        type: 'ajuste',
        description: pointsMotivo || 'Ajuste manual de puntos',
      });
      if (logError) throw logError;

      // Update customer puntos
      const currentPuntos = levelData?.puntos || 0;
      const currentLifetime = levelData?.puntos_lifetime || 0;
      const newPuntos = Math.max(0, currentPuntos + finalAmount);
      const newLifetime = pointsMode === 'add' ? currentLifetime + pointsAmount : currentLifetime;

      const { error: updateError } = await supabase
        .from('customers')
        .update({ puntos: newPuntos, puntos_lifetime: newLifetime })
        .eq('id', customerId);
      if (updateError) throw updateError;

      toast({ title: 'Puntos actualizados', description: `${pointsMode === 'add' ? '+' : '-'}${pointsAmount} puntos` });
      setIsPointsModalOpen(false);
      setPointsAmount(0);
      setPointsMotivo('');
      loadData();
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
  };

  // --- Force level change ---
  const handleForceLevel = async () => {
    if (!selectedLevelCode) return;

    const def = levelDefs.find(d => d.level_code === selectedLevelCode);
    if (!def) return;

    try {
      // Update customer puntos to match the level's min_points (force assign)
      const { error } = await supabase
        .from('customers')
        .update({ puntos: def.min_points, puntos_lifetime: Math.max(levelData?.puntos_lifetime || 0, def.min_points) })
        .eq('id', customerId);
      if (error) throw error;

      // Log
      await supabase.from('customer_points_log').insert({
        customer_id: customerId,
        amount: 0,
        type: 'ajuste',
        description: `Nivel forzado a: ${def.level_name}`,
      });

      toast({ title: 'Nivel actualizado', description: `Cliente asignado a nivel ${def.level_name}` });
      setIsLevelModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
  };

  // --- Award badge ---
  const handleAwardBadge = async () => {
    if (!selectedBadgeId) return;
    try {
      const { error } = await supabase.from('customer_badges_awarded').insert({
        customer_id: customerId,
        badge_id: selectedBadgeId,
      });
      if (error) {
        if (error.code === '23505') {
          toast.error('Ya otorgada', { description: 'El cliente ya tiene esta insignia' });
          return;
        }
        throw error;
      }
      toast.success('Insignia otorgada');
      setIsBadgeModalOpen(false);
      setSelectedBadgeId('');
      loadData();
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
  };

  // --- Remove badge ---
  const handleRemoveBadge = async (badgeId: string) => {
    try {
      const { error } = await supabase
        .from('customer_badges_awarded')
        .delete()
        .eq('customer_id', customerId)
        .eq('badge_id', badgeId);
      if (error) throw error;
      toast.success('Insignia removida');
      loadData();
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
  };

  const formatNumber = (n: number) => new Intl.NumberFormat('es-CL').format(n);

  if (loading) {
    return <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const currentPuntos = levelData?.puntos || 0;
  const currentLifetime = levelData?.puntos_lifetime || 0;
  const currentLevel = levelData?.level_name || 'Sin nivel';
  const nextLevelPoints = levelData?.next_level_points;
  const nextLevelName = levelData?.next_level_name;
  const minPoints = levelData?.min_points || 0;
  const isMaxLevel = !nextLevelPoints || !nextLevelName;
  const progress = isMaxLevel ? 100 : Math.min(100, ((currentPuntos - minPoints) / (nextLevelPoints - minPoints)) * 100);

  const unawardedBadges = allBadges.filter(b => !awardedBadges.some(ab => ab.id === b.id));

  return (
    <div className="space-y-6">
      {/* === NIVEL SECTION === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Nivel Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getIcon(levelData?.icon || null)}
              <span className="text-xl font-bold">{currentLevel}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Puntos Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatNumber(currentPuntos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Puntos Históricos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{formatNumber(currentLifetime)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{currentLevel}</Badge>
              {!isMaxLevel && <Badge variant="outline">{nextLevelName}</Badge>}
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-center text-muted-foreground">
              {isMaxLevel
                ? '🎉 Nivel máximo alcanzado'
                : `Faltan ${formatNumber(Math.max(0, (nextLevelPoints || 0) - currentPuntos))} puntos para ${nextLevelName}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Level + Points Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { setPointsMode('add'); setIsPointsModalOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Agregar Puntos
        </Button>
        <Button onClick={() => { setPointsMode('subtract'); setIsPointsModalOpen(true); }} variant="outline" size="sm">
          <Minus className="w-4 h-4 mr-1" /> Restar Puntos
        </Button>
        <Button onClick={() => setIsLevelModalOpen(true)} variant="secondary" size="sm">
          <Crown className="w-4 h-4 mr-1" /> Forzar Nivel
        </Button>
      </div>

      <Separator />

      {/* === INSIGNIAS SECTION === */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Insignias</h3>
          <p className="text-sm text-muted-foreground">{awardedBadges.length} de {allBadges.length} obtenidas</p>
        </div>
        <Button onClick={() => setIsBadgeModalOpen(true)} size="sm" disabled={unawardedBadges.length === 0}>
          <Plus className="w-4 h-4 mr-1" /> Otorgar Insignia
        </Button>
      </div>

      {awardedBadges.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Este cliente no tiene insignias</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {awardedBadges.map((badge) => (
            <Card key={badge.id} className="group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{getIcon(badge.icon)}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{badge.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(badge.awarded_at), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                  onClick={() => handleRemoveBadge(badge.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator />

      {/* === POINTS LOG === */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Historial de Puntos</h3>
        {pointsLog.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos de puntos</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Puntos</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pointsLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.type === 'acumulacion' ? 'default' : entry.type === 'consumo' ? 'destructive' : 'secondary'}>
                          {entry.type === 'acumulacion' ? 'Acumulación' : entry.type === 'consumo' ? 'Consumo' : 'Ajuste'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={entry.amount > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {entry.amount > 0 ? '+' : ''}{formatNumber(entry.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* === MODALS === */}

      {/* Points Adjustment Modal */}
      <Dialog open={isPointsModalOpen} onOpenChange={setIsPointsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pointsMode === 'add' ? <Plus className="w-5 h-5 text-green-600" /> : <Minus className="w-5 h-5 text-red-600" />}
              {pointsMode === 'add' ? 'Agregar' : 'Restar'} Puntos
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePointsAdjustment} className="space-y-4">
            <Card className={pointsMode === 'add' ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:bg-red-950/20"}>
              <CardContent className="p-3">
                <p className="text-sm">Los ajustes quedan registrados en el historial.</p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Cantidad de Puntos *</Label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${pointsMode === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                  {pointsMode === 'add' ? '+' : '-'}
                </span>
                <Input
                  type="number"
                  min="1"
                  value={pointsAmount || ''}
                  onChange={(e) => setPointsAmount(Math.abs(parseInt(e.target.value) || 0))}
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea
                value={pointsMotivo}
                onChange={(e) => setPointsMotivo(e.target.value)}
                placeholder="Motivo del ajuste..."
                rows={2}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsPointsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pointsAmount <= 0}>Confirmar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Force Level Modal */}
      <Dialog open={isLevelModalOpen} onOpenChange={setIsLevelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" /> Forzar Nivel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-3">
                <p className="text-sm">Esto ajustará los puntos del cliente para colocarlo en el nivel seleccionado.</p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Nuevo Nivel</Label>
              <Select value={selectedLevelCode} onValueChange={setSelectedLevelCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nivel..." />
                </SelectTrigger>
                <SelectContent position="popper">
                  {levelDefs.map((def) => (
                    <SelectItem key={def.level_code} value={def.level_code}>
                      {def.level_name} ({formatNumber(def.min_points)} pts mín.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsLevelModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleForceLevel} disabled={!selectedLevelCode}>Asignar Nivel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Award Badge Modal */}
      <Dialog open={isBadgeModalOpen} onOpenChange={setIsBadgeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" /> Otorgar Insignia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Insignia</Label>
              <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar insignia..." />
                </SelectTrigger>
                <SelectContent position="popper">
                  {unawardedBadges.map((badge) => (
                    <SelectItem key={badge.id} value={badge.id}>
                      {badge.name} — {badge.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsBadgeModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAwardBadge} disabled={!selectedBadgeId}>Otorgar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
