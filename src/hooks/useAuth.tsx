
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
      console.log('Checking if first admin...');
      const { data, error } = await supabase.rpc('check_admins_exist');
      
      console.log('Admin existence check result:', { data, error });
      
      if (error) {
        console.error('Error checking admin existence:', error);
        // If we can't check, assume admins exist to prevent showing registration
        console.log('Setting isFirstAdmin to false due to error');
        setIsFirstAdmin(false);
      } else {
        console.log('Admins exist:', data);
        // data will be true if admins exist, false if no admins
        setIsFirstAdmin(!data);
      }
    } catch (error) {
      console.error('Error checking admin existence:', error);
      // If there's an error, assume admins exist to prevent showing registration
      console.log('Setting isFirstAdmin to false due to catch');
      setIsFirstAdmin(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login with email:', email);
      
      // First check if admin exists and verify password
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      console.log('Admin query result:', { adminData, adminError });

      if (adminError || !adminData) {
        console.log('Admin not found or error:', adminError);
        return { error: 'Invalid email or password' };
      }

      // Verify password with bcrypt
      const passwordMatch = await bcrypt.compare(password, adminData.password_hash);
      console.log('Password match result:', passwordMatch);
      
      if (!passwordMatch) {
        console.log('Password does not match');
        return { error: 'Invalid email or password' };
      }

      console.log('Password verified, attempting Supabase auth...');

      // Sign in with Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: adminData.id, // Use admin ID as password for Supabase Auth
      });

      console.log('Supabase auth result:', { authError });

      if (authError) {
        console.log('Creating new Supabase user...');
        // Create Supabase user if it doesn't exist
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: adminData.id,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });

        console.log('Supabase signup result:', { signUpError });

        if (signUpError) {
          console.log('Signup failed:', signUpError);
          return { error: 'Authentication failed' };
        }
      }

      console.log('Login successful');
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
