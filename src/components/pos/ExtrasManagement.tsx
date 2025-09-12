import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductExtra } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtrasManagementProps {
  selectedCategories: string[];
}

export function ExtrasManagement({ selectedCategories }: ExtrasManagementProps) {
  const [extras, setExtras] = useState<ProductExtra[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ProductExtra | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category_id: '',
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchExtras();
    fetchCategories();
  }, []);

  const fetchExtras = async () => {
    try {
      const { data, error } = await supabase
        .from('product_extras')
        .select(`
          *,
          categories:category_id (
            id,
            name
          )
        `)
        .order('name');

      if (error) throw error;
      setExtras(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los extras",
        variant: "destructive"
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingExtra) {
        const { error } = await supabase
          .from('product_extras')
          .update(formData)
          .eq('id', editingExtra.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Extra actualizado correctamente"
        });
      } else {
        const { error } = await supabase
          .from('product_extras')
          .insert(formData);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Extra creado correctamente"
        });
      }

      setIsDialogOpen(false);
      setEditingExtra(null);
      resetForm();
      fetchExtras();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el extra",
        variant: "destructive"
      });
    }
  };

  const deleteExtra = async (extra: ProductExtra) => {
    if (!confirm(`¿Estás seguro de eliminar el extra "${extra.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('product_extras')
        .delete()
        .eq('id', extra.id);

      if (error) throw error;
      
      fetchExtras();
      toast({
        title: "Éxito",
        description: "Extra eliminado correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el extra",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (extra: ProductExtra) => {
    setEditingExtra(extra);
    setFormData({
      name: extra.name,
      price: extra.price,
      category_id: extra.category_id || '',
      active: extra.active
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setEditingExtra(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      category_id: selectedCategories[0] || '',
      active: true
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  // Filtrar extras relevantes a las categorías seleccionadas
  const relevantExtras = extras.filter(extra => 
    !extra.category_id || selectedCategories.includes(extra.category_id)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Extras Disponibles</Label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Extra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingExtra ? 'Editar Extra' : 'Nuevo Extra'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Extra Tocino"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="price">Precio</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  min="0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Extra activo</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingExtra ? 'Actualizar' : 'Crear'}
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
        {relevantExtras.map((extra) => (
          <Card key={extra.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{extra.name}</span>
                    <Badge variant={extra.active ? "default" : "secondary"}>
                      {extra.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(extra.price)}
                    {(extra as any).categories && (
                      <span className="ml-2">• {(extra as any).categories.name}</span>
                    )}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(extra)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteExtra(extra)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {relevantExtras.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No hay extras disponibles para las categorías seleccionadas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}