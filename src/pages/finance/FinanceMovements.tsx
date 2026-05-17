import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useBranches } from '@/hooks/useBranches';
import { formatDateTime } from '@/lib/dateUtils';
import { toast } from "sonner";
type Movement = {
  id: string;
  created_at: string;
  type: 'ingreso' | 'egreso' | 'transferencia';
  amount: number;
  note: string | null;
  category: string | null;
  session_id: string | null;
  branch_id: string | null;
  account_id: string | null;
  account_to_id: string | null;
  account?: { id: string; name: string; type: string } | null;
  account_to?: { id: string; name: string; type: string } | null;
  user?: { id: string; full_name: string } | null;
};

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

export default function FinanceMovements() {
  const { accounts } = useFinanceAccounts();
  const { branches } = useBranches();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(monthAgo);
  const [dateTo, setDateTo] = useState(today);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cash_movements')
        .select(`
          *,
          account:finance_accounts!cash_movements_account_id_fkey(id, name, type),
          account_to:finance_accounts!cash_movements_account_to_id_fkey(id, name, type)
        `)
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (typeFilter !== 'all') query = query.eq('type', typeFilter as any);
      if (accountFilter !== 'all') query = query.or(`account_id.eq.${accountFilter},account_to_id.eq.${accountFilter}`);
      if (branchFilter !== 'all') query = query.eq('branch_id', branchFilter);

      const { data, error } = await query;
      if (error) throw error;
      setMovements((data || []) as any);
    } catch (e: any) {
      console.error(e);
      toast.error('Error', { description: e.message || 'No se pudieron cargar los movimientos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, typeFilter, accountFilter, branchFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return movements;
    const s = search.toLowerCase();
    return movements.filter(
      (m) =>
        m.note?.toLowerCase().includes(s) ||
        m.category?.toLowerCase().includes(s) ||
        m.account?.name.toLowerCase().includes(s) ||
        m.account_to?.name.toLowerCase().includes(s),
    );
  }, [movements, search]);

  const totals = useMemo(() => {
    const ingresos = filtered.filter((m) => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0);
    const egresos = filtered.filter((m) => m.type === 'egreso').reduce((s, m) => s + m.amount, 0);
    const transferencias = filtered.filter((m) => m.type === 'transferencia').reduce((s, m) => s + m.amount, 0);
    return { ingresos, egresos, transferencias, neto: ingresos - egresos };
  }, [filtered]);

  const exportCSV = () => {
    const header = ['Fecha', 'Tipo', 'Categoría', 'Cuenta Origen', 'Cuenta Destino', 'Monto', 'Sucursal', 'Nota'];
    const branchById = new Map(branches.map((b) => [b.id, b.name]));
    const rows = filtered.map((m) => [
      formatDateTime(m.created_at),
      m.type,
      m.category || '',
      m.account?.name || '',
      m.account_to?.name || '',
      m.amount,
      m.branch_id ? branchById.get(m.branch_id) || '' : '',
      (m.note || '').replace(/[\n;,]/g, ' '),
    ]);
    const csv = [header, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeBadge = (t: Movement['type']) => {
    if (t === 'ingreso')
      return (
        <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/30">
          <ArrowDownCircle className="w-3 h-3 mr-1" /> Ingreso
        </Badge>
      );
    if (t === 'egreso')
      return (
        <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/30">
          <ArrowUpCircle className="w-3 h-3 mr-1" /> Egreso
        </Badge>
      );
    return (
      <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/30">
        <ArrowLeftRight className="w-3 h-3 mr-1" /> Transferencia
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Historial de Movimientos</h1>
          <p className="text-muted-foreground">Ingresos, egresos y transferencias entre cuentas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchMovements} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
          <Button size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-lg font-bold text-green-600">{formatCLP(totals.ingresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Egresos</p>
            <p className="text-lg font-bold text-red-600">{formatCLP(totals.egresos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Transferencias</p>
            <p className="text-lg font-bold text-blue-600">{formatCLP(totals.transferencias)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Neto (Ingresos − Egresos)</p>
            <p className={`text-lg font-bold ${totals.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCLP(totals.neto)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ingreso">Ingresos</SelectItem>
                  <SelectItem value="egreso">Egresos</SelectItem>
                  <SelectItem value="transferencia">Transferencias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cuenta</label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sucursal</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Buscar</label>
              <Input placeholder="Nota, categoría..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cuenta Origen</TableHead>
                  <TableHead>Cuenta Destino</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin movimientos en el rango seleccionado</TableCell></TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(m.created_at)}</TableCell>
                      <TableCell>{typeBadge(m.type)}</TableCell>
                      <TableCell className="text-sm">{m.category || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">{m.account?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">{m.account_to?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">{formatCLP(m.amount)}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={m.note || ''}>{m.note || <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length >= 1000 && (
            <div className="p-3 text-xs text-center text-muted-foreground border-t">
              Mostrando primeros 1000 registros. Refina los filtros para ver más.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
