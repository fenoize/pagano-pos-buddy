import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { FinancialClosure } from '@/types/finance';
import { useAuthContext } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

export default function FinanceCierres() {
  const { user } = useAuthContext();
  const [closures, setClosures] = useState<FinancialClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadClosures();
  }, []);

  const loadClosures = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_closures')
        .select('*')
        .order('date_start', { ascending: false })
        .limit(50);

      if (error) throw error;
      setClosures((data || []) as unknown as FinancialClosure[]);
    } catch (error) {
      console.error('Error loading closures:', error);
      toast.error('Error cargando cierres financieros');
    } finally {
      setLoading(false);
    }
  };

  const generateClosure = async (type: 'weekly' | 'monthly') => {
    if (!user?.id) return;

    setGenerating(true);
    try {
      const today = new Date();
      let start: Date, end: Date;

      if (type === 'weekly') {
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
      } else {
        start = startOfMonth(today);
        end = endOfMonth(today);
      }

      const { data, error } = await supabase.rpc('finance_generate_closure', {
        _period_type: type,
        _start: format(start, 'yyyy-MM-dd'),
        _end: format(end, 'yyyy-MM-dd'),
        _notes: notes || null,
        _created_by: user.id,
        _tz: 'America/Santiago'
      });

      if (error) throw error;

      toast.success(`Cierre ${type === 'weekly' ? 'semanal' : 'mensual'} generado exitosamente`);
      setNotes('');
      setModalOpen(false);
      loadClosures();
    } catch (error: any) {
      console.error('Error generating closure:', error);
      toast.error(error.message || 'Error generando cierre');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getPeriodLabel = (type: string) => {
    switch (type) {
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensual';
      case 'custom': return 'Personalizado';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Cierres Financieros</h1>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cierre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generar Cierre Financiero</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre este cierre..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => generateClosure('weekly')}
                  disabled={generating}
                  className="flex-1"
                >
                  Generar Semanal
                </Button>
                <Button
                  onClick={() => generateClosure('monthly')}
                  disabled={generating}
                  className="flex-1"
                  variant="secondary"
                >
                  Generar Mensual
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de Cierres */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando cierres...</div>
          ) : closures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cierres generados aún
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Órdenes</TableHead>
                  <TableHead className="text-right">Ventas Netas</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closures.map((closure) => (
                  <TableRow key={closure.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {getPeriodLabel(closure.period_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(closure.date_start), 'dd MMM', { locale: es })} -{' '}
                      {format(new Date(closure.date_end), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {closure.totals.orders}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(closure.totals.sales.net)}
                    </TableCell>
                    <TableCell className="text-right">
                      {closure.totals.costs.gross_margin_pct}%
                    </TableCell>
                    <TableCell>
                      {format(new Date(closure.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
