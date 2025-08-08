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
    const checkAuthSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (adminData) {
          setAdmin(adminData);
        } else if (adminError) {
          console.error('Error fetching admin data:', adminError);
        }
      }
      setLoading(false);
    };

    checkAuthSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // User is logged in, fetch admin data if not already set
        // This check prevents unnecessary re-fetches if admin is already set and matches the session user
        if (!admin || admin.email !== session.user.email) {
          supabase
            .from('admins')
            .select('*')
            .eq('email', session.user.email)
            .single()
            .then(({ data: adminData, error: adminError }) => {
              if (adminData) {
                setAdmin(adminData);
              } else if (adminError) {
                console.error('Error fetching admin data on auth state change:', adminError);
              }
            });
        }
      } else {
        // User is logged out
        setAdmin(null);
      }
      setLoading(false);
    });

    checkAdminExists();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [admin]); // Added admin to dependency array to re-run effect when admin state changes

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
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // First, authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        console.error('Supabase Auth Login Error:', authError);
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: 'Pengguna tidak ditemukan setelah autentikasi Supabase.' };
      }

      // Then, fetch admin data from your 'admins' table using the authenticated user's email
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', authData.user.email)
        .single();

      if (adminError || !adminData) {
        console.error('Error fetching admin data from table:', adminError);
        return { error: 'Data admin tidak ditemukan atau terjadi kesalahan.' };
      }

      // Removed the bcrypt.compare check here, as Supabase signInWithPassword already handles password verification.
      // The original code might have had a separate password hash in the 'admins' table, which is redundant if Supabase Auth is the primary authentication.
      // If you still need to verify a password hash from the 'admins' table for some reason, you should ensure it's consistent with Supabase Auth.

      setAdmin(adminData);
      return {};
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Terjadi kesalahan saat login' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      // First, register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Supabase Auth Register Error:', authError);
        return { error: 'Gagal mendaftarkan admin: ' + authError.message };
      }

      if (!authData.user) {
        return { error: 'Pengguna tidak dibuat setelah pendaftaran Supabase.' };
      }

      // Then, insert into your 'admins' table
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const { data, error } = await supabase
        .from('admins')
        .insert([
          {
            id: authData.user.id, // Use Supabase user ID for consistency
            name,
            email,
            password_hash: hashedPassword,
            role: isFirstAdmin ? 'super_admin' : 'admin',
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error inserting into admins table:', error);
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

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      setAdmin(null);
    }
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

