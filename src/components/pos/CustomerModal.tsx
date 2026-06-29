import React, { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Coins, ScanLine, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { QRScannerModal } from './QRScannerModal';
import { toast } from "sonner";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Partial<Customer>;
  onCustomerChange: (customer: Partial<Customer>) => void;
}

export function CustomerModal({ 
  isOpen,
  onClose,
  customer, 
  onCustomerChange, 
}: CustomerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [displayResults, setDisplayResults] = useState<Customer[]>([]);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const reqIdRef = React.useRef(0);
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!customer.id) {
        setSearchTerm('');
        setSearchResults([]);
        setShowNewCustomerForm(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const myId = ++reqIdRef.current;
    setIsSearching(true);
    const t = setTimeout(() => {
      searchCustomers(term, myId);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const searchCustomers = async (term: string, myId: number) => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) throw new Error('No hay sesión activa');

      const supabaseUrl = (supabase as any).supabaseUrl || 'https://lxxfhayifyiioglfbsyj.supabase.co';
      const params = new URLSearchParams({ q: term, limit: '10', offset: '0' });

      const response = await fetch(
        `${supabaseUrl}/functions/v1/staff-list-customers?${params}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        if (response.status === 401) {
          clearStaffStorage();
          window.location.href = '/pos/login';
          return;
        }
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      // Ignore stale responses
      if (myId !== reqIdRef.current) return;
      setSearchResults(result.data || []);
    } catch (error) {
      if (myId !== reqIdRef.current) return;
      console.error('Error searching customers:', error);
      toast.error("Error", { description: error instanceof Error ? error.message : "No se pudieron buscar clientes" });
      setSearchResults([]);
    } finally {
      if (myId === reqIdRef.current) setIsSearching(false);
    }
  };

  const selectCustomer = (selectedCustomer: Customer) => {
    onCustomerChange(selectedCustomer);
    setSearchTerm('');
    setSearchResults([]);
    setShowNewCustomerForm(false);
  };

  const handleClearCustomer = () => {
    onCustomerChange({});
    setSearchTerm('');
    setShowNewCustomerForm(false);
  };

  const formatRunas = (runas: number) => new Intl.NumberFormat('es-CL').format(runas);

  const getDisplayName = (c: Customer | Partial<Customer>) => {
    const nombre = c.nombres || c.name || '';
    const apellido = c.apellidos || c.apellido || '';
    return `${nombre} ${apellido}`.trim();
  };

  const hasSelectedCustomer = !!customer.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Cliente (opcional)
          </DialogTitle>
          <DialogDescription>
            {hasSelectedCustomer ? 'Cliente vinculado a esta venta' : 'Busca o escanea un cliente'}
          </DialogDescription>
        </DialogHeader>

        {/* === SELECTED CUSTOMER VIEW === */}
        {hasSelectedCustomer ? (
          <div className="space-y-3">
            <div className="border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{getDisplayName(customer)}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {[customer.phone, customer.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {customer.cantidad_runas != null && customer.cantidad_runas > 0 && (
                  <Badge variant="secondary" className="ml-3 shrink-0">
                    <Coins className="w-3 h-3 mr-1" />
                    {formatRunas(customer.cantidad_runas)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClearCustomer}>
                Cambiar cliente
              </Button>
              <Button className="flex-1" onClick={onClose}>
                Confirmar
              </Button>
            </div>
          </div>
        ) : (
          /* === SEARCH VIEW === */
          <div className="space-y-3">
            {/* Search + QR inline */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Correo, teléfono o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => setShowQRScanner(true)}
                title="Escanear QR"
              >
                <ScanLine className="w-4 h-4" />
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => selectCustomer(result)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{getDisplayName(result)}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {[result.phone, result.email].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    {result.cantidad_runas != null && result.cantidad_runas > 0 && (
                      <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                        <Coins className="w-3 h-3 mr-1" />
                        {formatRunas(result.cantidad_runas)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {searchTerm.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Sin resultados</p>
                <Button onClick={() => { setShowNewCustomerForm(true); setSearchResults([]); }} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Crear cliente
                </Button>
              </div>
            )}

            {/* New Customer Form */}
            {showNewCustomerForm && (
              <div className="space-y-3 border rounded-lg p-4">
                <h4 className="font-medium text-sm">Nuevo Cliente</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Nombres *"
                    value={customer.nombres || customer.name || ''}
                    onChange={(e) => onCustomerChange({ ...customer, nombres: e.target.value, name: e.target.value })}
                  />
                  <Input
                    placeholder="Apellidos"
                    value={customer.apellidos || customer.apellido || ''}
                    onChange={(e) => onCustomerChange({ ...customer, apellidos: e.target.value, apellido: e.target.value })}
                  />
                  <Input
                    placeholder="Teléfono"
                    value={customer.phone || ''}
                    onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
                  />
                  <Input
                    placeholder="Email"
                    value={customer.email || ''}
                    onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Close + QR Scanner link */}
            <div className="flex items-center justify-between pt-1">
              <a
                href="/pos/qr-scanner"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary underline"
              >
                📱 Usar celular como lector QR
              </a>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {/* QR Scanner */}
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onCustomerFound={(foundCustomer) => {
            selectCustomer(foundCustomer);
            setShowQRScanner(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
