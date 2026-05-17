import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Save, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import { useVariantGroups, VariantGroupOptionRow } from "@/hooks/useVariantGroups";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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

interface ProductVariantGroup {
  id: string;
  product_id: string;
  group_id: string;
  group: {
    id: string;
    name: string;
    options: VariantGroupOptionRow[];
  } | null;
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
  const [productGroups, setProductGroups] = useState<ProductVariantGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<Record<string, string>>({});
  const { materials } = useRawMaterials();
  const { getProductGroups } = useVariantGroups();

  const fetchData = useCallback(async () => {
    if (!productId || categoryIds.length === 0) return;

    try {
      setLoading(true);

      const [variantsRes, optionsRes, groups] = await Promise.all([
        supabase
          .from("category_variants")
          .select("*")
          .in("category_id", categoryIds)
          .eq("active", true)
          .order("display_order"),
        supabase
          .from("product_variant_options")
          .select("*, category_variant:category_variants(*)")
          .eq("product_id", productId),
        getProductGroups(productId),
      ]);

      if (variantsRes.error) throw variantsRes.error;
      if (optionsRes.error) throw optionsRes.error;

      setAvailableVariants(variantsRes.data || []);
      setProductVariants((optionsRes.data || []) as ProductVariantOption[]);
      setProductGroups(groups || []);

      const initialBulkPrices: Record<string, string> = {};
      (optionsRes.data || []).forEach((option: any) => {
        if (option.price !== null && option.price > 0) {
          initialBulkPrices[option.id] = option.price.toString();
        }
      });
      setBulkPrices(initialBulkPrices);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error", { description: "Error al cargar las variantes" });
    } finally {
      setLoading(false);
    }
  }, [productId, categoryIds]);

  useEffect(() => {
    if (productId && categoryIds.length > 0) {
      fetchData();
    }
  }, [productId, categoryIds, fetchData]);

  const toggleVariant = async (categoryVariantId: string, enabled: boolean) => {
    if (!productId) return;
    try {
      if (enabled) {
        const { error } = await supabase.from("product_variant_options").insert({
          product_id: productId, category_variant_id: categoryVariantId,
          price: 0, is_default: false, active: true, is_enabled: false,
        });
        if (error) throw error;
        toast.success("Variante agregada", { description: "Recuerda asignar un precio válido (≥ $500)" });
      } else {
        const { error } = await supabase.from("product_variant_options").delete()
          .eq("product_id", productId).eq("category_variant_id", categoryVariantId);
        if (error) throw error;
        toast.success("Variante eliminada");
      }
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Error al actualizar la variante" });
    }
  };

  const updateVariantPrice = async (variantOptionId: string, price: string) => {
    const numericPrice = parseInt(price.replace(/\D/g, ''));
    if (isNaN(numericPrice) || numericPrice < 500) {
      toast.error("Precio inválido", { description: "El precio debe ser mínimo $500" });
      return;
    }
    try {
      const { error } = await supabase.from("product_variant_options")
        .update({ price: numericPrice, is_enabled: true }).eq("id", variantOptionId);
      if (error) throw error;
      toast.success("Precio actualizado");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Error al actualizar el precio" });
    }
  };

  const setDefaultVariant = async (variantOptionId: string) => {
    if (!productId) return;
    try {
      await supabase.from("product_variant_options").update({ is_default: false }).eq("product_id", productId);
      const { error } = await supabase.from("product_variant_options").update({ is_default: true }).eq("id", variantOptionId);
      if (error) throw error;
      toast.success("Variante por defecto actualizada");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error");
    }
  };

  const updateVariantRawMaterial = async (variantOptionId: string, rawMaterialId: string | null) => {
    try {
      const { error } = await supabase.from("product_variant_options")
        .update({ raw_material_id: rawMaterialId === "none" ? null : rawMaterialId })
        .eq("id", variantOptionId);
      if (error) throw error;
      toast.success("Materia prima actualizada");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error");
    }
  };

  const saveBulkPrices = async () => {
    const updates = Object.entries(bulkPrices).map(([id, priceStr]) => {
      const price = parseInt(priceStr.replace(/\D/g, ''));
      return { id, price: isNaN(price) || price < 500 ? 0 : price, is_enabled: !isNaN(price) && price >= 500 };
    });
    try {
      for (const update of updates) {
        const { error } = await supabase.from("product_variant_options")
          .update({ price: update.price, is_enabled: update.is_enabled }).eq("id", update.id);
        if (error) throw error;
      }
      toast.success("Precios actualizados");
      setBulkEditMode(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Error");
    }
  };

  const toggleBulkEditMode = async (enabled: boolean) => {
    if (enabled) {
      const missingVariants = availableVariants.filter(variant =>
        variant.name !== "Default" &&
        !productVariants.some(pv => pv.category_variant_id === variant.id)
      );
      if (missingVariants.length > 0) {
        try {
          const inserts = missingVariants.map(v => ({
            product_id: productId, category_variant_id: v.id,
            price: 0, is_default: false, active: true, is_enabled: false,
          }));
          const { error } = await supabase.from("product_variant_options").insert(inserts);
          if (error) throw error;
          await fetchData();
        } catch (error) {
          console.error(error);
          toast.error("Error");
          return;
        }
      }
    }
    setBulkEditMode(enabled);
  };

  const hasGroups = productGroups.length > 0 && productGroups.some(pg => pg.group && pg.group.options.length > 0);

  const enabledBaseVariants = productVariants.filter(
    (variant) => variant.is_enabled && variant.active && variant.price !== null && variant.price >= 500
  );
  const pricedGroupOptions = productGroups
    .filter(pg => pg.group)
    .flatMap(pg => pg.group!.options.map(option => ({ ...option, groupName: pg.group!.name })));

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);

