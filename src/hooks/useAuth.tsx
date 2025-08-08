import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

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
  }, []);

  const checkAdminExists = async () => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Error checking admin:', error);
        setIsFirstAdmin(true);
      } else {
        setIsFirstAdmin(!data || data.length === 0);
      }
    } catch (error) {
      console.error('Error in checkAdminExists:', error);
      setIsFirstAdmin(true);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return { error: 'Admin tidak ditemukan' };
      }

      const isValidPassword = await bcrypt.compare(password, data.password_hash);
      
      if (!isValidPassword) {
        return { error: 'Password salah' };
      }

      setAdmin(data);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const { data, error } = await supabase
        .from('admins')
        .insert([
          {
            name,
            email,
            password_hash: hashedPassword,
            role: isFirstAdmin ? 'super_admin' : 'admin',
          }
        ])
        .select()
        .single();

      if (error) {
        return { error: 'Gagal mendaftarkan admin: ' + error.message };
      }

      setAdmin(data);
      setIsFirstAdmin(false);
      return {};
    } catch (error) {
      console.error('Register error:', error);
      return { error: 'Terjadi kesalahan saat mendaftarkan admin' };
    }
  };

  const logout = () => {
    setAdmin(null);
  };

  const resetSystem = async () => {
    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        return { error: 'Gagal mereset sistem: ' + error.message };
      }

      setAdmin(null);
      setIsFirstAdmin(true);
      return {};
    } catch (error) {
      console.error('Reset error:', error);
      return { error: 'Terjadi kesalahan saat mereset sistem' };
    }
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