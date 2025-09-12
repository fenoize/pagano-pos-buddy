import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductModifier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ModifiersManagementProps {
  productId?: string;
}

export function ModifiersManagement({ productId }: ModifiersManagementProps) {
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModifier, setEditingModifier] = useState<ProductModifier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    if (productId) {
      fetchModifiers();
    }
  }, [productId]);

  const fetchModifiers = async () => {
    if (!productId) return;

    try {
      const { data, error } = await supabase
        .from('product_modifiers')
        .select('*')
        .eq('product_id', productId)
        .order('name');

      if (error) throw error;
      setModifiers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los modificadores",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId) {
      toast({
        title: "Error",
        description: "Debe guardar el producto primero",
        variant: "destructive"
      });
      return;
    }

    try {
      const modifierData = {
        ...formData,
        product_id: productId
      };

      if (editingModifier) {
        const { error } = await supabase
          .from('product_modifiers')
          .update(modifierData)
          .eq('id', editingModifier.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Modificador actualizado correctamente"
        });
      } else {
        const { error } = await supabase
          .from('product_modifiers')
          .insert(modifierData);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Modificador creado correctamente"
        });
      }

      setIsDialogOpen(false);
      setEditingModifier(null);
      resetForm();
      fetchModifiers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el modificador",
        variant: "destructive"
      });
    }
  };

  const deleteModifier = async (modifier: ProductModifier) => {
    if (!confirm(`¿Estás seguro de eliminar el modificador "${modifier.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_modifiers')
        .delete()
        .eq('id', modifier.id);

      if (error) throw error;
      
      fetchModifiers();
      toast({
        title: "Éxito",
        description: "Modificador eliminado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el modificador",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (modifier: ProductModifier) => {
    setEditingModifier(modifier);
    setFormData({
      name: modifier.name,
      price: modifier.price,
      active: modifier.active
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    if (!productId) {
      toast({
        title: "Aviso",
        description: "Debe guardar el producto primero para agregar modificadores",
        variant: "default"
      });
      return;
    }
    resetForm();
    setEditingModifier(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      active: true
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Modificadores del Producto</Label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openNewDialog}
              disabled={!productId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Modificador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingModifier ? 'Editar Modificador' : 'Nuevo Modificador'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Sin pepinillos, Extra salsa"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="price">Precio Adicional</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  min="0"
                  placeholder="0 si es sin costo"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Modificador activo</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingModifier ? 'Actualizar' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {modifiers.map((modifier) => (
          <Card key={modifier.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{modifier.name}</span>
                    <Badge variant={modifier.active ? "default" : "secondary"}>
                      {modifier.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {modifier.price > 0 ? formatPrice(modifier.price) : 'Sin costo adicional'}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(modifier)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteModifier(modifier)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!productId && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Guarda el producto para agregar modificadores específicos</p>
          </CardContent>
        </Card>
      )}

      {productId && modifiers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No hay modificadores configurados para este producto</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}