  const getVariantStatus = (option: ProductVariantOption) => {
    if (!option.active) return { color: "secondary", text: "Inactiva" };
    if (!option.is_enabled) return { color: "destructive", text: "Sin precio" };
    if (option.price === null || option.price === 0 || option.price < 500) return { color: "destructive", text: "Precio inválido" };
    return { color: "default", text: "Activa" };
  };

  if (!productId) {
    return (
      <Card><CardContent className="p-6">
        <p className="text-center text-muted-foreground">Guarda el producto primero para gestionar variantes</p>
      </CardContent></Card>
    );
  }

  if (categoryIds.length === 0) {
    return (
      <Card><CardContent className="p-6">
        <p className="text-center text-muted-foreground">Selecciona al menos una categoría para gestionar variantes</p>
      </CardContent></Card>
    );
  }

  if (loading) {
    return (
      <Card><CardContent className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-2">Cargando variantes...</span>
        </div>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
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

      {/* ── Read-only assigned groups (Proteína, etc.) — deltas se editan en Configuración → Grupos ── */}
      {hasGroups && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Grupos asignados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cada grupo se elige por separado del tamaño. El precio final del producto es{" "}
              <strong>precio del tamaño + suma de deltas de las opciones elegidas</strong>.
              Los deltas se editan en <strong>Configuración → Grupos de variantes</strong>.
            </p>
            <div className="space-y-2">
              {productGroups.filter(pg => pg.group).map(pg => (
                <div key={pg.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{pg.group!.name}</Badge>
                  {pg.group!.options.map(o => (
                    <Badge key={o.id} variant="secondary" className="text-xs">
                      {o.name}{o.price_delta && o.price_delta > 0 ? ` (+${formatPrice(o.price_delta)})` : ""}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasGroups && enabledBaseVariants.length > 0 && pricedGroupOptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vista previa de precios finales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Referencia automática: precio base del tamaño + adicional de proteína. No crea combinaciones nuevas.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {enabledBaseVariants.flatMap(variant =>
                pricedGroupOptions.map(option => (
                  <div key={`${variant.id}-${option.id}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>{variant.category_variant?.name} + {option.name}</span>
                    <strong>{formatPrice((variant.price || 0) + (option.price_delta || 0))}</strong>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tamaños y precio base (1 fila por tamaño) ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Tamaños y precio base</h3>
        <div className="space-x-2">
          {bulkEditMode ? (
            <>
              <Button variant="outline" onClick={() => toggleBulkEditMode(false)}>Cancelar</Button>
              <Button onClick={saveBulkPrices}>
                <Save className="h-4 w-4 mr-2" /> Guardar Precios
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBulkEditMode(true); }}>
              <Edit2 className="h-4 w-4 mr-2" /> Editar Precios en Lote
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tamaño</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Precio base</TableHead>
              <TableHead>Materia Prima</TableHead>
              <TableHead>Por Defecto</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {availableVariants.map((variant) => {
              const existingOption = productVariants.find(pv => pv.category_variant_id === variant.id);
              const status = existingOption ? getVariantStatus(existingOption) : null;

              return (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">
                    {variant.name}
                    {variant.name === "Default" && <Badge variant="secondary" className="ml-2">Oculta</Badge>}
                  </TableCell>
                  <TableCell>
                    {existingOption ? (
                      <Badge variant={status?.color as any}>{status?.text}</Badge>
                    ) : (
                      <Badge variant="outline">No configurada</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {existingOption ? (
                      bulkEditMode ? (
                        <Input type="text" placeholder="$500" className="w-32"
                          value={bulkPrices[existingOption.id] || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            setBulkPrices(prev => ({ ...prev, [existingOption.id]: value }));
                          }}
                        />
                      ) : (
                        <Input
                          type="text"
                          className="w-32"
                          defaultValue={existingOption.price && existingOption.price > 0 ? existingOption.price.toString() : ""}
                          placeholder="$500"
                          onBlur={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val && parseInt(val) >= 500) updateVariantPrice(existingOption.id, val);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        />
                      )
                    ) : (
                      bulkEditMode ? (
                        <Button variant="outline" size="sm" onClick={() => toggleVariant(variant.id, true)}>
                          Agregar Variante
                        </Button>
                      ) : "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {existingOption && (
                      <Select value={existingOption.raw_material_id || "none"}
                        onValueChange={(value) => updateVariantRawMaterial(existingOption.id, value)}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Sin vincular" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vincular</SelectItem>
                          {materials.map((mat) => (
                            <SelectItem key={mat.id} value={mat.id}>{mat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {existingOption && (
                      <Switch checked={existingOption.is_default}
                        onCheckedChange={() => setDefaultVariant(existingOption.id)}
                        disabled={!existingOption.is_enabled || variant.name === "Default"} />
                    )}
                  </TableCell>
                  <TableCell>
                    {variant.name !== "Default" && (
                      <Switch checked={!!existingOption}
                        onCheckedChange={(checked) => toggleVariant(variant.id, checked)} />
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
