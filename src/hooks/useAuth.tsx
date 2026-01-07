import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface AuthContextType {
  admin: Admin | null;
  loading: boolean;
  isFirstAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  resetSystem: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);

  useEffect(() => {
    checkAdminExists();

    // Check for stored admin session
    const storedAdmin = localStorage.getItem('admin_session');
    if (storedAdmin) {
      try {
        const parsedAdmin = JSON.parse(storedAdmin);
        setAdmin(parsedAdmin);

        // Ensure we also have a valid Supabase auth session for RLS-protected queries
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            localStorage.removeItem('admin_session');
            setAdmin(null);
          }
        });
      } catch (e) {
        localStorage.removeItem('admin_session');
      }
    }
  }, []);

  const checkAdminExists = async () => {
    try {
      // Use Edge Function to check admin status securely
      const { data, error } = await supabase.functions.invoke('admin-check');

      if (error) {
        console.error('Error checking admin:', error);
        // Don't fallback to registration page on error - assume admins exist
        setIsFirstAdmin(false);
      } else {
        setIsFirstAdmin(data?.isFirstAdmin || false);
      }
    } catch (error) {
      console.error('Error in checkAdminExists:', error);
      // Don't fallback to registration page on error - assume admins exist
      setIsFirstAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Use Edge Function for secure server-side authentication
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password }
      });

      if (error) {
        console.error('Login error:', error);
        return { error: error.message || 'Terjadi kesalahan saat login' };
      }

      if (!data?.success) {
        return { error: data?.error || 'Login gagal' };
      }

      // Ensure Supabase Auth session exists (required for RLS)
      if (data?.session?.access_token && data?.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } else {
        return { error: 'Sesi autentikasi tidak terbentuk. Silakan coba login ulang.' };
      }

      // Store admin session (UI identity)
      localStorage.setItem('admin_session', JSON.stringify(data.admin));
      setAdmin(data.admin);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      // Use Edge Function for secure server-side registration
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password, name, action: 'register' }
      });

      if (error) {
        console.error('Register error:', error);
        return { error: error.message || 'Terjadi kesalahan saat mendaftarkan admin' };
      }

      if (!data?.success) {
        return { error: data?.error || 'Registrasi gagal' };
      }

      // Ensure Supabase Auth session exists (required for RLS)
      if (data?.session?.access_token && data?.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } else {
        return { error: 'Sesi autentikasi tidak terbentuk. Silakan coba login ulang.' };
      }

      // Store admin session
      localStorage.setItem('admin_session', JSON.stringify(data.admin));
      setAdmin(data.admin);
      setIsFirstAdmin(false);
      return {};
    } catch (error) {
      console.error('Register error:', error);
      return { error: 'Terjadi kesalahan saat mendaftarkan admin' };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_session');
    supabase.auth.signOut();
    setAdmin(null);
  };

  const resetSystem = async () => {
    // This functionality should be removed or moved to a secure Edge Function
    // For now, just logout
    logout();
    setIsFirstAdmin(true);
    return {};
  };

  const value = {
    admin,
    loading,
    isFirstAdmin,
    login,
    register,
    logout,
    resetSystem,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
