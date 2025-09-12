import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, ToggleLeft, ToggleRight, Image as ImageIcon } from 'lucide-react';
import { ProductEditModal } from '@/components/pos/ProductEditModal';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (
            categories (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformar datos para incluir categorías
      const productsWithCategories = data?.map(product => ({
        ...product,
        categories: product.product_categories?.map((pc: any) => pc.categories) || []
      })) || [];

      setProducts(productsWithCategories as any);
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

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openNewDialog = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
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
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <ProductEditModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        product={editingProduct}
        onProductUpdated={fetchProducts}
      />

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id} className={`${!product.active ? 'opacity-60' : ''}`}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                {/* Imagen del producto */}
                <div className="w-24 h-24 rounded-lg border flex-shrink-0 overflow-hidden bg-muted">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Información del producto */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{product.name}</h3>
                    <Badge variant={product.active ? "default" : "secondary"}>
                      {product.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {/* Categorías */}
                  {product.categories && product.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.categories.map((category) => (
                        <Badge key={category.id} variant="outline" className="text-xs">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-2">Precios Combo</h4>
                      <div className="space-y-1 text-sm">
                        <div>Simple: {formatPrice((product.prices as any).combo.simple)}</div>
                        <div>Doble: {formatPrice((product.prices as any).combo.doble)}</div>
                        <div>Triple: {formatPrice((product.prices as any).combo.triple)}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-muted-foreground mb-2">Precios Solo</h4>
                      <div className="space-y-1 text-sm">
                        <div>Simple: {formatPrice((product.prices as any).only.simple)}</div>
                        <div>Doble: {formatPrice((product.prices as any).only.doble)}</div>
                        <div>Triple: {formatPrice((product.prices as any).only.triple)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
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