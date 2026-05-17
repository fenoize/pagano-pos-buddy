import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { OrderItem } from '@/types';
import { Search, X, ShoppingCart } from 'lucide-react';
import { toast } from "sonner";
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

  const handleProductSelect = (product: Product, size: 'simple' | 'doble' | 'triple' | 'unico', priceKind: 'combo' | 'only' | 'base', price: number) => {
    const orderItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      size: size === 'unico' ? 'simple' : size,
      priceKind: priceKind === 'base' ? 'only' : priceKind,
      basePrice: price,
      quantity: 1,
      extras: [],
      modifiers: []
    };

    onProductSelected(orderItem);
    setAddedCount(prev => prev + 1);
    
    // Show success toast
    toast.success("Producto agregado", { description: `${product.name}${size !== 'unico' ? ` (${size}, ${priceKind === 'combo' ? 'Combo' : 'Solo'})` : ''}`, duration: 2000 });
  };

  // Check if product has combo/only prices with sizes
  const hasComboSizes = (product: Product) => {
    return product.prices?.combo && (product.prices.combo.simple || product.prices.combo.doble || product.prices.combo.triple);
  };

  const hasOnlySizes = (product: Product) => {
    return product.prices?.only && (product.prices.only.simple || product.prices.only.doble || product.prices.only.triple);
  };

  // Get base/simple price for products without size structure
  const getBasePrice = (product: Product): number | null => {
    // Direct price at root level
    if (typeof product.prices === 'number') return product.prices;
    // Base price field
    if (product.prices?.base) return product.prices.base;
    // Price field  
    if (product.prices?.price) return product.prices.price;
    // Simple price without combo/only structure
    if (product.prices?.simple && typeof product.prices.simple === 'number') return product.prices.simple;
    return null;
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
                      {hasComboSizes(product) && (
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
                                  onClick={() => handleProductSelect(product, size, 'combo', price)}
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
                      {hasOnlySizes(product) && (
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
                                  onClick={() => handleProductSelect(product, size, 'only', price)}
                                >
                                  <span className="capitalize text-xs">{size}</span>
                                  <span className="font-medium">{formatPrice(price)}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Base/Single Price - for products without combo/only structure */}
                      {!hasComboSizes(product) && !hasOnlySizes(product) && (
                        <div className="space-y-2">
                          {getBasePrice(product) !== null ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full h-auto p-3"
                              onClick={() => handleProductSelect(product, 'unico', 'base', getBasePrice(product)!)}
                            >
                              <span className="font-medium">Agregar - {formatPrice(getBasePrice(product)!)}</span>
                            </Button>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Producto sin precio configurado
                            </p>
                          )}
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