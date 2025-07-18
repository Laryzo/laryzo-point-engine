
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  admin: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      const adminData = localStorage.getItem('laryzo_admin');
      if (adminData) {
        setAdmin(JSON.parse(adminData));
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Simple demo login - in production, use proper password hashing
      const { data: adminData, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !adminData) {
        return { error: 'Invalid email or password' };
      }

      // For demo purposes, we'll accept any password
      // In production, compare with password_hash using bcrypt
      setAdmin(adminData);
      localStorage.setItem('laryzo_admin', JSON.stringify(adminData));
      return { error: null };
    } catch (error) {
      return { error: 'Login failed' };
    }
  };

  const logout = async () => {
    setAdmin(null);
    localStorage.removeItem('laryzo_admin');
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
