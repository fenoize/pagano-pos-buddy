import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Save, Edit2, Wand2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRawMaterials } from "@/hooks/useRawMaterials";
import { useVariantGroups, VariantGroupOptionRow } from "@/hooks/useVariantGroups";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
  variant_group_option_id: string | null;
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
  const [generatingCombos, setGeneratingCombos] = useState(false);
  const [basePrice, setBasePrice] = useState("");
  const { toast } = useToast();
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
      setProductVariants(optionsRes.data || []);
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
      toast({ title: "Error", description: "Error al cargar las variantes", variant: "destructive" });
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
        toast({ title: "Variante agregada", description: "Recuerda asignar un precio válido (≥ $500)" });
      } else {
        const { error } = await supabase.from("product_variant_options").delete()
          .eq("product_id", productId).eq("category_variant_id", categoryVariantId);
        if (error) throw error;
        toast({ title: "Variante eliminada" });
      }
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Error al actualizar la variante", variant: "destructive" });
    }
  };

  const updateVariantPrice = async (variantOptionId: string, price: string) => {
    const numericPrice = parseInt(price.replace(/\D/g, ''));
    if (isNaN(numericPrice) || numericPrice < 500) {
      toast({ title: "Precio inválido", description: "El precio debe ser mínimo $500", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("product_variant_options")
        .update({ price: numericPrice, is_enabled: true }).eq("id", variantOptionId);
      if (error) throw error;
      toast({ title: "Precio actualizado" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Error al actualizar el precio", variant: "destructive" });
    }
  };

  const setDefaultVariant = async (variantOptionId: string) => {
    if (!productId) return;
    try {
      await supabase.from("product_variant_options").update({ is_default: false }).eq("product_id", productId);
      const { error } = await supabase.from("product_variant_options").update({ is_default: true }).eq("id", variantOptionId);
      if (error) throw error;
      toast({ title: "Variante por defecto actualizada" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const updateVariantRawMaterial = async (variantOptionId: string, rawMaterialId: string | null) => {
    try {
      const { error } = await supabase.from("product_variant_options")
        .update({ raw_material_id: rawMaterialId === "none" ? null : rawMaterialId })
        .eq("id", variantOptionId);
      if (error) throw error;
      toast({ title: "Materia prima actualizada" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", variant: "destructive" });
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
      toast({ title: "Precios actualizados" });
      setBulkEditMode(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", variant: "destructive" });
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
          toast({ title: "Error", variant: "destructive" });
          return;
        }
      }
    }
    setBulkEditMode(enabled);
  };

  const hasGroups = productGroups.length > 0 && productGroups.some(pg => pg.group && pg.group.options.length > 0);

  const generateCombinations = async () => {
    if (!productId || !hasGroups) return;
    const base = parseInt(basePrice.replace(/\D/g, ''));
    if (isNaN(base) || base < 500) {
      toast({ title: "Precio base inválido", description: "Ingresa un precio base ≥ $500", variant: "destructive" });
      return;
    }

    setGeneratingCombos(true);
    try {
      // Get all group options
      const allGroupOptions = productGroups
        .filter(pg => pg.group)
        .flatMap(pg => pg.group!.options);

      // Get active category variants (non-Default)
      const activeVariants = availableVariants.filter(v => v.name !== "Default");

      if (activeVariants.length === 0) {
        toast({ title: "Sin variantes", description: "No hay variantes de categoría activas", variant: "destructive" });
        setGeneratingCombos(false);
        return;
      }

      // Build combinations: each categoryVariant × each groupOption
      const combos: Array<{
        product_id: string;
        category_variant_id: string;
        variant_group_option_id: string;
        price: number;
        is_default: boolean;
        active: boolean;
        is_enabled: boolean;
      }> = [];

      for (const cv of activeVariants) {
        for (const go of allGroupOptions) {
          // Check if combination already exists
          const exists = productVariants.some(
            pv => pv.category_variant_id === cv.id && pv.variant_group_option_id === go.id
          );
          if (!exists) {
            combos.push({
              product_id: productId,
              category_variant_id: cv.id,
              variant_group_option_id: go.id,
              price: base,
              is_default: false,
              active: true,
              is_enabled: true,
            });
          }
        }
      }

      if (combos.length === 0) {
        toast({ title: "Sin combinaciones nuevas", description: "Todas las combinaciones ya existen" });
        setGeneratingCombos(false);
        return;
      }

      const { error } = await supabase.from("product_variant_options").insert(combos);
      if (error) throw error;

      toast({ title: `${combos.length} combinaciones creadas`, description: "Ahora puedes ajustar los precios individuales" });
      await fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Error al generar combinaciones", variant: "destructive" });
    } finally {
      setGeneratingCombos(false);
    }
  };

  const deleteCombination = async (id: string) => {
    try {
      const { error } = await supabase.from("product_variant_options").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Combinación eliminada" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);

  const getVariantStatus = (option: ProductVariantOption) => {
    if (!option.active) return { color: "secondary", text: "Inactiva" };
    if (!option.is_enabled) return { color: "destructive", text: "Sin precio" };
    if (option.price === null || option.price === 0 || option.price < 500) return { color: "destructive", text: "Precio inválido" };
    return { color: "default", text: "Activa" };
  };

  const getGroupOptionName = (optionId: string | null) => {
    if (!optionId) return null;
    for (const pg of productGroups) {
      if (!pg.group) continue;
      const opt = pg.group.options.find(o => o.id === optionId);
      if (opt) return { groupName: pg.group.name, optionName: opt.name };
    }
    return null;
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

  // Separate variants: those with group option (combos) vs those without (simple)
  const simpleVariants = productVariants.filter(pv => !pv.variant_group_option_id);
  const comboVariants = productVariants.filter(pv => !!pv.variant_group_option_id);

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

      {/* ── Combination generator (only if product has variant groups) ── */}
      {hasGroups && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generador de Combinaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este producto tiene grupos de variantes asignados. Genera automáticamente una fila de precio
              por cada combinación de <strong>variante de categoría</strong> (ej: Simple, Doble) ×{" "}
              <strong>opción de grupo</strong> (ej: Carne, Pollo).
            </p>

            {/* Show assigned groups */}
            <div className="flex flex-wrap gap-2">
              {productGroups.filter(pg => pg.group).map(pg => (
                <div key={pg.id} className="text-sm">
                  <Badge variant="outline" className="mr-1">{pg.group!.name}</Badge>
                  {pg.group!.options.map(o => (
                    <Badge key={o.id} variant="secondary" className="mr-1 text-xs">{o.name}</Badge>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Precio base</label>
                <Input
                  placeholder="$5.990"
                  value={basePrice}
                  onChange={e => setBasePrice(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <Button onClick={generateCombinations} disabled={generatingCombos || !basePrice}>
                <Wand2 className="h-4 w-4 mr-2" />
                {generatingCombos ? "Generando..." : "Generar Combinaciones"}
              </Button>
            </div>

            {comboVariants.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Ya existen {comboVariants.length} combinaciones. Solo se crearán las faltantes.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Combination table (variant group combos) ── */}
      {comboVariants.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Combinaciones de Precio</h3>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variante</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Por Defecto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comboVariants
                  .sort((a, b) => {
                    const cvA = availableVariants.find(v => v.id === a.category_variant_id);
                    const cvB = availableVariants.find(v => v.id === b.category_variant_id);
                    const orderA = cvA?.display_order ?? 0;
                    const orderB = cvB?.display_order ?? 0;
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.variant_group_option_id || '').localeCompare(b.variant_group_option_id || '');
                  })
                  .map((option) => {
                    const cv = availableVariants.find(v => v.id === option.category_variant_id);
                    const groupInfo = getGroupOptionName(option.variant_group_option_id);
                    const status = getVariantStatus(option);

                    return (
                      <TableRow key={option.id}>
                        <TableCell className="font-medium">{cv?.name || "—"}</TableCell>
                        <TableCell>
                          {groupInfo ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">{groupInfo.groupName}:</span>
                              <Badge variant="secondary" className="text-xs">{groupInfo.optionName}</Badge>
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.color as any}>{status.text}</Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            className="w-28"
                            defaultValue={option.price && option.price > 0 ? option.price.toString() : ""}
                            placeholder="$500"
                            onBlur={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val && parseInt(val) >= 500) {
                                updateVariantPrice(option.id, val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={option.is_default}
                            onCheckedChange={() => setDefaultVariant(option.id)}
                            disabled={!option.is_enabled}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => deleteCombination(option.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* ── Simple variants table (no group, original behavior) ── */}
      {!hasGroups && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Variantes del Producto</h3>
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
                  const existingOption = simpleVariants.find(pv => pv.category_variant_id === variant.id);
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
                            <div className="flex items-center space-x-2">
                              <span>{existingOption.price && existingOption.price > 0 ? formatPrice(existingOption.price) : "Sin precio"}</span>
                              {(!existingOption.price || existingOption.price === 0 || existingOption.price < 500) && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
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
        </>
      )}
    </div>
  );
}
