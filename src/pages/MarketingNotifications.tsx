import { PushCampaignsTab } from '@/components/marketing/PushCampaignsTab';

export default function MarketingNotifications() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notificaciones Push</h1>
        <p className="text-muted-foreground mt-1">
          Envía campañas de notificaciones push a los clientes de la app
        </p>
      </div>

      <PushCampaignsTab />
    </div>
  );
}
