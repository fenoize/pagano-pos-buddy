import { useState, useEffect } from 'react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { RunasDisplay } from '@/components/customer/RunasDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCLP, formatRunas } from '@/lib/utils';
import { formatDateTime } from '@/lib/dateUtils';
import { ChevronLeft, ChevronRight, Coins, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ITEMS_PER_PAGE = 50;

export default function MyRunes() {
  const { customer } = useCustomerAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [runaValue, setRunaValue] = useState(10000);

  useEffect(() => {
    fetchRunaValue();
    fetchTransactions();
  }, [customer?.id, page]);

  const fetchRunaValue = async () => {
    const { data } = await supabase.from('config').select('value').eq('key', 'runa_value').single();
    if (data?.value) setRunaValue(Number(data.value));
  };

  const fetchTransactions = async () => {
    if (!customer?.id) return;

    setLoading(true);
    try {
      const { data, error, count } = await supabase
        .from('runas_transactions')
        .select('*', { count: 'exact' })
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setTransactions(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error: any) {
      toast({ title: 'Error', description: 'No se pudieron cargar tus runas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout title="Mis Runas">
      <div className="space-y-6">
        <RunasDisplay runas={customer?.cantidad_runas || 0} showEquivalent runaValue={runaValue} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Valor Equivalente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCLP((customer?.cantidad_runas || 0) * runaValue)}</p>
              <p className="text-xs text-muted-foreground">en compras acumuladas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                ¿Cómo funcionan?
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-4 w-4" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Por cada {formatCLP(runaValue)} en compras, ganas 1 runa. Puedes canjear tus runas por descuentos en futuras compras.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">Por cada <strong>{formatCLP(runaValue)}</strong> ganas 1 runa</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64" />
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aún no tienes movimientos de runas</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Runas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm">{formatDateTime(t.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === 'acumulacion' ? 'default' : 'secondary'}>{t.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {t.runas > 0 ? '+' : ''}{formatRunas(t.runas)}
                        </TableCell>
                        <TableCell className="text-right">{formatCLP(t.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4 mr-2" />Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                    <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      Siguiente<ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
