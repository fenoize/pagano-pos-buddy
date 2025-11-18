import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { Settings, DollarSign, MapPin, CreditCard, Tag, Smartphone, Shield, ShoppingCart, TruckIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeliveryZoneManagement } from '@/components/delivery/DeliveryZoneManagement';
import { DeliveryConfig } from '@/components/config/DeliveryConfig';
import { PaymentMethodsConfig } from '@/components/config/PaymentMethodsConfig';
import { PWAConfig } from '@/components/config/PWAConfig';
import { CategoryConfig } from '@/components/config/CategoryConfig';
import CouponsManagement from './CouponsManagement';
import { OnlineOrdersConfig } from '@/components/config/OnlineOrdersConfig';

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

      <Tabs defaultValue="online-orders" className="flex gap-6" orientation="vertical">
        <TabsList className="flex flex-col h-fit w-56 bg-muted/50 p-2 gap-1">
          <TabsTrigger value="online-orders" className="w-full justify-start gap-3 px-4 py-2.5">
            <ShoppingCart className="w-4 h-4" />
            <span>Pedidos Online</span>
          </TabsTrigger>
          <TabsTrigger value="zones" className="w-full justify-start gap-3 px-4 py-2.5">
            <MapPin className="w-4 h-4" />
            <span>Zonas de Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="delivery" className="w-full justify-start gap-3 px-4 py-2.5">
            <TruckIcon className="w-4 h-4" />
            <span>Delivery</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="w-full justify-start gap-3 px-4 py-2.5">
            <CreditCard className="w-4 h-4" />
            <span>Métodos de Pago</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="w-full justify-start gap-3 px-4 py-2.5">
            <Tag className="w-4 h-4" />
            <span>Cupones</span>
          </TabsTrigger>
          <TabsTrigger value="pwa" className="w-full justify-start gap-3 px-4 py-2.5">
            <Smartphone className="w-4 h-4" />
            <span>PWA</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="w-full justify-start gap-3 px-4 py-2.5">
            <Shield className="w-4 h-4" />
            <span>Permisos</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="w-full justify-start gap-3 px-4 py-2.5">
            <Settings className="w-4 h-4" />
            <span>General</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="online-orders" className="mt-0 space-y-6">
            <OnlineOrdersConfig />
          </TabsContent>

          <TabsContent value="zones" className="mt-0 space-y-6">
            <DeliveryZoneManagement />
          </TabsContent>

          <TabsContent value="delivery" className="mt-0 space-y-6">
            <DeliveryConfig />
          </TabsContent>

          <TabsContent value="payments" className="mt-0 space-y-6">
            <PaymentMethodsConfig />
          </TabsContent>

          <TabsContent value="coupons" className="mt-0 space-y-6">
            <CouponsManagement />
          </TabsContent>

          <TabsContent value="pwa" className="mt-0 space-y-6">
            <PWAConfig />
          </TabsContent>

          <TabsContent value="permissions" className="mt-0 space-y-6">
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

          <TabsContent value="general" className="mt-0 space-y-6">
            <CategoryConfig />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}