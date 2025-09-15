import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/contexts/AuthContext';
import { Settings, DollarSign, MapPin, Star } from 'lucide-react';
import { DeliveryZoneManagement } from '@/components/delivery/DeliveryZoneManagement';
import { FidelizationConfig } from '@/components/config/FidelizationConfig';

export default function ConfiguracionPage() {
  const { user } = useAuthContext();

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
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">
          Administra los ajustes del sistema
        </p>
      </div>

      <Tabs defaultValue="zones" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Zonas Delivery
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="fidelization" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Fidelización
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zones" className="space-y-6">
          <DeliveryZoneManagement />
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Delivery</CardTitle>
              <CardDescription>
                Ajusta las tarifas y zonas de reparto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">En desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fidelization" className="space-y-6">
          <FidelizationConfig />
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Ajustes generales del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">En desarrollo...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}