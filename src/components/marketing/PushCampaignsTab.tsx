import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Send, Trash2, Loader2, Bell, Clock, CheckCircle2, XCircle, FlaskConical } from 'lucide-react';
import { useMarketingPushCampaigns } from '@/hooks/useMarketingPushCampaigns';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: any }> = {
  draft: { variant: 'secondary', label: 'Borrador', icon: Clock },
  sending: { variant: 'outline', label: 'Enviando...', icon: Loader2 },
  sent: { variant: 'default', label: 'Enviada', icon: CheckCircle2 },
  scheduled: { variant: 'secondary', label: 'Programada', icon: Clock },
  error: { variant: 'destructive', label: 'Error', icon: XCircle },
};

export const PushCampaignsTab: React.FC = () => {
  const { campaigns, loading, sending, createCampaign, deleteCampaign } = useMarketingPushCampaigns();
  const { user } = useAuthContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('all_customers');
  const [sendType, setSendType] = useState<'now' | 'scheduled'>('now');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Test notification state
  const [testTitle, setTestTitle] = useState('Paganos Burger');
  const [testMessage, setTestMessage] = useState('🔥 Prueba de notificación desde Paganos');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'Administrador';

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setSegment('all_customers');
    setSendType('now');
  };

  const handleOpenModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await createCampaign({
        title: title.trim(),
        message: message.trim(),
        segment,
        send_type: sendType,
      });
      setModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteCampaign(deletingId);
      setDeletingId(null);
    }
  };

  const handleSendTestNotification = async () => {
    if (!user?.id || !testTitle.trim() || !testMessage.trim()) {
      toast.error('Completa el título y mensaje');
      return;
    }

    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'test',
          external_user_id: user.id,
          title: testTitle.trim(),
          body: testMessage.trim(),
        }
      });

      if (error) {
        console.error('Error sending test notification:', error);
        toast.error(`Error al enviar: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success('Notificación de prueba enviada correctamente');
      } else {
        toast.error(`Error: ${data?.error || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Exception sending test notification:', err);
      toast.error('Error inesperado al enviar notificación');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test Notification Block - Admin Only */}
      {isAdmin && (
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="w-5 h-5 text-primary" />
              Probar notificaciones push
            </CardTitle>
            <CardDescription>
              Envía una notificación de prueba a tu dispositivo para verificar la integración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="test-title">Título</Label>
                <Input
                  id="test-title"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Paganos Burger"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-message">Mensaje</Label>
                <Input
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="🔥 Prueba de notificación"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSendTestNotification}
                disabled={isSendingTest || !testTitle.trim() || !testMessage.trim()}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar notificación de prueba a mi usuario
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Se enviará al usuario: <code className="bg-muted px-1 rounded">{user?.id?.slice(0, 8)}...</code>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Campañas Push
            </CardTitle>
            <CardDescription>
              Envía notificaciones push masivas a tus clientes
            </CardDescription>
          </div>
          <Button onClick={handleOpenModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Campaña
          </Button>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No hay campañas push creadas</p>
              <Button onClick={handleOpenModal} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Crear primera campaña
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead className="text-center">Enviados</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const statusConfig = STATUS_BADGES[campaign.status] || STATUS_BADGES.draft;
                  const StatusIcon = statusConfig.icon;
                  const isSending = sending === campaign.id;

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.title}</TableCell>
                      <TableCell className="max-w-xs truncate">{campaign.message}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {campaign.segment === 'all_customers' ? 'Todos' : campaign.segment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {campaign.sent_count}/{campaign.recipients_count}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className={`w-3 h-3 ${isSending || campaign.status === 'sending' ? 'animate-spin' : ''}`} />
                          {isSending ? 'Enviando...' : statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingId(campaign.id)}
                          disabled={campaign.status === 'sending'}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Nueva Campaña Push
            </DialogTitle>
            <DialogDescription>
              Crea una notificación push para enviar a tus clientes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: ¡Nueva promoción! 🎉"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/50
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensaje *</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ej: Aprovecha 20% de descuento en tu próximo pedido..."
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/200
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="segment">Segmento</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_customers">Todos los clientes registrados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Tipo de envío</Label>
              <RadioGroup value={sendType} onValueChange={(v) => setSendType(v as 'now' | 'scheduled')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="now" id="send_now" />
                  <Label htmlFor="send_now" className="font-normal cursor-pointer">
                    Enviar ahora
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scheduled" id="send_scheduled" disabled />
                  <Label htmlFor="send_scheduled" className="font-normal text-muted-foreground cursor-not-allowed">
                    Programar (próximamente)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!title.trim() || !message.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Campaña
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el registro de la campaña.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
