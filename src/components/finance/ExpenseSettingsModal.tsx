import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Plus, Pencil, Trash2, Tag, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExpenseSettingsModalProps {
  categories: string[];
  paymentMethods: string[];
  onCategoriesChange: (categories: string[]) => void;
  onPaymentMethodsChange: (methods: string[]) => void;
}

export function ExpenseSettingsModal({
  categories,
  paymentMethods,
  onCategoriesChange,
  onPaymentMethodsChange,
}: ExpenseSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('categories');
  const { toast } = useToast();

  // Categories state
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [localCategories, setLocalCategories] = useState<string[]>(categories);

  // Payment methods state
  const [newMethod, setNewMethod] = useState('');
  const [editingMethodIndex, setEditingMethodIndex] = useState<number | null>(null);
  const [localMethods, setLocalMethods] = useState<string[]>(paymentMethods);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setLocalMethods(paymentMethods);
  }, [paymentMethods]);

  // Category management
  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (localCategories.includes(newCategory.trim())) {
      toast({
        title: 'Error',
        description: 'Esta categoría ya existe',
        variant: 'destructive',
      });
      return;
    }
    const updated = [...localCategories, newCategory.trim()];
    setLocalCategories(updated);
    onCategoriesChange(updated);
    setNewCategory('');
    toast({
      title: 'Categoría agregada',
      description: `La categoría "${newCategory.trim()}" se agregó correctamente`,
    });
  };

  const deleteCategory = (index: number) => {
    const categoryToDelete = localCategories[index];
    if (!confirm(`¿Eliminar la categoría "${categoryToDelete}"?`)) return;
    
    const updated = localCategories.filter((_, i) => i !== index);
    setLocalCategories(updated);
    onCategoriesChange(updated);
    toast({
      title: 'Categoría eliminada',
      description: `La categoría "${categoryToDelete}" se eliminó correctamente`,
    });
  };

  const updateCategory = (index: number, newName: string) => {
    if (!newName.trim()) return;
    const updated = [...localCategories];
    updated[index] = newName.trim();
    setLocalCategories(updated);
    onCategoriesChange(updated);
    setEditingCategoryIndex(null);
    toast({
      title: 'Categoría actualizada',
      description: 'La categoría se actualizó correctamente',
    });
  };

  // Payment method management
  const addPaymentMethod = () => {
    if (!newMethod.trim()) return;
    if (localMethods.includes(newMethod.trim())) {
      toast({
        title: 'Error',
        description: 'Este método de pago ya existe',
        variant: 'destructive',
      });
      return;
    }
    const updated = [...localMethods, newMethod.trim()];
    setLocalMethods(updated);
    onPaymentMethodsChange(updated);
    setNewMethod('');
    toast({
      title: 'Método agregado',
      description: `El método "${newMethod.trim()}" se agregó correctamente`,
    });
  };

  const deletePaymentMethod = (index: number) => {
    const methodToDelete = localMethods[index];
    if (!confirm(`¿Eliminar el método de pago "${methodToDelete}"?`)) return;
    
    const updated = localMethods.filter((_, i) => i !== index);
    setLocalMethods(updated);
    onPaymentMethodsChange(updated);
    toast({
      title: 'Método eliminado',
      description: `El método "${methodToDelete}" se eliminó correctamente`,
    });
  };

  const updatePaymentMethod = (index: number, newName: string) => {
    if (!newName.trim()) return;
    const updated = [...localMethods];
    updated[index] = newName.trim();
    setLocalMethods(updated);
    onPaymentMethodsChange(updated);
    setEditingMethodIndex(null);
    toast({
      title: 'Método actualizado',
      description: 'El método de pago se actualizó correctamente',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración de Egresos</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">
              <Tag className="h-4 w-4 mr-2" />
              Categorías
            </TabsTrigger>
            <TabsTrigger value="methods">
              <CreditCard className="h-4 w-4 mr-2" />
              Métodos de Pago
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4 mt-4">
            <div>
              <h4 className="font-medium mb-2">Agregar Nueva Categoría</h4>
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nombre de la categoría"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                />
                <Button type="button" onClick={addCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Categorías Existentes</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {localCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    {editingCategoryIndex === index ? (
                      <Input
                        value={category}
                        onChange={(e) => {
                          const updated = [...localCategories];
                          updated[index] = e.target.value;
                          setLocalCategories(updated);
                        }}
                        onBlur={() => updateCategory(index, category)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateCategory(index, category);
                          }
                          if (e.key === 'Escape') {
                            setEditingCategoryIndex(null);
                          }
                        }}
                        autoFocus
                        className="flex-1 mr-2"
                      />
                    ) : (
                      <span className="flex-1">{category}</span>
                    )}
                    <div className="flex gap-1">
                      {editingCategoryIndex === index ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateCategory(index, category)}
                        >
                          Guardar
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCategoryIndex(index)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCategory(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="methods" className="space-y-4 mt-4">
            <div>
              <h4 className="font-medium mb-2">Agregar Nuevo Método de Pago</h4>
              <div className="flex gap-2">
                <Input
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  placeholder="ej: Efectivo, Transferencia, Tarjeta..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPaymentMethod();
                    }
                  }}
                />
                <Button type="button" onClick={addPaymentMethod}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Métodos de Pago Existentes</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {localMethods.map((method, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    {editingMethodIndex === index ? (
                      <Input
                        value={method}
                        onChange={(e) => {
                          const updated = [...localMethods];
                          updated[index] = e.target.value;
                          setLocalMethods(updated);
                        }}
                        onBlur={() => updatePaymentMethod(index, method)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updatePaymentMethod(index, method);
                          }
                          if (e.key === 'Escape') {
                            setEditingMethodIndex(null);
                          }
                        }}
                        autoFocus
                        className="flex-1 mr-2"
                      />
                    ) : (
                      <span className="flex-1">{method}</span>
                    )}
                    <div className="flex gap-1">
                      {editingMethodIndex === index ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updatePaymentMethod(index, method)}
                        >
                          Guardar
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMethodIndex(index)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePaymentMethod(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button type="button" onClick={() => setIsOpen(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
