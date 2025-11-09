import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface CartItem {
  id: string; // UUID único del item en el carrito
  productId: string;
  productName: string;
  categoryId?: string;
  categoryName?: string;
  basePrice: number;
  quantity: number;
  selectedVariant?: {
    id: string;
    name: string;
    priceAdjustment: number;
  };
  selectedExtras?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  selectedModifiers?: Array<{
    id: string;
    name: string;
  }>;
  notes?: string;
  imageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItem: (itemId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getItemTotal: (item: CartItem) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'paganos_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Cargar carrito desde localStorage
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error loading cart from localStorage:', e);
        return [];
      }
    }
    return [];
  });

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const getItemTotal = (item: CartItem): number => {
    let total = item.basePrice;
    
    // Sumar ajuste de variante
    if (item.selectedVariant) {
      total += item.selectedVariant.priceAdjustment;
    }
    
    // Sumar extras
    if (item.selectedExtras) {
      total += item.selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
    }
    
    return total * item.quantity;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (itemData: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...itemData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setItems(prev => [...prev, newItem]);
    toast.success(`${itemData.productName} agregado al carrito`);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === itemId);
      if (item) {
        toast.success(`${item.productName} eliminado del carrito`);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    setItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const updateItem = (itemId: string, updates: Partial<CartItem>) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    toast.success('Carrito vaciado');
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addItem,
        removeItem,
        updateQuantity,
        updateItem,
        clearCart,
        getItemTotal
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
