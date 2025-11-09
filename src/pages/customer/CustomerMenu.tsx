import { useState, useEffect, useMemo } from 'react';
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
import { ProductCustomizationModal } from '@/components/pos/ProductCustomizationModal';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  image_url?: string;
  category?: string;
  active: boolean;
  show_in_app?: boolean;
  categories?: Array<{ id: string; name: string; }>;
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

  useEffect(() => {
    fetchData();
  }, []);

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
            .filter((cat: any) => cat.active && cat.show_in_app) || []
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
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

        {/* Products grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay productos disponibles en este momento
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="aspect-square bg-muted relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Flame className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Customization Modal */}
      {selectedProduct && (
        <ProductCustomizationModal
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
