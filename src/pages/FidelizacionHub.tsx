import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FidelizationConfig } from '@/components/config/FidelizationConfig';
import { BadgesConfig } from '@/components/config/BadgesConfig';
import { NivelesContent } from '@/components/fidelizacion/NivelesContent';
import { Star, Award, TrendingUp } from 'lucide-react';
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
          Gestiona runas, niveles e insignias de clientes
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="runas" className="gap-2">
            <Star className="w-4 h-4" />
            Runas
          </TabsTrigger>
          <TabsTrigger value="niveles" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Niveles
          </TabsTrigger>
          <TabsTrigger value="insignias" className="gap-2">
            <Award className="w-4 h-4" />
            Insignias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runas" className="mt-0">
          <FidelizationConfig />
        </TabsContent>

        <TabsContent value="niveles" className="mt-0">
          <NivelesContent />
        </TabsContent>

        <TabsContent value="insignias" className="mt-0">
          <BadgesConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
