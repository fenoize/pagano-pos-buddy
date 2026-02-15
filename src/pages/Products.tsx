import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, ToggleLeft, ToggleRight, Image as ImageIcon, Trash2, Filter, ArrowUpDown, Search } from 'lucide-react';
import { ProductEditModal } from '@/components/pos/ProductEditModal';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [productVariants, setProductVariants] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados para filtros y ordenamiento
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

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
      
      // Obtener variantes para todos los productos
      await fetchProductVariants(productsWithCategories.map(p => p.id));
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

  const fetchProductVariants = async (productIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('product_variant_options')
        .select(`
          *,
          variant:category_variants(*)
        `)
        .in('product_id', productIds)
        .eq('active', true)
        .order('variant(display_order)');

      if (error) throw error;

      // Agrupar variantes por producto
      const variantsByProduct: Record<string, any[]> = {};
      (data || []).forEach(variant => {
        if (!variantsByProduct[variant.product_id]) {
          variantsByProduct[variant.product_id] = [];
        }
        variantsByProduct[variant.product_id].push(variant);
      });

      setProductVariants(variantsByProduct);
    } catch (error) {
      console.error('Error fetching product variants:', error);
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

  const deleteProduct = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;
      
      fetchProducts();
      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
    }
  };

  // Lógica de filtrado y ordenamiento
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = product.name.toLowerCase().includes(searchLower);
        const categoryMatch = product.categories?.some(cat => 
          cat.name.toLowerCase().includes(searchLower)
        );
        if (!nameMatch && !categoryMatch) return false;
      }
      
      // Filtro por estado
      if (statusFilter === 'active' && !product.active) return false;
      if (statusFilter === 'inactive' && product.active) return false;
      
      // Filtro por categoría
      if (categoryFilter !== 'all') {
        const hasCategory = product.categories?.some(cat => cat.id === categoryFilter);
        if (!hasCategory) return false;
      }
      
      return true;
    });

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          const aVariants = productVariants[a.id] || [];
          const bVariants = productVariants[b.id] || [];
          const minPriceA = aVariants.length > 0 ? Math.min(...aVariants.map(v => v.price || 0)) : 0;
          const minPriceB = bVariants.length > 0 ? Math.min(...bVariants.map(v => v.price || 0)) : 0;
          return minPriceA - minPriceB;
        case 'price-desc':
          const aVariantsDesc = productVariants[a.id] || [];
          const bVariantsDesc = productVariants[b.id] || [];
          const maxPriceA = aVariantsDesc.length > 0 ? Math.max(...aVariantsDesc.map(v => v.price || 0)) : 0;
          const maxPriceB = bVariantsDesc.length > 0 ? Math.max(...bVariantsDesc.map(v => v.price || 0)) : 0;
          return maxPriceB - maxPriceA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchTerm, statusFilter, categoryFilter, sortBy, productVariants]);

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
      <div className="flex justify-end items-center">
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar productos por nombre o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Controles de filtros y ordenamiento */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm">Estado:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Categoría:</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4" />
          <label className="text-sm">Ordenar:</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Nombre A-Z</SelectItem>
              <SelectItem value="name-desc">Nombre Z-A</SelectItem>
              <SelectItem value="price-asc">Precio: Menor a Mayor</SelectItem>
              <SelectItem value="price-desc">Precio: Mayor a Menor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ProductEditModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        product={editingProduct}
        onProductUpdated={fetchProducts}
      />

      <div className="grid gap-4">
        {filteredAndSortedProducts.map((product) => {
          // Filter variants to only show those belonging to the product's assigned categories
          const assignedCategoryIds = new Set((product.categories || []).map((c: any) => c.id));
          const relevantVariants = (productVariants[product.id] || []).filter(
            (v: any) => assignedCategoryIds.has(v.variant?.category_id)
          );
          return (
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
                  
                  {/* Variantes configuradas */}
                  <div>
                    <h4 className="font-medium text-muted-foreground mb-2">Variantes Configuradas</h4>
                    {relevantVariants.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {relevantVariants
                          .filter(variant => variant.variant?.name !== 'Default')
                          .map((variant) => (
                          <div
                            key={variant.id}
                            className={`p-3 rounded-lg border text-sm ${
                              variant.is_enabled && variant.price && variant.price >= 500
                                ? 'bg-background border-border' 
                                : 'bg-muted border-muted-foreground/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{variant.variant?.name}</span>
                              {variant.is_default && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  Defecto
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={
                                variant.is_enabled && variant.price && variant.price >= 500
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }>
                                {variant.price && variant.price > 0 
                                  ? formatPrice(variant.price)
                                  : "Sin precio"
                                }
                              </span>
                              <Badge 
                                variant={
                                  variant.is_enabled && variant.price && variant.price >= 500
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {variant.is_enabled && variant.price && variant.price >= 500
                                  ? "Activa"
                                  : "Inactiva"
                                }
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        <p>Sin variantes configuradas</p>
                        <p className="text-xs mt-1">
                          Ve a la pestaña "Variantes" en edición para configurar precios por variante
                        </p>
                      </div>
                    )}
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Se eliminará permanentemente el producto "{product.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteProduct(product)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {filteredAndSortedProducts.length === 0 && products.length > 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No se encontraron productos con los filtros aplicados</p>
          </CardContent>
        </Card>
      )}

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