import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { Settings, DollarSign, MapPin, Star, CreditCard, Tag, Smartphone, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeliveryZoneManagement } from '@/components/delivery/DeliveryZoneManagement';
import { FidelizationConfig } from '@/components/config/FidelizationConfig';
import { PaymentMethodsConfig } from '@/components/config/PaymentMethodsConfig';
import { PWAConfig } from '@/components/config/PWAConfig';
import CouponsManagement from './CouponsManagement';

export default function ConfiguracionPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

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
        <TabsList className="grid w-full grid-cols-8 md:grid-cols-8">
          <TabsTrigger value="zones" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Zonas</span>
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Pagos</span>
          </TabsTrigger>
          <TabsTrigger value="fidelization" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">Runas</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Cupones</span>
          </TabsTrigger>
          <TabsTrigger value="pwa" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">PWA</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Permisos</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
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

        <TabsContent value="payments" className="space-y-6">
          <PaymentMethodsConfig />
        </TabsContent>

        <TabsContent value="fidelization" className="space-y-6">
          <FidelizationConfig />
        </TabsContent>

        <TabsContent value="coupons" className="space-y-6">
          <CouponsManagement />
        </TabsContent>

        <TabsContent value="pwa" className="space-y-6">
          <PWAConfig />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gestión de Permisos
              </CardTitle>
              <CardDescription>
                Administra los permisos de cada rol en el sistema de forma centralizada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  El sistema de permisos te permite controlar qué puede hacer cada rol (Administrador, Cajero, Cocina, Reparto, Viewer) en cada módulo de la aplicación.
                </p>
                <Button onClick={() => navigate('/pos/configuracion/permisos')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Ir a Gestión de Permisos
                </Button>
              </div>
            </CardContent>
          </Card>
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