import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface RawMaterial {
  id: string;
  name: string;
  code?: string | null;
  last_cost?: number | null;
  base_uom_id?: string;
  base_uom?: {
    id?: string;
    symbol?: string;
    abbreviation?: string;
  };
}

interface MaterialSearchAutocompleteProps {
  materials: RawMaterial[];
  value: string;
  onSelect: (materialId: string, material: RawMaterial | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  displayValue?: string;
}

export function MaterialSearchAutocomplete({
  materials,
  value,
  onSelect,
  placeholder = 'Buscar material...',
  disabled = false,
  loading = false,
  className,
  displayValue,
}: MaterialSearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get the display name for the selected material
  const selectedMaterial = materials.find(m => m.id === value);
  const displayText = displayValue || selectedMaterial?.name || '';

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const updateDropdownRect = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  // Medir y fijar el dropdown en un portal (evita que el contenedor de la tabla lo “recorte”)
  useLayoutEffect(() => {
    if (!isOpen) return;

    updateDropdownRect();

    const handle = () => updateDropdownRect();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [isOpen]);

  // Filter materials based on search query (minimum 3 characters)
  useEffect(() => {
    const query = normalizeText(searchQuery);

    if (query.length < 3) {
      setFilteredMaterials([]);
      return;
    }

    // Filtrar inmediatamente sin debounce para respuesta rápida
    const filtered = materials.filter((material) => {
      const name = normalizeText(material.name || '');
      const code = normalizeText(material.code || '');
      const combined = `${name} ${code}`;
      
      // El texto de búsqueda completo debe aparecer en nombre o código
      return combined.includes(query);
    });

    setFilteredMaterials(filtered.slice(0, 50));
    setHighlightedIndex(-1);
    setHighlightedIndex(-1);
  }, [searchQuery, materials]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      const item = items[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (material: RawMaterial) => {
    onSelect(material.id, material);
    setIsOpen(false);
    setSearchQuery('');
    setFilteredMaterials([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('', undefined);
    setSearchQuery('');
    setFilteredMaterials([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredMaterials.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredMaterials[highlightedIndex]) {
          handleSelect(filteredMaterials[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button (when closed or showing selected value) */}
      {!isOpen ? (
        <button
          type="button"
          onClick={handleTriggerClick}
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm',
            'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !displayText && 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {displayText || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <X 
                className="h-3.5 w-3.5 opacity-50 hover:opacity-100" 
                onClick={handleClear}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </button>
      ) : (
        /* Search input (when open) */
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe al menos 3 letras..."
            className="h-8 pl-7 pr-8 text-sm"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Dropdown results (Portal) */}
      {isOpen &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 9999,
            }}
            className="rounded-md border border-border bg-popover shadow-lg"
          >
            {loading ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Cargando materiales...
              </div>
            ) : searchQuery.length < 3 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Escribe al menos 3 caracteres para buscar
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                No se encontraron materiales
              </div>
            ) : (
              <ul
                ref={listRef}
                className="max-h-60 overflow-auto py-1"
                role="listbox"
              >
                {filteredMaterials.map((material, index) => (
                  <li
                    key={material.id}
                    role="option"
                    aria-selected={highlightedIndex === index}
                    onClick={() => handleSelect(material)}
                    className={cn(
                      'cursor-pointer px-3 py-2 text-sm transition-colors',
                      highlightedIndex === index
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50',
                      value === material.id && 'font-medium text-primary'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{material.name}</span>
                      {material.code && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {material.code}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
