
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

interface AuthContextType {
  admin: any | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  isFirstAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // If authenticated, fetch admin profile
        if (session?.user) {
          fetchAdminProfile(session.user.email!);
        } else {
          setAdmin(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchAdminProfile(session.user.email!);
      }
      setLoading(false);
    });

    checkIfFirstAdmin();

    return () => subscription.unsubscribe();
  }, []);

  const fetchAdminProfile = async (email: string) => {
    try {
      const { data: adminData, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (!error && adminData) {
        setAdmin(adminData);
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    }
  };

  const checkIfFirstAdmin = async () => {
    try {
      const { count, error } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Error checking admin count:', error);
        // If we can't access admins table (due to RLS), assume admins exist
        setIsFirstAdmin(false);
      } else {
        setIsFirstAdmin(count === 0);
      }
    } catch (error) {
      console.error('Error checking admin count:', error);
      // If there's an error, assume admins exist to prevent showing registration
      setIsFirstAdmin(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // First check if admin exists and verify password
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (adminError || !adminData) {
        return { error: 'Invalid email or password' };
      }

      // Verify password with bcrypt
      const passwordMatch = await bcrypt.compare(password, adminData.password_hash);
      if (!passwordMatch) {
        return { error: 'Invalid email or password' };
      }

      // Sign in with Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: adminData.id, // Use admin ID as password for Supabase Auth
      });

      if (authError) {
        // Create Supabase user if it doesn't exist
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: adminData.id,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });

        if (signUpError) {
          return { error: 'Authentication failed' };
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Login failed' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      // Hash password with bcrypt
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create admin record
      const { data: adminData, error } = await supabase
        .from('admins')
        .insert([{
          name,
          email,
          password_hash: hashedPassword,
          role: 'super_admin'
        }])
        .select()
        .single();

      if (error) {
        return { error: 'Registration failed' };
      }

      // Create Supabase Auth user
      const { error: authError } = await supabase.auth.signUp({
        email,
        password: adminData.id, // Use admin ID as password for Supabase Auth
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (authError) {
        // Clean up admin record if auth creation fails
        await supabase.from('admins').delete().eq('id', adminData.id);
        return { error: 'Authentication setup failed' };
      }

      setIsFirstAdmin(false);
      return { error: null };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: 'Registration failed' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAdmin(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ admin, user, session, loading, login, logout, register, isFirstAdmin }}>
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
