import { useState } from 'react';
import { CustomerLayout } from '@/components/customer/CustomerLayout';
import { BadgeCard } from '@/components/customer/BadgeCard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCustomerBadges } from '@/hooks/useCustomerBadges';
import { formatDateLong } from '@/lib/dateUtils';
import { Trophy, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MyBadges() {
  const { customer } = useCustomerAuth();
  const { allBadges, awardedBadges, loading, hasBadge, getBadgesByCategory, categories, totalBadges, totalAwarded } = useCustomerBadges(customer?.id);

  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('todas');

  const handleBadgeClick = (badge: any) => {
    setSelectedBadge(badge);
    setDialogOpen(true);
  };

  const displayBadges = activeTab === 'todas' ? allBadges : getBadgesByCategory(activeTab);

  return (
    <CustomerLayout title="Mis Insignias">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-base px-4 py-2">
            <Trophy className="h-4 w-4 mr-2" />
            {totalAwarded} de {totalBadges} obtenidas
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : displayBadges.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay insignias en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {displayBadges.map((badge) => {
                  const awarded = awardedBadges.find((a) => a.id === badge.id);
                  return (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      awarded={!!awarded}
                      awardedDate={awarded?.awarded_at}
                      onClick={() => handleBadgeClick({ ...badge, awarded: !!awarded, awarded_at: awarded?.awarded_at })}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          {selectedBadge && (
            <div className="flex flex-col items-center text-center space-y-4 p-4">
              <Trophy size={80} className="text-primary" />
              <h3 className="text-2xl font-bold">{selectedBadge.name}</h3>
              <p className="text-muted-foreground">{selectedBadge.description}</p>
              {selectedBadge.awarded ? (
                <Badge variant="secondary">Obtenida el {formatDateLong(selectedBadge.awarded_at)}</Badge>
              ) : (
                <Alert><Info className="w-4 h-4" /><AlertDescription>Aún no has obtenido esta insignia</AlertDescription></Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
