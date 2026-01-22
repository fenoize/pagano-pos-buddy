import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, X } from 'lucide-react';
import { useDeliveryGeo } from '@/hooks/useDeliveryGeo';
import { cn } from '@/lib/utils';
import { flushSync } from 'react-dom';

interface AddressResult {
  address: string;
  coordinates: { lat: number; lng: number };
  comuna?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Buscar dirección...",
  disabled = false,
  className
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const { searchAddresses } = useDeliveryGeo();

  // Search for addresses with debounce
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchAddresses(query);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchAddresses]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, performSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((result: AddressResult) => {
    // Use flushSync to ensure immediate DOM update and dropdown close
    flushSync(() => {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
    });
    onChange(result.address);
    onSelect(result);
  }, [onChange, onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-16"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          {value && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((result, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-start gap-2 transition-colors",
                selectedIndex === index && "bg-accent text-accent-foreground"
              )}
              onClick={() => handleSelect(result)}
            >
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{result.address}</p>
                {result.comuna && (
                  <p className="text-xs text-muted-foreground">{result.comuna}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
