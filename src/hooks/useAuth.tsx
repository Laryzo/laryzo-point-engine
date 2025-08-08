import { createContext, useContext, useEffect, useState } from "react";

// Sesuaikan struktur data admin kamu
type Admin = {
  email: string;
};

type AuthContextType = {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  isFirstAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isFirstAdmin, setIsFirstAdmin] = useState(false);

  // 🧠 Cek apakah sudah login sebelumnya (saat halaman di-refresh)
  useEffect(() => {
    const savedAdmin = localStorage.getItem("admin");
    if (savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Ganti dengan login logic kamu
    if (
      (email === "admin@laryzo.com" || email === "super-admin@laryzo.com") &&
      password === "admin123"
    ) {
      const adminData = { email };
      localStorage.setItem("admin", JSON.stringify(adminData)); // ✅ Simpan login
      setAdmin(adminData);
      return {};
    } else {
      return { error: "Email atau password salah" };
    }
  };

  const logout = () => {
    localStorage.removeItem("admin");
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, isFirstAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
