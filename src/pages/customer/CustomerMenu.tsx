import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, Flame, Search, X } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { StoreStatusBanner } from '@/components/customer/StoreStatusBanner';
import { OptimizedProductImage } from '@/components/customer/OptimizedProductImage';
import { useCart } from '@/contexts/CartContext';
import { CustomerProductCustomization } from '@/components/customer/CustomerProductCustomization';
import { useCustomerMenuProducts, getProductMinPrice, MenuProduct, MenuCategory } from '@/hooks/useCustomerMenuProducts';

export default function CustomerMenu() {
  const { data, isLoading } = useCustomerMenuProducts();
  const products = data?.products || [];
  const categories = data?.categories || [];
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep linking: abrir producto automáticamente si viene desde una promoción
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0 && !isLoading) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        setShowCustomization(true);
        // Limpiar query param después de abrir
        searchParams.delete('product');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, products, isLoading]);

  // Formatear precio en CLP
  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Ver opciones';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const sortByPrice = (a: MenuProduct, b: MenuProduct) => {
    const priceA = getProductMinPrice(a);
    const priceB = getProductMinPrice(b);
    if (priceA === null && priceB === null) return 0;
    if (priceA === null) return 1;
    if (priceB === null) return -1;
    return priceA - priceB;
  };

  const handleProductClick = (product: MenuProduct) => {
    setSelectedProduct(product);
    setShowCustomization(true);
  };

  const handleAddToCart = (item: any) => {
    addItem(item);
    setShowCustomization(false);
  };

  // Filtrado avanzado con búsqueda y categorías
  const filteredProducts = useMemo(() => {
    // Los productos ya vienen filtrados con precio válido desde el hook
    let filtered = [...products];

    // Filtrar por búsqueda si hay término de búsqueda (mínimo 2 caracteres)
    if (searchTerm.trim().length >= 2) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por categoría solo si no hay búsqueda activa
    if (searchTerm.trim().length < 2 && selectedCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.categories?.some((cat: { id: string }) => cat.id === selectedCategory)
      );
    }

    // Ordenar por precio de menor a mayor
    filtered.sort(sortByPrice);

    return filtered;
  }, [products, searchTerm, selectedCategory]);

  // Agrupar productos por categoría con "Promociones" primero
  const groupedProducts = useMemo(() => {
    if (searchTerm.trim().length >= 2 || selectedCategory !== 'all') {
      // Si hay búsqueda o filtro, no agrupar
      return null;
    }

    const groups: { category: MenuCategory; products: MenuProduct[] }[] = [];
    const productsByCategory = new Map<string, MenuProduct[]>();

    // Los productos ya vienen filtrados con precio válido desde el hook
    const productsWithPrice = [...products];

    // Agrupar productos por categoría
    productsWithPrice.forEach(product => {
      product.categories?.forEach(cat => {
        if (!productsByCategory.has(cat.id)) {
          productsByCategory.set(cat.id, []);
        }
        const existing = productsByCategory.get(cat.id)!;
        if (!existing.find(p => p.id === product.id)) {
          existing.push(product);
        }
      });
    });

    // Ordenar categorías: Promociones primero, luego por display_order
    const sortedCategories = [...categories].sort((a, b) => {
      const aIsPromo = a.name.toLowerCase().includes('promoci');
      const bIsPromo = b.name.toLowerCase().includes('promoci');
      if (aIsPromo && !bIsPromo) return -1;
      if (!aIsPromo && bIsPromo) return 1;
      return 0; // Mantener orden de display_order de la DB
    });

    sortedCategories.forEach(category => {
      const categoryProducts = productsByCategory.get(category.id) || [];
      if (categoryProducts.length > 0) {
        // Ordenar productos dentro de cada categoría por precio (menor a mayor)
        categoryProducts.sort(sortByPrice);
        groups.push({ category, products: categoryProducts });
      }
    });

    return groups;
  }, [products, categories, searchTerm, selectedCategory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Si hay búsqueda activa, cambiar a "all" para mostrar resultados de todas las categorías
    if (e.target.value.trim().length >= 2) {
      setSelectedCategory('all');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className="customer-app min-h-screen pb-20 bg-background">
        <div className="max-w-screen-xl mx-auto p-4 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
        <CustomerBottomNav />
      </div>
    );
  }

  return (
    <div className="customer-app min-h-screen pb-20 bg-background">
      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Flame className="h-8 w-8 text-primary" />
            Nuestro Menú
          </h1>
          <p className="text-muted-foreground mt-1">
            Elige tu hamburguesa favorita
          </p>
        </div>

        {/* Store Status Banner */}
        <StoreStatusBanner />

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-10 py-6 text-base rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Search Results Info */}
        {searchTerm.trim().length >= 2 && (
          <div className="text-sm text-muted-foreground px-1">
            {filteredProducts.length > 0 
              ? `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''} encontrado${filteredProducts.length !== 1 ? 's' : ''} para "${searchTerm}"`
              : `No se encontraron productos para "${searchTerm}"`
            }
          </div>
        )}

        {/* Category filters - Solo mostrar si no hay búsqueda activa */}
        {searchTerm.trim().length < 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap px-4 py-2"
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap px-4 py-2"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Badge>
          ))}
          </div>
        )}

        {/* Products list - Grouped by category or flat list */}
        {groupedProducts && searchTerm.trim().length < 2 && selectedCategory === 'all' ? (
          // Vista agrupada por categoría
          <div className="space-y-8">
            {groupedProducts.map(({ category, products: categoryProducts }) => (
              <div key={category.id}>
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  {category.name}
                </h2>
                <div className="flex flex-col gap-4">
                  {categoryProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="flex">
                        {/* Product Image - Left side */}
                        <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-muted relative">
                          <OptimizedProductImage
                            src={product.image_url}
                            alt={product.name}
                          />
                        </div>
                        
                        {/* Product Info - Right side */}
                        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-2 mb-1">
                              {product.name}
                            </h3>
                            {(product as any).description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {(product as any).description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <p className="text-primary font-bold text-lg">
                              {formatPrice(getProductMinPrice(product))}
                            </p>
                            <Button
                              size="icon"
                              className="rounded-full h-10 w-10 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(product);
                              }}
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay productos disponibles en este momento
            </CardContent>
          </Card>
        ) : (
          // Vista plana (búsqueda o filtro de categoría activo)
          <div className="flex flex-col gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="flex">
                  {/* Product Image - Left side */}
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 bg-muted relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Flame className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info - Right side */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-2 mb-1">
                        {product.name}
                      </h3>
                      {(product as any).description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {(product as any).description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-primary font-bold text-lg">
                        {formatPrice(getProductMinPrice(product))}
                      </p>
                      <Button
                        size="icon"
                        className="rounded-full h-10 w-10 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProductClick(product);
                        }}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customization Drawer */}
      {selectedProduct && (
        <CustomerProductCustomization
          isOpen={showCustomization}
          onClose={() => setShowCustomization(false)}
          product={selectedProduct as any}
          onAddToCart={handleAddToCart}
        />
      )}

      <CustomerBottomNav />
    </div>
  );
}
