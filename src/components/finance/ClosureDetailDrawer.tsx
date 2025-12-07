import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FinancialClosure, ClosureDetailExpense } from '@/types/finance';
import { useFinanceClosures } from '@/hooks/useFinanceClosures';
import { exportClosureToCSV, exportClosureToPDF, formatCurrency } from '@/lib/financeExport';

interface ClosureDetailDrawerProps {
  closure: FinancialClosure | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClosureDetailDrawer({
  closure,
  open,
  onOpenChange,
}: ClosureDetailDrawerProps) {
  const { fetchTopExpenses, fetchTopFixedExpenses, fetchPreviousClosure } = useFinanceClosures();
  const [topExpenses, setTopExpenses] = useState<ClosureDetailExpense[]>([]);
  const [topFixedExpenses, setTopFixedExpenses] = useState<any[]>([]);
  const [previousClosure, setPreviousClosure] = useState<FinancialClosure | null>(null);

  useEffect(() => {
    if (closure && open) {
      // Cargar top gastos variables
      fetchTopExpenses(closure.date_start, closure.date_end).then(setTopExpenses);
      
      // Cargar top gastos fijos prorrateados
      fetchTopFixedExpenses(closure.date_start, closure.date_end).then(setTopFixedExpenses);
      
      // Cargar cierre anterior para comparativa
      fetchPreviousClosure(closure.id, closure.date_start).then(setPreviousClosure);
    }
  }, [closure, open]);

  if (!closure) return null;

  const calculatePercent = (amount: number, total: number): string => {
    if (total === 0) return '0.0';
    return ((amount / total) * 100).toFixed(1);
  };

  // Calcular variaciones con cierre anterior
  const salesVariation = previousClosure
    ? ((closure.totals.sales.net - previousClosure.totals.sales.net) / previousClosure.totals.sales.net) * 100
    : null;

  const marginVariation = previousClosure
    ? closure.margin_percent - previousClosure.margin_percent
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalle del Cierre Financiero</SheetTitle>
          <SheetDescription>
            {format(new Date(closure.date_start), 'dd MMM', { locale: es })} - 
            {format(new Date(closure.date_end), 'dd MMM yyyy', { locale: es })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* 1. Resumen General */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen General</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Órdenes</div>
                <div className="text-2xl font-bold">{closure.totals.orders}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Ventas Brutas</div>
                <div className="text-2xl font-bold">{formatCurrency(closure.totals.sales.gross)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Descuentos</div>
                <div className="text-lg text-destructive">-{formatCurrency(closure.totals.sales.discounts)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Ventas Netas</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(closure.totals.sales.net)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Ticket Promedio</div>
                <div className="text-lg">{formatCurrency(closure.totals.sales.aov)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fee Delivery</div>
                <div className="text-lg">{formatCurrency(closure.totals.sales.delivery_fee)}</div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Métodos de Pago */}
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Efectivo</TableCell>
                    <TableCell className="text-right">{formatCurrency(closure.total_cash)}</TableCell>
                    <TableCell className="text-right">{calculatePercent(closure.total_cash, closure.totals.sales.net)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">POS/Transbank</TableCell>
                    <TableCell className="text-right">{formatCurrency(closure.total_pos)}</TableCell>
                    <TableCell className="text-right">{calculatePercent(closure.total_pos, closure.totals.sales.net)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Transferencia/MP</TableCell>
                    <TableCell className="text-right">{formatCurrency(closure.total_transfer)}</TableCell>
                    <TableCell className="text-right">{calculatePercent(closure.total_transfer, closure.totals.sales.net)}%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">App/Delivery</TableCell>
                    <TableCell className="text-right">{formatCurrency(closure.total_app)}</TableCell>
                    <TableCell className="text-right">{calculatePercent(closure.total_app, closure.totals.sales.net)}%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 3. Egresos - Separado en Fijos y Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Egresos del Período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 3A. Resumen Total */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Gastos Fijos</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(closure.fixed_expenses)}
                  </div>
                  {/* Desglose de fijos */}
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>▸ Recurrentes: {formatCurrency(closure.recurring_fixed_expenses || 0)}</div>
                    <div>▸ No recurrentes: {formatCurrency(closure.non_recurring_fixed_expenses || 0)}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Gastos Variables</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {formatCurrency(closure.variable_expenses)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Egresos</div>
                  <div className="text-xl font-bold text-destructive">
                    {formatCurrency(closure.total_expenses)}
                  </div>
                </div>
              </div>

              {/* 3B. Gastos Fijos (top 5 del catálogo vigente en el período) */}
              <div>
                <Separator className="my-4" />
                <div className="text-sm font-medium mb-2">Top 5 Gastos Fijos del Período (Prorrateados)</div>
                {topFixedExpenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead className="text-right">Monto Prorrateado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topFixedExpenses.slice(0, 5).map((expense: any) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{expense.department}</TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.prorated_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay gastos fijos configurados</p>
                )}
              </div>

              {/* 3C. Gastos Variables (top 10 desde finance_expenses) */}
              <div>
                <Separator className="my-4" />
                <div className="text-sm font-medium mb-2">Top 10 Gastos Variables del Período</div>
                {topExpenses.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.category}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {expense.supplier || '-'}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay gastos variables registrados</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4. Margen y Resultado */}
          <Card>
            <CardHeader>
              <CardTitle>Margen y Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ventas Netas</span>
                <span className="font-semibold">{formatCurrency(closure.totals.sales.net)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">- Egresos</span>
                <span className="text-destructive">-{formatCurrency(closure.total_expenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">- COGS</span>
                <span className="text-destructive">-{formatCurrency(closure.totals.costs.cogs)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Margen Bruto</span>
                <span className={`font-bold ${closure.margin_amount >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(closure.margin_amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Margen %</span>
                <Badge variant={closure.margin_percent >= 20 ? 'default' : 'destructive'}>
                  {closure.margin_percent}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 5. Comparativa con Cierre Anterior */}
          {previousClosure && salesVariation !== null && marginVariation !== null && (
            <Card>
              <CardHeader>
                <CardTitle>Comparativa con Cierre Anterior</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Variación Ventas</div>
                  <div className={`text-lg font-semibold flex items-center gap-1 ${salesVariation >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {salesVariation >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {salesVariation >= 0 ? '+' : ''}{salesVariation.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Variación Margen</div>
                  <div className={`text-lg font-semibold flex items-center gap-1 ${marginVariation >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {marginVariation >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {marginVariation >= 0 ? '+' : ''}{marginVariation.toFixed(1)} p.p.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 6. Notas */}
          {closure.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{closure.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* 7. Botones de Exportar */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => exportClosureToPDF(closure)} 
              className="w-full"
              size="lg"
              variant="default"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button 
              onClick={() => exportClosureToCSV(closure)} 
              className="w-full"
              size="lg"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
