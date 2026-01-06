import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Clock, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDeliveryPayments } from '@/hooks/useDeliveryPayments';

export default function DeliveryPayments() {
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
  const { payments, loading, fetchMyPayments, getPaymentStats, isDeliveryPerson } = useDeliveryPayments();

  useEffect(() => {
    fetchMyPayments(activeTab);
  }, [activeTab]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const stats = getPaymentStats();

  // Calculate today's earnings
  const today = new Date().toISOString().split('T')[0];
  const todayPayments = payments.filter(p => 
    p.created_at.startsWith(today)
  );
  const todayEarnings = todayPayments.reduce((sum, p) => sum + p.base_amount, 0);

  const handleRefresh = () => {
    fetchMyPayments(activeTab);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Mis Pagos</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards - Uber Style */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Ganancias Hoy</p>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(todayEarnings)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {todayPayments.length} {todayPayments.length === 1 ? 'delivery' : 'deliverys'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <p className="text-sm font-medium text-muted-foreground">Pendiente de Pago</p>
            </div>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(stats.pendingAmount)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.pendingCount} {stats.pendingCount === 1 ? 'delivery' : 'deliverys'} por cobrar
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="text-sm font-medium text-muted-foreground">Ya Pagado</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.paidCount} {stats.paidCount === 1 ? 'pago' : 'pagos'} recibidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pendientes
                {stats.pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{stats.pendingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Pagados
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {activeTab === 'pending' 
                  ? 'No tienes pagos pendientes' 
                  : 'No tienes pagos registrados'}
              </p>
              <p className="text-sm mt-1">
                {activeTab === 'pending'
                  ? 'Los pagos aparecerán aquí cuando completes deliverys'
                  : 'Tu historial de pagos aparecerá aquí'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  {activeTab === 'paid' && (
                    <>
                      <TableHead className="text-right">Turno</TableHead>
                      <TableHead className="text-right">Impuesto</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.created_at), 'dd MMM HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="font-mono">
                      #{payment.order?.order_number}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.base_amount)}
                    </TableCell>
                    {activeTab === 'paid' && (
                      <>
                        <TableCell className="text-right">
                          {payment.shift_bonus > 0 ? formatCurrency(payment.shift_bonus) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {payment.tax_amount > 0 ? `-${formatCurrency(payment.tax_amount)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(payment.net_amount)}
                        </TableCell>
                        <TableCell>
                          {payment.payment_date 
                            ? format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: es })
                            : '-'}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">¿Cómo funcionan los pagos?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Cada vez que completas un delivery, se registra automáticamente un pago pendiente. 
                El administrador procesará los pagos y verás el monto neto después de impuestos 
                (si aplica) en tu historial de pagados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
