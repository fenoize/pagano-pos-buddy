import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Save, Edit2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryVariant {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
  active: boolean;
}

interface ProductVariantOption {
  id: string;
  product_id: string;
  category_variant_id: string;
  price: number | null;
  is_default: boolean;
  active: boolean;
  is_enabled: boolean;
  raw_material_id: string | null;
  category_variant?: CategoryVariant;
}

interface ProductVariantsManagementEnhancedProps {
  productId?: string;
  categoryIds?: string[];
}

export default function ProductVariantsManagementEnhanced({
  productId,
  categoryIds = []
}: ProductVariantsManagementEnhancedProps) {
  const [availableVariants, setAvailableVariants] = useState<CategoryVariant[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { materials } = useRawMaterials();

  useEffect(() => {
    if (productId && categoryIds.length > 0) {
      fetchData();
    }
  }, [productId, categoryIds]);

  const fetchData = async () => {
    if (!productId || categoryIds.length === 0) return;

    try {
      setLoading(true);

      // Obtener variantes disponibles de las categorías
      const { data: variantsData, error: variantsError } = await supabase
        .from("category_variants")
        .select("*")
        .in("category_id", categoryIds)
        .eq("active", true)
        .order("display_order");

      if (variantsError) throw variantsError;

      // Obtener opciones de variantes existentes para el producto
      const { data: optionsData, error: optionsError } = await supabase
        .from("product_variant_options")
        .select(`
          *,
          category_variant:category_variants(*)
        `)
        .eq("product_id", productId);

      if (optionsError) throw optionsError;

      setAvailableVariants(variantsData || []);
      setProductVariants(optionsData || []);

      // Inicializar precios para bulk edit
      const initialBulkPrices: Record<string, string> = {};
      (optionsData || []).forEach(option => {
        if (option.price !== null && option.price > 0) {
          initialBulkPrices[option.id] = option.price.toString();
        }
      });
      setBulkPrices(initialBulkPrices);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Error al cargar las variantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVariant = async (categoryVariantId: string, enabled: boolean) => {
    if (!productId) return;

    try {
      if (enabled) {
        // Crear nueva opción de variante
        const { error } = await supabase
          .from("product_variant_options")
          .insert({
            product_id: productId,
            category_variant_id: categoryVariantId,
            price: 0, // Precio 0 como valor por defecto
            is_default: false,
            active: true,
            is_enabled: false, // Deshabilitada hasta asignar precio válido
          });

        if (error) throw error;

        toast({
          title: "Variante agregada",
          description: "Recuerda asignar un precio válido (≥ $500) para habilitarla",
        });
      } else {
        // Eliminar opción de variante
        const { error } = await supabase
          .from("product_variant_options")
          .delete()
          .eq("product_id", productId)
          .eq("category_variant_id", categoryVariantId);

        if (error) throw error;

        toast({
          title: "Variante eliminada",
          description: "La variante ha sido eliminada del producto",
        });
      }

      fetchData(); // Recargar datos
    } catch (error) {
      console.error("Error toggling variant:", error);
      toast({
        title: "Error",
        description: "Error al actualizar la variante",
        variant: "destructive",
      });
    }
  };

  const updateVariantPrice = async (variantOptionId: string, price: string) => {
    const numericPrice = parseInt(price.replace(/\D/g, ''));

    if (isNaN(numericPrice) || numericPrice < 500) {
      toast({
        title: "Precio inválido",
        description: "El precio debe ser mínimo $500",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("product_variant_options")
        .update({
          price: numericPrice,
          is_enabled: true, // Habilitar al asignar precio válido
        })
        .eq("id", variantOptionId);

      if (error) throw error;

      toast({
        title: "Precio actualizado",
        description: "La variante ha sido habilitada",
      });

      fetchData(); // Recargar datos
    } catch (error) {
      console.error("Error updating price:", error);
      toast({
        title: "Error",
        description: "Error al actualizar el precio",
        variant: "destructive",
      });
    }
  };

  const setDefaultVariant = async (variantOptionId: string) => {
    if (!productId) return;

    try {
      // Primero, desmarcar todos como default
      await supabase
        .from("product_variant_options")
        .update({ is_default: false })
        .eq("product_id", productId);

      // Luego, marcar el seleccionado como default
      const { error } = await supabase
        .from("product_variant_options")
        .update({ is_default: true })
        .eq("id", variantOptionId);

      if (error) throw error;

      toast({
        title: "Variante por defecto actualizada",
        description: "La variante seleccionada es ahora la predeterminada",
      });

      fetchData(); // Recargar datos
    } catch (error) {
      console.error("Error setting default:", error);
      toast({
        title: "Error",
        description: "Error al establecer variante por defecto",
        variant: "destructive",
      });
    }
  };

  const updateVariantRawMaterial = async (variantOptionId: string, rawMaterialId: string | null) => {
    try {
      const { error } = await supabase
        .from("product_variant_options")
        .update({
          raw_material_id: rawMaterialId === "none" ? null : rawMaterialId,
        })
        .eq("id", variantOptionId);

      if (error) throw error;

      toast({
        title: "Materia prima actualizada",
        description: rawMaterialId && rawMaterialId !== "none" 
          ? "Variante vinculada a materia prima para inventario"
          : "Vinculación de inventario removida",
      });

      fetchData();
    } catch (error) {
      console.error("Error updating raw material:", error);
      toast({
        title: "Error",
        description: "Error al actualizar materia prima",
        variant: "destructive",
      });
    }
  };

  const saveBulkPrices = async () => {
    const updates = Object.entries(bulkPrices).map(([id, priceStr]) => {
      const price = parseInt(priceStr.replace(/\D/g, ''));
      return {
        id,
        price: isNaN(price) || price < 500 ? 0 : price,
        is_enabled: !isNaN(price) && price >= 500,
      };
    });

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from("product_variant_options")
          .update({
            price: update.price,
            is_enabled: update.is_enabled,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Precios actualizados",
        description: "Los precios han sido actualizados en lote",
      });

      setBulkEditMode(false);
      fetchData();
    } catch (error) {
      console.error("Error saving bulk prices:", error);
      toast({
        title: "Error",
        description: "Error al guardar los precios",
        variant: "destructive",
      });
    }
  };

  const toggleBulkEditMode = async (enabled: boolean) => {
    if (enabled) {
      // Crear automáticamente opciones de variante faltantes
      const missingVariants = availableVariants.filter(variant => 
        variant.name !== "Default" && 
        !productVariants.some(pv => pv.category_variant_id === variant.id)
      );

      if (missingVariants.length > 0) {
        try {
          const variantInserts = missingVariants.map(variant => ({
            product_id: productId,
            category_variant_id: variant.id,
            price: 0, // Precio 0 como valor por defecto
            is_default: false,
            active: true,
            is_enabled: false,
          }));

          const { error } = await supabase
            .from("product_variant_options")
            .insert(variantInserts);

          if (error) throw error;
          
          await fetchData(); // Recargar datos
        } catch (error) {
          console.error("Error creating missing variants:", error);
          toast({
            title: "Error",
            description: "Error al crear variantes faltantes",
            variant: "destructive",
          });
          return;
        }
      }
    }
    setBulkEditMode(enabled);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const getVariantStatus = (option: ProductVariantOption) => {
    if (!option.active) return { color: "secondary", text: "Inactiva" };
    if (!option.is_enabled) return { color: "destructive", text: "Sin precio" };
    if (option.price === null || option.price === 0 || option.price < 500) return { color: "destructive", text: "Precio inválido" };
    return { color: "default", text: "Activa" };
  };

  if (!productId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Guarda el producto primero para gestionar variantes
          </p>
        </CardContent>
      </Card>
    );
  }

  if (categoryIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Selecciona al menos una categoría para gestionar variantes
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando variantes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen y alertas */}
      {productVariants.some(v => v.is_enabled && (v.price === null || v.price === 0 || v.price < 500)) && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                Hay variantes habilitadas con precios inválidos. Asigna precios ≥ $500 o deshabilítalas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editor en lote */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Variantes del Producto</h3>
        <div className="space-x-2">
          {bulkEditMode ? (
            <>
              <Button variant="outline" onClick={() => toggleBulkEditMode(false)}>
                Cancelar
              </Button>
              <Button onClick={saveBulkPrices}>
                <Save className="h-4 w-4 mr-2" />
                Guardar Precios
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Activating bulk edit mode');
                toggleBulkEditMode(true);
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar Precios en Lote
            </Button>
          )}
        </div>
      </div>

      {/* Tabla de variantes */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variante</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Materia Prima</TableHead>
              <TableHead>Por Defecto</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {availableVariants.map((variant) => {
              const existingOption = productVariants.find(
                (pv) => pv.category_variant_id === variant.id
              );
              const status = existingOption ? getVariantStatus(existingOption) : null;

              return (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">
                    {variant.name}
                    {variant.name === "Default" && (
                      <Badge variant="secondary" className="ml-2">Oculta</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {existingOption ? (
                      <Badge variant={status?.color as any}>
                        {status?.text}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No configurada</Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {existingOption ? (
                      bulkEditMode ? (
                        <Input
                          type="text"
                          placeholder="$500"
                          value={bulkPrices[existingOption.id] || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setBulkPrices(prev => ({
                              ...prev,
                              [existingOption.id]: value
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            if (value) {
                              const numericValue = parseInt(value);
                              const formatted = formatPrice(numericValue);
                              setBulkPrices(prev => ({
                                ...prev,
                                [existingOption.id]: formatted
                              }));
                            }
                          }}
                          className="w-32"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>
                            {existingOption.price && existingOption.price > 0 ? formatPrice(existingOption.price) : "Sin precio"}
                          </span>
                          {(!existingOption.price || existingOption.price === 0 || existingOption.price < 500) && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )
                    ) : (
                      bulkEditMode ? (
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleVariant(variant.id, true)}
                        >
                          Agregar Variante
                        </Button>
                      ) : (
                        "-"
                      )
                    )}
                  </TableCell>

                  <TableCell>
                    {existingOption && (
                      <Switch
                        checked={existingOption.is_default}
                        onCheckedChange={() => setDefaultVariant(existingOption.id)}
                        disabled={!existingOption.is_enabled || variant.name === "Default"}
                      />
                    )}
                  </TableCell>

                  <TableCell>
                    {variant.name !== "Default" && (
                      <Switch
                        checked={!!existingOption}
                        onCheckedChange={(checked) => toggleVariant(variant.id, checked)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}