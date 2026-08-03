import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  qty: number;
  stock: number;
  merchant_id: string | null;
  merchant_name: string | null;
  merchant_lat: number | null;
  merchant_lng: number | null;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const storageKey = (customerId?: string) => `customer_cart_${customerId || 'guest'}`;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { customer } = useCustomerAuth();
  const key = storageKey(customer?.id);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
    } catch {
      setItems([]);
    }
  }, [key]);

  const persist = (next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  };

  const addItem = (item: Omit<CartItem, 'qty'>, qty = 1) => {
    const existing = items.find((i) => i.product_id === item.product_id);
    // Merchants use a negative stock value to mean unlimited stock
    const unlimited = item.stock < 0;
    if (existing) {
      const max = unlimited ? Infinity : item.stock > 0 ? item.stock : existing.qty + qty;
      persist(
        items.map((i) =>
          i.product_id === item.product_id
            ? { ...i, ...item, qty: Math.min(i.qty + qty, max) }
            : i
        )
      );
      return;
    }
    persist([...items, { ...item, qty }]);
  };


  const setQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      persist(items.filter((i) => i.product_id !== productId));
      return;
    }
    persist(items.map((i) => (i.product_id === productId ? { ...i, qty } : i)));
  };

  const removeItem = (productId: string) => persist(items.filter((i) => i.product_id !== productId));

  const clear = () => persist([]);

  const value = useMemo<CartContextType>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * i.price, 0),
      addItem,
      setQty,
      removeItem,
      clear,
    }),
    [items, key]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
