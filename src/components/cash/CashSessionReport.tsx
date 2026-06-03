import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, EyeOff, Calendar, Search, Filter, LockOpen, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CashSession, User, AppRole } from '@/types';
import { CashSessionDetailButton } from './CashSessionDetailButton';
import { formatDeliveryAddress } from '@/lib/deliveryHelpers';
import { ForceCloseSessionModal } from './ForceCloseSessionModal';
import { useAuthContext } from '@/contexts/AuthContext';
import { getNonRealSaleMethods, getOrderRealRevenue } from '@/lib/paymentMethodUtils';
import { useCashSession } from '@/hooks/useCashSession';
import { toast } from "sonner";

// Map old database role names to new app role names
const mapDatabaseRoleToApp = (dbRole: string): AppRole => {
  const mapping: Record<string, AppRole> = {
    'Caja': 'Cajero',
    'Cocina': 'Cocinero',
    'Reparto': 'Reparto'
  };
  return mapping[dbRole] as AppRole || dbRole as AppRole;
};

interface CashSessionWithUser extends CashSession {
  user?: User;
  summary?: {
    totalSales: number;
    grossSales: number;
    totalDiscounts: number;
    totalCash: number;
    totalMP: number;
    totalPOS: number;
    totalAplicacion: number;
    totalRunas: number;
    ingresos: number;
    egresos: number;
    expectedCash: number;
    difference: number;
  };
}

