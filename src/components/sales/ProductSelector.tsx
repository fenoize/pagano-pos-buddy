import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { OrderItem } from '@/types';
import { Search, X, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  prices: any;
  active: boolean;
  image_url?: string;
}

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelected: (item: OrderItem) => void;
}

export function ProductSelector({ isOpen, onClose, onProductSelected }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setAddedCount(0); // Reset counter when opening
      setSearchQuery(''); // Reset search
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (product: Product, size: 'simple' | 'doble' | 'triple', priceKind: 'combo' | 'only') => {
    const price = product.prices[priceKind]?.[size] || 0;
    
    const orderItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      size,
      priceKind,
      basePrice: price,
      quantity: 1,
      extras: [],
      modifiers: []
    };

    onProductSelected(orderItem);
    setAddedCount(prev => prev + 1);
    
    // Show success toast
    toast({
      title: "Producto agregado",
      description: `${product.name} (${size}, ${priceKind === 'combo' ? 'Combo' : 'Solo'})`,
      duration: 2000,
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Seleccionar Producto</span>
            {addedCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                {addedCount} agregado{addedCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">Cargando productos...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <Badge variant="secondary">Activo</Badge>
                        </div>
                      </div>

                      {/* Combo Prices */}
                      {product.prices.combo && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-primary">Combo</h5>
                          <div className="grid grid-cols-3 gap-2">
                            {(['simple', 'doble', 'triple'] as const).map((size) => {
                              const price = product.prices.combo?.[size];
                              if (!price) return null;
                              
                              return (
                                <Button
                                  key={size}
                                  variant="outline"
                                  size="sm"
                                  className="flex flex-col h-auto p-2"
                                  onClick={() => handleProductSelect(product, size, 'combo')}
                                >
                                  <span className="capitalize text-xs">{size}</span>
                                  <span className="font-medium">{formatPrice(price)}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Only Prices */}
                      {product.prices.only && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-secondary">Solo</h5>
                          <div className="grid grid-cols-3 gap-2">
                            {(['simple', 'doble', 'triple'] as const).map((size) => {
                              const price = product.prices.only?.[size];
                              if (!price) return null;
                              
                              return (
                                <Button
                                  key={size}
                                  variant="outline"
                                  size="sm"
                                  className="flex flex-col h-auto p-2"
                                  onClick={() => handleProductSelect(product, size, 'only')}
                                >
                                  <span className="capitalize text-xs">{size}</span>
                                  <span className="font-medium">{formatPrice(price)}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron productos
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="gap-2">
            <X className="w-4 h-4" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}