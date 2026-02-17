import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Merchant {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  business_name: string;
  business_address: string;
  is_active: boolean;
  created_at: string;
  merchant_role?: 'super_admin' | 'admin';
}

interface MerchantAuthContextType {
  merchant: Merchant | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const MerchantAuthContext = createContext<MerchantAuthContextType | undefined>(undefined);

export const MerchantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('merchant_session');
    if (stored) {
      try {
        setMerchant(JSON.parse(stored));
      } catch {
        localStorage.removeItem('merchant_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('merchant-login', {
        body: { email, password }
      });

      if (error) {
        return { error: error.message || 'Terjadi kesalahan saat login' };
      }

      if (!data?.success) {
        return { error: data?.error || 'Login gagal' };
      }

      if (data?.session?.access_token && data?.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      localStorage.setItem('merchant_session', JSON.stringify(data.merchant));
      setMerchant(data.merchant);
      return {};
    } catch {
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const logout = () => {
    supabase.auth.signOut().catch(() => {});
    localStorage.removeItem('merchant_session');
    setMerchant(null);
  };

  return (
    <MerchantAuthContext.Provider value={{ merchant, loading, login, logout }}>
      {children}
    </MerchantAuthContext.Provider>
  );
};

export const useMerchantAuth = () => {
  const context = useContext(MerchantAuthContext);
  if (context === undefined) {
    throw new Error('useMerchantAuth must be used within a MerchantAuthProvider');
  }
  return context;
};
