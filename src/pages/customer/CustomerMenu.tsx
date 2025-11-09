import { useState, useEffect } from 'react';
import { configuredSupabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Flame } from 'lucide-react';
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
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await configuredSupabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch products that are active and visible in app
      const { data: productsData, error: productsError } = await configuredSupabase
        .from('products')
        .select('*, categories(*)')
        .eq('active', true)
        .eq('show_in_app', true)
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      setCategories(categoriesData || []);
      setProducts(productsData || []);
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

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => {
        // Filtrar por categoría en el array de relaciones
        return p.categories?.some(cat => cat.id === selectedCategory);
      });

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
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
    <div className="min-h-screen pb-20 bg-background">
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

        {/* Category filters */}
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
