import { useQuery } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';

export interface MenuProduct {
  id: string;
  name: string;
  image_url?: string;
  category?: string;
  active: boolean;
  show_in_app?: boolean;
  prices?: any;
  comboPrice?: number | null;
  categories: Array<{ id: string; name: string }>;
  variants: Array<{ price: number; active: boolean }>;
}

export interface MenuCategory {
  id: string;
  name: string;
  active: boolean;
  display_order: number;
}

interface CustomerMenuData {
  products: MenuProduct[];
  categories: MenuCategory[];
}

/**
 * Calcula el precio mínimo de un producto
 */
export function getProductMinPrice(product: MenuProduct): number | null {
  const prices: number[] = [];
  
  // Sistema nuevo de variantes
  if (product.variants && product.variants.length > 0) {
    const variantPrices = product.variants
      .filter(v => v.active)
      .map(v => v.price)
      .filter(p => p > 0);
    prices.push(...variantPrices);
  }
  
  // Sistema legacy
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
  
  // Sistema combo
  if (product.comboPrice && product.comboPrice > 0) {
    prices.push(product.comboPrice);
  }

  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * Hook para obtener productos y categorías del menú del cliente.
 * Usa React Query para cachear los datos y evitar recargas innecesarias.
 */
export function useCustomerMenuProducts() {
  return useQuery({
    queryKey: ['customer-menu-products'],
    queryFn: async (): Promise<CustomerMenuData> => {
      // Fetch categorías visibles en app
      const { data: categoriesData, error: categoriesError } = await configuredSupabase
        .from('categories')
        .select('id, name, active, display_order, show_in_app')
        .eq('active', true)
        .eq('show_in_app', true)
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch productos activos y visibles en app
      const { data: productsData, error: productsError } = await configuredSupabase
        .from('products')
        .select(`
          id,
          name,
          image_url,
          category,
          active,
          show_in_app,
          prices,
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
          ),
          combo_products(
            base_price,
            pricing_mode,
            active
          )
        `)
        .eq('active', true)
        .eq('show_in_app', true)
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      const categories: MenuCategory[] = categoriesData || [];
      
      // Transformar productos y filtrar solo los que tienen categoría visible y precio válido
      const products: MenuProduct[] = (productsData || [])
        .map((product: any) => {
          const transformedProduct: MenuProduct = {
            id: product.id,
            name: product.name,
            image_url: product.image_url,
            category: product.category,
            active: product.active,
            show_in_app: product.show_in_app,
            prices: product.prices,
            categories: (product.product_categories || [])
              .map((pc: any) => ({
                id: pc.categories?.id,
                name: pc.categories?.name,
                show_in_app: pc.categories?.show_in_app,
                active: pc.categories?.active
              }))
              .filter((cat: any) => cat.active && cat.show_in_app),
            variants: product.product_variant_options || [],
            comboPrice: (() => {
              const combo = product.combo_products;
              if (!combo) return null;
              // PostgREST one-to-one returns object, not array
              if (Array.isArray(combo)) {
                const activeCombo = combo.find((c: any) => c.active);
                return activeCombo ? activeCombo.base_price : null;
              }
              return combo.active ? combo.base_price : null;
            })()
          };
          return transformedProduct;
        })
        // Solo incluir productos con al menos una categoría visible
        .filter(product => product.categories && product.categories.length > 0);

      return { products, categories };
    },
    staleTime: 1000 * 60 * 10, // 10 minutos de caché
    gcTime: 1000 * 60 * 30, // 30 minutos en memoria
    refetchOnWindowFocus: false,
  });
}
