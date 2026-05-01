import { useState } from 'react';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Power, Eye, EyeOff, ArrowLeftRight } from 'lucide-react';
import { FinanceAccount } from '@/types/finance';
import { AccountMovementModal } from '@/components/finance/AccountMovementModal';

export default function FinanceAccounts() {
  const { user } = useAuth();
  const { accounts, loading, createAccount, updateAccount, toggleActiveAccount, refetch } = useFinanceAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementAccountId, setMovementAccountId] = useState<string | undefined>(undefined);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [visibleBalances, setVisibleBalances] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Efectivo' as 'Efectivo' | 'Banco' | 'Digital' | 'Otro',
    description: '',
    is_active: true,
    balance: 0,
  });

  const isAdmin = user?.role === 'Administrador';

  const toggleBalanceVisibility = (accountId: string) => {
    setVisibleBalances(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleOpenDialog = (account?: FinanceAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        code: account.code || '',
        type: account.type,
        description: account.description || '',
        is_active: account.is_active,
        balance: account.balance || 0,
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        code: '',
        type: 'Efectivo',
        description: '',
        is_active: true,
        balance: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      code: formData.code || null,
      type: formData.type,
      description: formData.description || null,
      is_active: formData.is_active,
      balance: formData.balance,
    };

    const success = editingAccount
      ? await updateAccount(editingAccount.id, data)
      : await createAccount(data);

    if (success) {
      setIsDialogOpen(false);
    }
  };

  const handleToggleActive = async (account: FinanceAccount) => {
    await toggleActiveAccount(account.id, account.is_active);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cuentas Financieras</h1>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cuenta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Banco">Banco</SelectItem>
                      <SelectItem value="Digital">Digital</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ej: CAJA_CHICA"
                  />
                </div>

                <div>
                  <Label htmlFor="balance">Saldo Actual</Label>
                  <Input
                    id="balance"
                    type="number"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Cuenta activa</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Cuentas</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay cuentas registradas
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  {isAdmin && <TableHead>Saldo</TableHead>}
                  <TableHead>Estado</TableHead>
                  {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{account.type}</TableCell>
                    <TableCell>
                      {account.code ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">{account.code}</code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm min-w-[100px]">
                            {visibleBalances[account.id] 
                              ? formatCurrency(account.balance || 0)
                              : '••••••••'
                            }
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleBalanceVisibility(account.id)}
                          >
                            {visibleBalances[account.id] ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={account.is_active ? 'default' : 'secondary'}>
                        {account.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(account)}
                          >
                            <Power className={`h-4 w-4 ${account.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
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
