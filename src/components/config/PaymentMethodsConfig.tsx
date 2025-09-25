import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function PaymentMethodsConfig() {
  const [cashDenominations, setCashDenominations] = useState<number[]>([]);
  const [newDenomination, setNewDenomination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'cash_denominations')
        .maybeSingle();

      if (data?.value) {
        setCashDenominations(data.value as number[]);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const addDenomination = () => {
    const value = parseInt(newDenomination);
    if (!value || value <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un valor válido",
        variant: "destructive"
      });
      return;
    }

    if (cashDenominations.includes(value)) {
      toast({
        title: "Error", 
        description: "Esta denominación ya existe",
        variant: "destructive"
      });
      return;
    }

    const updated = [...cashDenominations, value].sort((a, b) => a - b);
    setCashDenominations(updated);
    setNewDenomination('');
  };

  const removeDenomination = (value: number) => {
    setCashDenominations(prev => prev.filter(d => d !== value));
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from('config')
        .upsert({
          key: 'cash_denominations',
          value: cashDenominations
        });

      toast({
        title: "Configuración guardada",
        description: "Los billetes se han actualizado correctamente"
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Denominaciones de Efectivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Billetes Disponibles</Label>
          <div className="flex flex-wrap gap-2">
            {cashDenominations.map((value) => (
              <Badge key={value} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                {formatPrice(value)}
                <button
                  onClick={() => removeDenomination(value)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-denomination">Agregar Nueva Denominación</Label>
            <Input
              id="new-denomination"
              type="number"
              value={newDenomination}
              onChange={(e) => setNewDenomination(e.target.value)}
              placeholder="Ej: 50000"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addDenomination();
                }
              }}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addDenomination} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button 
          onClick={saveConfig} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </CardContent>
    </Card>
  );
}