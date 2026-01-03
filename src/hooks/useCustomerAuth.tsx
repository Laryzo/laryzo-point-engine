import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

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
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      fetchCustomer(storedCustomerId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error || !data) {
        localStorage.removeItem('customer_id');
        setCustomer(null);
      } else {
        setCustomer({
          id: data.id,
          name: data.name || '',
          email: data.email || '',
          whatsapp: data.whatsapp || '',
          points: Number(data.points) || 0,
          created_at: data.created_at || '',
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      localStorage.removeItem('customer_id');
    } finally {
      setLoading(false);
    }
  };

  const refreshCustomer = async () => {
    if (customer?.id) {
      await fetchCustomer(customer.id);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // First find customer_auth by email
      const { data: authData, error: authError } = await supabase
        .from('customer_auth')
        .select('*')
        .eq('email', email)
        .single();

      if (authError || !authData) {
        return { error: 'Email tidak terdaftar' };
      }

      const isValidPassword = await bcrypt.compare(password, authData.password_hash);
      
      if (!isValidPassword) {
        return { error: 'Password salah' };
      }

      // Update last login
      await supabase
        .from('customer_auth')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.id);

      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', authData.customer_id)
        .single();

      if (customerError || !customerData) {
        return { error: 'Data customer tidak ditemukan' };
      }

      localStorage.setItem('customer_id', customerData.id);
      setCustomer({
        id: customerData.id,
        name: customerData.name || '',
        email: customerData.email || '',
        whatsapp: customerData.whatsapp || '',
        points: Number(customerData.points) || 0,
        created_at: customerData.created_at || '',
      });

      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const register = async (name: string, email: string, password: string, whatsapp: string) => {
    try {
      // Check if email already exists
      const { data: existingAuth } = await supabase
        .from('customer_auth')
        .select('id')
        .eq('email', email)
        .single();

      if (existingAuth) {
        return { error: 'Email sudah terdaftar' };
      }

      // Create customer first
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([{ name, email, whatsapp, points: 0 }])
        .select()
        .single();

      if (customerError || !customerData) {
        return { error: 'Gagal membuat akun: ' + (customerError?.message || 'Unknown error') };
      }

      // Create customer_auth record
      const hashedPassword = await bcrypt.hash(password, 10);
      const { error: authError } = await supabase
        .from('customer_auth')
        .insert([{
          customer_id: customerData.id,
          email,
          password_hash: hashedPassword,
        }]);

      if (authError) {
        // Rollback customer creation
        await supabase.from('customers').delete().eq('id', customerData.id);
        return { error: 'Gagal membuat akun: ' + authError.message };
      }

      localStorage.setItem('customer_id', customerData.id);
      setCustomer({
        id: customerData.id,
        name: customerData.name || '',
        email: customerData.email || '',
        whatsapp: customerData.whatsapp || '',
        points: Number(customerData.points) || 0,
        created_at: customerData.created_at || '',
      });

      return {};
    } catch (error) {
      console.error('Register error:', error);
      return { error: 'Terjadi kesalahan saat mendaftar' };
    }
  };

  const logout = () => {
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
