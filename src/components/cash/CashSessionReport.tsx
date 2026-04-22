import React, { useState, useEffect, useMemo } from 'react';
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
import { Download, Eye, Calendar, Search, Filter, LockOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CashSession, User, AppRole } from '@/types';
import { CashSessionDetailButton } from './CashSessionDetailButton';
import { formatDeliveryAddress } from '@/lib/deliveryHelpers';
import { ForceCloseSessionModal } from './ForceCloseSessionModal';
import { useAuthContext } from '@/contexts/AuthContext';
import { getNonRealSaleMethods, getOrderRealRevenue } from '@/lib/paymentMethodUtils';

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
    totalCash: number;
    totalMP: number;
    totalPOS: number;
    ingresos: number;
    egresos: number;
    expectedCash: number;
    difference: number;
  };
}

export function CashSessionReport() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'Administrador';
  
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
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, filters, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load sessions and users separately
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('cash_sessions')
        .select('*')
        .order('opened_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Load users for filter
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, role, active, created_at, updated_at, can_do_delivery')
        .eq('active', true)
        .in('role', ['Administrador', 'Cajero'])
        .order('username');

      if (usersError) throw usersError;

      // Map users to sessions
      const userMap = new Map(usersData?.map(user => [user.id, user]) || []);

      // Get non-real payment methods once
      const nonRealMethods = await getNonRealSaleMethods();

      // Calculate summaries for closed sessions
      const sessionsWithSummary = await Promise.all(
        (sessionsData || []).map(async (session) => {
          if (session.closed_at) {
            try {
              // Get orders from this session
              const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('created_by_user_id', session.user_id)
                .gte('created_at', session.opened_at)
                .lte('created_at', session.closed_at)
                .eq('status', 'Entregado');

              // Get cash movements
              const { data: movements } = await supabase
                .from('cash_movements')
                .select('*')
                .eq('session_id', session.id);

              // Calculate totals - only count real revenue
              const totalSales = (orders || []).reduce((sum, order) => sum + getOrderRealRevenue(order, nonRealMethods), 0);
              const grossSales = (orders || []).reduce((sum, order) => sum + (order.subtotal || 0), 0);
              const totalDiscounts = (orders || []).reduce((sum, order) => sum + (order.discount || 0), 0);
              const totalCash = orders?.reduce((sum, order) => sum + (order.payment_efectivo || 0), 0) || 0;
              const totalMP = orders?.reduce((sum, order) => sum + (order.payment_mp || 0), 0) || 0;
              const totalPOS = orders?.reduce((sum, order) => sum + (order.payment_pos || 0), 0) || 0;
              const totalAplicacion = orders?.reduce((sum, order) => sum + (order.payment_aplicacion || 0), 0) || 0;
              const totalRunas = orders?.reduce((sum, order) => sum + (order.payment_runas || 0), 0) || 0;

              const ingresos = movements?.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0) || 0;
              const egresos = movements?.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0) || 0;

              // Subtract delivery cash — drivers hold it, not the register
              const deliveryCashFromOrders = (orders || [])
                .filter(o => o.fulfillment === 'delivery' && (o.payment_efectivo || 0) > 0)
                .reduce((sum, o) => sum + (o.payment_efectivo || 0), 0);
              const cashInRegister = totalCash - deliveryCashFromOrders;
              const expectedCash = session.opening_cash + cashInRegister + ingresos - egresos;
              const difference = (session.closing_cash || 0) - expectedCash;

              return {
                ...session,
                user: userMap.get(session.user_id),
                summary: {
                  totalSales,
                  grossSales,
                  totalDiscounts,
                  totalCash,
                  totalMP,
                  totalPOS,
                  totalAplicacion,
                  totalRunas,
                  ingresos,
                  egresos,
                  expectedCash,
                  difference
                }
              };
            } catch (error) {
              console.error('Error calculating session summary:', error);
              return {
                ...session,
                user: userMap.get(session.user_id)
              };
            }
          }
          return {
            ...session,
            user: userMap.get(session.user_id)
          };
        })
      );

      setSessions(sessionsWithSummary as CashSessionWithUser[]);
      setUsers(usersData?.map(user => ({
        ...user,
        role: mapDatabaseRoleToApp(user.role)
      })) || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

    toast({
      title: "Exportación exitosa",
      description: "El reporte ha sido descargado."
    });
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