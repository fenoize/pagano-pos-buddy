import { useState } from 'react';
import { Gift, Calendar, RefreshCw, Trash2, Edit2, Plus, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRunaSubscriptions, SubscriptionType, RunaSubscription } from '@/hooks/useRunaSubscriptions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerRunaSubscriptionsProps {
  customerId: string;
  customerBirthday?: string | null;
}

export default function CustomerRunaSubscriptions({ customerId, customerBirthday }: CustomerRunaSubscriptionsProps) {
  const {
    subscriptions,
    config,
    loading,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    getActiveSubscription
  } = useRunaSubscriptions(customerId);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  
  const [newSubscription, setNewSubscription] = useState({
    type: 'monthly' as SubscriptionType,
    amount: 10,
    notes: ''
  });

  const getTypeLabel = (type: SubscriptionType) => {
    switch (type) {
      case 'monthly': return 'Mensual';
      case 'weekly': return 'Semanal';
      case 'birthday': return 'Cumpleaños';
    }
  };

  const getTypeIcon = (type: SubscriptionType) => {
    switch (type) {
      case 'monthly': return <RefreshCw className="w-4 h-4" />;
      case 'weekly': return <Calendar className="w-4 h-4" />;
      case 'birthday': return <Gift className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: SubscriptionType) => {
    switch (type) {
      case 'monthly': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'weekly': return 'bg-green-100 text-green-800 border-green-200';
      case 'birthday': return 'bg-pink-100 text-pink-800 border-pink-200';
    }
  };

  const handleCreate = async () => {
    const success = await createSubscription(
      newSubscription.type,
      newSubscription.amount,
      newSubscription.notes
    );
    if (success) {
      setIsCreateModalOpen(false);
      setNewSubscription({ type: 'monthly', amount: 10, notes: '' });
    }
  };

  const handleToggleActive = async (sub: RunaSubscription) => {
    await updateSubscription(sub.id, { is_active: !sub.is_active });
  };

  const handleStartEdit = (sub: RunaSubscription) => {
    setEditingId(sub.id);
    setEditAmount(sub.runas_amount);
  };

  const handleSaveEdit = async (subId: string) => {
    await updateSubscription(subId, { runas_amount: editAmount });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount(0);
  };

  const handleDelete = async (subId: string) => {
    if (confirm('¿Estás seguro de eliminar esta suscripción?')) {
      await deleteSubscription(subId);
    }
  };

  // Verificar si tiene cumpleaños configurado
  const hasBirthday = !!customerBirthday;
  const hasBirthdaySubscription = getActiveSubscription('birthday');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Runas Automáticas
          </h3>
          <p className="text-sm text-muted-foreground">
            Configura bonificaciones periódicas de runas
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Suscripción
        </Button>
      </div>

      {/* Info de cumpleaños */}
      {!hasBirthday && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              <Gift className="w-4 h-4 inline mr-2" />
              Este cliente no tiene fecha de nacimiento registrada. Agrégala para activar el bono de cumpleaños.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de suscripciones */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">Sin suscripciones activas</h4>
            <p className="text-muted-foreground text-center mb-4">
              Este cliente no tiene runas automáticas configuradas
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Crear primera suscripción
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {subscriptions.map((sub) => (
            <Card key={sub.id} className={!sub.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeBadgeColor(sub.subscription_type)}`}>
                      {getTypeIcon(sub.subscription_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getTypeLabel(sub.subscription_type)}</span>
                        <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                          {sub.is_active ? 'Activa' : 'Pausada'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {editingId === sub.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              min="1"
                              value={editAmount}
                              onChange={(e) => setEditAmount(parseInt(e.target.value) || 0)}
                              className="w-24 h-8"
                            />
                            <span>runas</span>
                            <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(sub.id)}>
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="font-semibold text-primary">{sub.runas_amount} runas</span>
                            {sub.next_execution_date && sub.subscription_type !== 'birthday' && (
                              <span className="ml-2">
                                · Próximo: {format(new Date(sub.next_execution_date), 'dd MMM yyyy', { locale: es })}
                              </span>
                            )}
                            {sub.last_executed_at && (
                              <span className="ml-2">
                                · Último: {format(new Date(sub.last_executed_at), 'dd MMM', { locale: es })}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {sub.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{sub.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sub.is_active}
                      onCheckedChange={() => handleToggleActive(sub)}
                    />
                    {editingId !== sub.id && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit(sub)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(sub.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear suscripción */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Suscripción de Runas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Suscripción</Label>
              <Select 
                value={newSubscription.type} 
                onValueChange={(v) => setNewSubscription({
                  ...newSubscription, 
                  type: v as SubscriptionType,
                  amount: v === 'monthly' ? (config?.monthly_subscription.default_runas || 10) :
                          v === 'weekly' ? (config?.weekly_subscription.default_runas || 5) :
                          (config?.birthday_bonus.runas_amount || 50)
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Mensual - Recibe runas el 1° de cada mes
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Semanal - Recibe runas cada 7 días
                    </div>
                  </SelectItem>
                  {hasBirthday && !hasBirthdaySubscription && (
                    <SelectItem value="birthday">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Cumpleaños - Recibe runas en su cumpleaños
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cantidad de Runas</Label>
              <Input
                type="number"
                min="1"
                value={newSubscription.amount}
                onChange={(e) => setNewSubscription({...newSubscription, amount: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">
                {newSubscription.type === 'monthly' && 'Se entregarán el 1° de cada mes'}
                {newSubscription.type === 'weekly' && 'Se entregarán cada 7 días'}
                {newSubscription.type === 'birthday' && 'Se entregarán en el cumpleaños del cliente'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={newSubscription.notes}
                onChange={(e) => setNewSubscription({...newSubscription, notes: e.target.value})}
                placeholder="Ej: Cliente VIP, Suscripción premium..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={loading || newSubscription.amount <= 0}>
              Crear Suscripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
