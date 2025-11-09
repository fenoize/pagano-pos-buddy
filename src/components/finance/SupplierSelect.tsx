import { useState } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSuppliers } from '@/hooks/useSuppliers';
import { SupplierFormModal } from './SupplierFormModal';

interface SupplierSelectProps {
  value?: string;
  onValueChange: (supplierId: string, supplierName: string) => void;
}

export function SupplierSelect({ value, onValueChange }: SupplierSelectProps) {
  const { suppliers, loading, refetch } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.name === value);

  const handleSelect = (supplier: typeof suppliers[0]) => {
    onValueChange(supplier.id, supplier.name);
    setOpen(false);
  };

  const handleNewSupplier = () => {
    setOpen(false);
    setShowNewModal(true);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedSupplier ? (
              <span>
                {selectedSupplier.name}
                {selectedSupplier.rut && (
                  <span className="text-muted-foreground ml-2">({selectedSupplier.rut})</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Seleccionar proveedor...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar proveedor..." />
            <CommandEmpty>
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No se encontraron proveedores
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewSupplier}
                  className="mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Proveedor
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={handleNewSupplier}
                className="text-primary cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Agregar nuevo proveedor</span>
              </CommandItem>
              {!loading && suppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  onSelect={() => handleSelect(supplier)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === supplier.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{supplier.name}</span>
                    {supplier.rut && (
                      <span className="text-xs text-muted-foreground">
                        RUT: {supplier.rut}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      <SupplierFormModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
