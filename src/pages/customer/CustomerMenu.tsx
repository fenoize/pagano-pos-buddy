import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { configuredSupabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, Flame, Search, X } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { StoreStatusBanner } from '@/components/customer/StoreStatusBanner';
import { useCart } from '@/contexts/CartContext';
import { CustomerProductCustomization } from '@/components/customer/CustomerProductCustomization';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  image_url?: string;
  category?: string;
  active: boolean;
  show_in_app?: boolean;
  categories?: Array<{ id: string; name: string; }>;
  prices?: any; // JSON de la DB con estructura { combo: {...}, only: {...} }
  variants?: Array<{
    price: number;
    active: boolean;
  }>;
}

interface Category {
  id: string;
  name: string;
  active: boolean;
}

export default function CustomerMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchData();
  }, []);

  // Deep linking: abrir producto automáticamente si viene desde una promoción
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && products.length > 0 && !loading) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
        setShowCustomization(true);
        // Limpiar query param después de abrir
        searchParams.delete('product');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, products, loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories visible in app
      const { data: categoriesData, error: categoriesError } = await configuredSupabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .eq('show_in_app', true)
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch products that are active and visible in app
      const { data: productsData, error: productsError } = await configuredSupabase
        .from('products')
        .select(`
          *,
          product_categories(
            category_id,
            categories(
              id,
              name,
              show_in_app,
              active
            )
          ),
          product_variant_options(
            id,
            price,
            active
          )
        `)
        .eq('active', true)
        .eq('show_in_app', true)
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      setCategories(categoriesData || []);
      
      // Transform products data and filter by category visibility
      const transformedProducts = productsData
        ?.map(product => ({
          ...product,
          categories: product.product_categories
            ?.map((pc: any) => ({
              id: pc.categories?.id,
              name: pc.categories?.name,
              show_in_app: pc.categories?.show_in_app,
              active: pc.categories?.active
            }))
            .filter((cat: any) => cat.active && cat.show_in_app) || [],
          variants: product.product_variant_options || []
        }))
        // Only include products that have at least one visible category
        .filter(product => product.categories && product.categories.length > 0) || [];
      
      setProducts(transformedProducts);
    } catch (error: any) {
      console.error('Error fetching menu data:', error);
      toast.error('Error al cargar el menú');
    } finally {
      setLoading(false);
    }
  };

  // Calcular precio mínimo de un producto
  const getMinPrice = (product: Product): number | null => {
    const prices: number[] = [];
    
    // Revisar sistema nuevo de variantes
    if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants
        .filter(v => v.active)
        .map(v => v.price)
        .filter(p => p > 0);
      prices.push(...variantPrices);
    }
    
    // Revisar sistema legacy
    if (product.prices && typeof product.prices === 'object') {
      const priceObj = product.prices as any;
      if (priceObj.combo) {
        Object.values(priceObj.combo).forEach((price: any) => {
          if (typeof price === 'number' && price > 0) prices.push(price);
        });
      }
      if (priceObj.only) {
        Object.values(priceObj.only).forEach((price: any) => {
          if (typeof price === 'number' && price > 0) prices.push(price);
        });
      }
    }
    
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  // Formatear precio en CLP
  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Consultar';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowCustomization(true);
  };

  const handleAddToCart = (item: any) => {
    addItem(item);
    setShowCustomization(false);
  };

  // Filtrado avanzado con búsqueda y categorías
  const filteredProducts = useMemo(() => {
    let filtered = products;

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
        p.categories?.some(cat => cat.id === selectedCategory)
      );
    }

    return filtered;
  }, [products, searchTerm, selectedCategory]);

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

  if (loading) {
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

        {/* Products list - Single column horizontal cards */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay productos disponibles en este momento
            </CardContent>
          </Card>
        ) : (
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
                        {formatPrice(getMinPrice(product))}
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
