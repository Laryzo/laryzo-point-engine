import { Navigate } from 'react-router-dom';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';

export const MerchantProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { merchant, loading } = useMerchantAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!merchant) {
    return <Navigate to="/mitra/login" replace />;
  }

  return <>{children}</>;
};