export function CashSessionReport() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'Administrador';
  const cashSessionApi = useCashSession();
  const getSessionSummaryRef = React.useRef(cashSessionApi.getSessionSummary);
  getSessionSummaryRef.current = cashSessionApi.getSessionSummary;

  const [sessions, setSessions] = useState<CashSessionWithUser[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<CashSessionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [forceCloseSession, setForceCloseSession] = useState<CashSessionWithUser | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userId: 'all',
    status: 'all', // 'all', 'open', 'closed'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('cash_sessions')
        .select('*')
        .order('opened_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, role, active, created_at, updated_at, can_do_delivery')
        .eq('active', true)
        .in('role', ['Administrador', 'Cajero'])
        .order('username');

      if (usersError) throw usersError;

      const userMap = new Map(usersData?.map(user => [user.id, user]) || []);
      const nonRealMethods = await getNonRealSaleMethods();

      const sessionsWithSummary = await Promise.all(
        (sessionsData || []).map(async (session) => {
          if (!session.closed_at) {
            return {
              ...session,
              user: userMap.get(session.user_id)
            };
          }

          try {
            const summaryData = await getSessionSummaryRef.current(session.id);
            const detailOrders = summaryData?.orders || [];
            const totalSales = summaryData?.summary?.totalSalesReal
              ?? detailOrders.reduce((sum: number, order: any) => sum + getOrderRealRevenue(order, nonRealMethods), 0);
            const grossSales = detailOrders.reduce((sum: number, order: any) => sum + (order.subtotal || 0), 0);
            const totalDiscounts = detailOrders.reduce((sum: number, order: any) => sum + (order.discount || 0), 0);

            return {
              ...session,
              user: userMap.get(session.user_id),
              summary: {
                totalSales,
                grossSales,
                totalDiscounts,
                totalCash: summaryData?.summary?.totalCash || 0,
                totalMP: summaryData?.summary?.totalMP || 0,
                totalPOS: summaryData?.summary?.totalPOS || 0,
                totalAplicacion: summaryData?.summary?.totalAplicacion || 0,
                totalRunas: summaryData?.summary?.totalRunasAmount || 0,
                ingresos: summaryData?.summary?.ingresos || 0,
                egresos: summaryData?.summary?.egresos || 0,
                expectedCash: summaryData?.summary?.expectedCash || 0,
                difference: summaryData?.summary?.difference || 0,
              }
            };
          } catch (error) {
            console.error('Error calculating session summary:', error);
            return {
              ...session,
              user: userMap.get(session.user_id)
            };
          }
        })
      );

      setSessions(sessionsWithSummary as CashSessionWithUser[]);
      setUsers(usersData?.map(user => ({
        ...user,
        role: mapDatabaseRoleToApp(user.role)
      })) || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error("Error", { description: "No se pudieron cargar los turnos." });
    } finally {
      setLoading(false);
    }
  }, [getSessionSummary, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters, searchTerm]);

  const applyFilters = () => {
    let filtered = [...sessions];

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(session => 
        new Date(session.opened_at) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(session => 
        new Date(session.opened_at) <= new Date(filters.dateTo + 'T23:59:59')
      );
    }

    // Filter by user
    if (filters.userId !== 'all') {
      filtered = filtered.filter(session => session.user_id === filters.userId);
    }

    // Filter by status
    if (filters.status === 'open') {
      filtered = filtered.filter(session => !session.closed_at);
    } else if (filters.status === 'closed') {
      filtered = filtered.filter(session => session.closed_at);
    }

    // Filter by search term (username)
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  };

  const exportToCSV = async () => {
    const headers = [
      'Fecha Apertura',
      'Usuario',
      'Hora Apertura',
      'Hora Cierre',
      'Efectivo Inicial',
      'Efectivo Final',
      'Ventas Totales',
      'Efectivo Ventas',
      'MP/Transfer',
      'POS',
      'Ingresos',
      'Egresos',
      'Diferencia',
      'Deliveries Realizados',
      'Total Delivery',
      'Detalle Repartidores',
      'Direcciones Delivery'
    ];

    // Get delivery data for each session with detailed info
    const csvDataPromises = filteredSessions.map(async (session) => {
      let deliveryCount = 0;
      let totalDeliveryFee = 0;
      let repartidoresDetail = '';
      let addressesDetail = '';

      if (session.closed_at) {
        try {
          const { data: deliveryOrders } = await supabase
            .from('orders')
            .select('*')
            .eq('fulfillment', 'delivery')
            .eq('created_by_user_id', session.user_id)
            .gte('created_at', session.opened_at)
            .lte('created_at', session.closed_at);

          deliveryCount = deliveryOrders?.length || 0;
          totalDeliveryFee = deliveryOrders?.reduce((sum, order) => sum + (order.delivery_fee || 0), 0) || 0;

          // Group by delivery person
          const deliveryByPerson = new Map<string, { name: string; fee: number; count: number }>();
          const addresses: string[] = [];

          deliveryOrders?.forEach(order => {
            const personId = order.delivery_person_id || 'sin_asignar';
            const personName = order.delivery_person_name || 'Sin asignar';
            const fee = order.delivery_fee || 0;

            if (!deliveryByPerson.has(personId)) {
              deliveryByPerson.set(personId, { name: personName, fee: 0, count: 0 });
            }
            const current = deliveryByPerson.get(personId)!;
            current.fee += fee;
            current.count += 1;

            // Format address
            const address = formatDeliveryAddress(
              order.delivery_address || '',
              order.delivery_number || '',
              order.delivery_comuna || '',
              order.delivery_reference || ''
            );
            if (address) {
              addresses.push(`#${order.order_number}: ${address}`);
            }
          });

          // Format repartidores detail
          const repartidoresArray = Array.from(deliveryByPerson.values());
          repartidoresDetail = repartidoresArray
            .map(p => `${p.name}: ${p.count} pedidos - $${p.fee}`)
            .join(' | ');

          // Format addresses detail
          addressesDetail = addresses.join(' | ');
        } catch (error) {
          console.error('Error fetching delivery data:', error);
        }
      }

      return [
        new Date(session.opened_at).toLocaleDateString('es-CL'),
        session.user?.username || '-',
        new Date(session.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        session.closed_at 
          ? new Date(session.closed_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
          : 'Abierto',
        session.opening_cash,
        session.closing_cash || 0,
        session.summary?.totalSales || 0,
        session.summary?.totalCash || 0,
        session.summary?.totalMP || 0,
        session.summary?.totalPOS || 0,
        session.summary?.ingresos || 0,
        session.summary?.egresos || 0,
        session.summary?.difference || 0,
        deliveryCount,
        totalDeliveryFee,
        repartidoresDetail,
        addressesDetail
      ];
    });

    const csvData = await Promise.all(csvDataPromises);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cierres-caja-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Exportación exitosa", { description: "El reporte ha sido descargado." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">
          Reporte de Cierres de Caja
        </h1>
        <p className="text-muted-foreground">
          Historial y análisis de turnos de caja
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="dateFrom">Desde</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Hasta</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="userId">Usuario</Label>
              <Select value={filters.userId} onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.username} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="closed">Cerrados</SelectItem>
                  <SelectItem value="open">Abiertos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="search">Buscar Usuario</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin-only: Aggregated sales summary */}
      {isAdmin && <AdminSalesSummary sessions={filteredSessions} />}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Turnos de Caja</CardTitle>
              <CardDescription>
                {filteredSessions.length} de {sessions.length} turnos
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} disabled={loading || filteredSessions.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Efectivo Inicial</TableHead>
                  <TableHead>Efectivo Final</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Cargando turnos...
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No se encontraron turnos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.user?.username}</div>
                          <div className="text-sm text-muted-foreground">{session.user?.role}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{formatDate(session.opened_at)}</div>
                          {session.closed_at && (
                            <div className="text-sm text-muted-foreground">
                              Cerrado: {new Date(session.closed_at).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.closed_at ? "secondary" : "default"}>
                          {session.closed_at ? "Cerrado" : "Abierto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(session.opening_cash)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.closing_cash !== null ? formatCurrency(session.closing_cash) : '-'}
                      </TableCell>
                      <TableCell>
                        {session.summary ? (
                          <div>
                            <div className="font-medium">{formatCurrency(session.summary.totalSales)}</div>
                            <div className="text-sm text-muted-foreground">
                              Efectivo: {formatCurrency(session.summary.totalCash)}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {session.summary?.difference !== undefined ? (
                          <span className={`font-medium ${
                            session.summary.difference === 0 
                              ? 'text-green-600' 
                              : session.summary.difference > 0 
                                ? 'text-blue-600' 
                                : 'text-red-600'
                          }`}>
                            {session.summary.difference > 0 && '+'}
                            {formatCurrency(session.summary.difference)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <CashSessionDetailButton
                            sessionId={session.id}
                            sessionData={session}
                          />
                          {isAdmin && !session.closed_at && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setForceCloseSession(session)}
                              title="Forzar cierre"
                            >
                              <LockOpen className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Force Close Modal */}
      <ForceCloseSessionModal
        open={!!forceCloseSession}
        onOpenChange={(open) => !open && setForceCloseSession(null)}
        session={forceCloseSession}
        onSuccess={loadData}
      />
    </div>
  );
}

function AdminSalesSummary({ sessions }: { sessions: CashSessionWithUser[] }) {
  const totals = useMemo(() => {
    const closed = sessions.filter(s => s.summary);
    const acc = {
      sessions: closed.length,
      discounts: 0,
      net: 0,
      cash: 0,
      mp: 0,
      pos: 0,
      aplicacion: 0,
      runas: 0,
    };
    for (const s of closed) {
      const sm = s.summary!;
      acc.discounts += sm.totalDiscounts || 0;
      acc.net += sm.totalSales || 0;
      acc.cash += sm.totalCash || 0;
      acc.mp += sm.totalMP || 0;
      acc.pos += sm.totalPOS || 0;
      acc.aplicacion += sm.totalAplicacion || 0;
      acc.runas += sm.totalRunas || 0;
    }
    // Solo dinero real (excluye Runas y otros métodos no monetarios)
    const totalMethods = acc.cash + acc.mp + acc.pos + acc.aplicacion;
    // Brutas reales = netas reales + descuentos (sin contar parte cubierta por Runas)
    const gross = acc.net + acc.discounts;
    return { ...acc, totalMethods, gross };
  }, [sessions]);

  const pct = (n: number) => totals.totalMethods > 0 ? ((n / totals.totalMethods) * 100).toFixed(1) : '0.0';

  const [open, setOpen] = useState(false);

  return (
    <Card className="border-primary/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left hover:bg-muted/30 transition-colors rounded-t-lg"
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    {open ? <Eye className="w-5 h-5 text-primary" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
                    Resumen Ejecutivo de Ventas
                    <Badge variant="outline" className="ml-1 text-[10px]">Solo Admin</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {open
                      ? `Agregado de ${totals.sessions} cierre${totals.sessions === 1 ? '' : 's'} según filtros aplicados (solo turnos cerrados)`
                      : 'Información sensible oculta. Haz clic para revelar montos y métodos de pago.'}
                  </CardDescription>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas Brutas</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totals.gross)}</p>
                <p className="text-xs text-muted-foreground mt-1">Dinero real antes de descuentos</p>
              </div>
              <div className="p-4 rounded-lg border bg-destructive/5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Descuentos Totales</p>
                <p className="text-2xl font-bold mt-1 text-destructive">- {formatCurrency(totals.discounts)}</p>
                <p className="text-xs text-muted-foreground mt-1">Cupones, promociones y ajustes</p>
              </div>
              <div className="p-4 rounded-lg border bg-primary/5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ventas Netas</p>
                <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totals.net)}</p>
                <p className="text-xs text-muted-foreground mt-1">Solo dinero real (excluye Runas/Canje)</p>
              </div>
            </div>

            {totals.runas > 0 && (
              <p className="text-xs text-muted-foreground italic">
                ℹ️ Adicionalmente se canjearon {formatCurrency(totals.runas)} en Runas (no contabilizado como dinero real).
              </p>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-3">Ventas por Método de Pago</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">% del total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Efectivo</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(totals.cash)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{pct(totals.cash)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Mercado Pago / Transferencia</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(totals.mp)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{pct(totals.mp)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>POS (Tarjeta)</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(totals.pos)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{pct(totals.pos)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Aplicación</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(totals.aplicacion)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{pct(totals.aplicacion)}%</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.totalMethods)}</TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}