import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    prices: {
      combo: { simple: 0, doble: 0, triple: 0 },
      only: { simple: 0, doble: 0, triple: 0 }
    },
    active: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            prices: formData.prices,
            active: formData.active
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Producto actualizado correctamente"
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            prices: formData.prices,
            active: formData.active
          });

        if (error) throw error;
        
        toast({
          title: "Éxito", 
          description: "Producto creado correctamente"
        });
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive"
      });
    }
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: !product.active })
        .eq('id', product.id);

      if (error) throw error;
      
      fetchProducts();
      toast({
        title: "Éxito",
        description: `Producto ${!product.active ? 'activado' : 'desactivado'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      prices: product.prices,
      active: product.active
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      prices: {
        combo: { simple: 0, doble: 0, triple: 0 },
        only: { simple: 0, doble: 0, triple: 0 }
      },
      active: true
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Precios Combo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Simple</Label>
                      <Input
                        type="number"
                        value={formData.prices.combo.simple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            combo: { ...formData.prices.combo, simple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Doble</Label>
                      <Input
                        type="number"
                        value={formData.prices.combo.doble}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            combo: { ...formData.prices.combo, doble: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Triple</Label>
                      <Input
                        type="number"
                        value={formData.prices.combo.triple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            combo: { ...formData.prices.combo, triple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Precios Solo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Simple</Label>
                      <Input
                        type="number"
                        value={formData.prices.only.simple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            only: { ...formData.prices.only, simple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Doble</Label>
                      <Input
                        type="number"
                        value={formData.prices.only.doble}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            only: { ...formData.prices.only, doble: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Triple</Label>
                      <Input
                        type="number"
                        value={formData.prices.only.triple}
                        onChange={(e) => setFormData({
                          ...formData,
                          prices: {
                            ...formData.prices,
                            only: { ...formData.prices.only, triple: Number(e.target.value) }
                          }
                        })}
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Producto activo</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id} className={`${!product.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{product.name}</h3>
                    <Badge variant={product.active ? "default" : "secondary"}>
                      {product.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-2">Precios Combo</h4>
                      <div className="space-y-1 text-sm">
                        <div>Simple: {formatPrice(product.prices.combo.simple)}</div>
                        <div>Doble: {formatPrice(product.prices.combo.doble)}</div>
                        <div>Triple: {formatPrice(product.prices.combo.triple)}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-2">Precios Solo</h4>
                      <div className="space-y-1 text-sm">
                        <div>Simple: {formatPrice(product.prices.only.simple)}</div>
                        <div>Doble: {formatPrice(product.prices.only.doble)}</div>
                        <div>Triple: {formatPrice(product.prices.only.triple)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleProductActive(product)}
                  >
                    {product.active ? (
                      <ToggleLeft className="w-4 h-4" />
                    ) : (
                      <ToggleRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No hay productos creados</p>
            <Button className="mt-4" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primer producto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}