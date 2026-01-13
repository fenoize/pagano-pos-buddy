import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FidelizationConfig } from '@/components/config/FidelizationConfig';
import { BadgesConfig } from '@/components/config/BadgesConfig';
import { NivelesContent } from '@/components/fidelizacion/NivelesContent';
import { FeedbackContent } from '@/components/fidelizacion/FeedbackContent';
import { Star, Award, TrendingUp, MessageSquare } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export default function FidelizacionHub() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthContext();
  const defaultTab = searchParams.get('tab') || 'runas';

  // Check if user is admin
  if (user?.role !== 'Administrador') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acceso Denegado</h2>
          <p className="text-sm text-muted-foreground mt-2">
            No tienes permisos para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Fidelización</h1>
        <p className="text-muted-foreground">
          Gestiona runas, niveles, insignias y feedback de clientes
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-0">
        {/* Desktop: Vertical sidebar tabs | Mobile: Horizontal tabs */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Tab List - Vertical on desktop, horizontal on mobile */}
          <TabsList className="flex md:flex-col h-auto md:w-48 md:h-fit gap-1 bg-muted/50 p-2 rounded-lg">
            <TabsTrigger 
              value="runas" 
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Star className="w-4 h-4" />
              <span>Runas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="niveles" 
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Niveles</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insignias" 
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Award className="w-4 h-4" />
              <span>Insignias</span>
            </TabsTrigger>
            <TabsTrigger 
              value="feedback" 
              className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Feedback</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 min-w-0">
            <TabsContent value="runas" className="mt-0">
              <FidelizationConfig />
            </TabsContent>

            <TabsContent value="niveles" className="mt-0">
              <NivelesContent />
            </TabsContent>

            <TabsContent value="insignias" className="mt-0">
              <BadgesConfig />
            </TabsContent>

            <TabsContent value="feedback" className="mt-0">
              <FeedbackContent />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
