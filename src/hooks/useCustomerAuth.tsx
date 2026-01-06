import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  points: number;
  created_at: string;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string, whatsapp: string) => Promise<{ error?: string }>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedCustomer = localStorage.getItem('customer_session');
    if (storedCustomer) {
      try {
        const parsedCustomer = JSON.parse(storedCustomer);
        setCustomer(parsedCustomer);
        // Refresh customer data from server
        refreshCustomerData(parsedCustomer.id);
      } catch (e) {
        localStorage.removeItem('customer_session');
      }
    }
    setLoading(false);
  }, []);

  const refreshCustomerData = async (customerId: string) => {
    try {
      // For refreshing, we need to call a secure endpoint
      // Since RLS is now strict, we'll store the customer data locally
      // and trust it until logout
      console.log('Customer session active:', customerId);
    } catch (error) {
      console.error('Error refreshing customer:', error);
    }
  };

  const refreshCustomer = async () => {
    if (customer?.id) {
      await refreshCustomerData(customer.id);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Use Edge Function for secure server-side authentication
      const { data, error } = await supabase.functions.invoke('customer-login', {
        body: { email, password }
      });

      if (error) {
        console.error('Login error:', error);
        return { error: error.message || 'Terjadi kesalahan saat login' };
      }

      if (!data?.success) {
        return { error: data?.error || 'Login gagal' };
      }

      // Store customer session
      localStorage.setItem('customer_session', JSON.stringify(data.customer));
      localStorage.setItem('customer_id', data.customer.id);
      setCustomer(data.customer);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const register = async (name: string, email: string, password: string, whatsapp: string) => {
    try {
      // Use Edge Function for secure server-side registration
      const { data, error } = await supabase.functions.invoke('customer-login', {
        body: { email, password, name, whatsapp, action: 'register' }
      });

      if (error) {
        console.error('Register error:', error);
        return { error: error.message || 'Terjadi kesalahan saat mendaftar' };
      }

      if (!data?.success) {
        return { error: data?.error || 'Registrasi gagal' };
      }

      // Store customer session
      localStorage.setItem('customer_session', JSON.stringify(data.customer));
      localStorage.setItem('customer_id', data.customer.id);
      setCustomer(data.customer);
      return {};
    } catch (error) {
      console.error('Register error:', error);
      return { error: 'Terjadi kesalahan saat mendaftar' };
    }
  };

  const logout = () => {
    localStorage.removeItem('customer_session');
    localStorage.removeItem('customer_id');
    setCustomer(null);
  };

  const value = {
    customer,
    loading,
    login,
    register,
    logout,
    refreshCustomer,
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
