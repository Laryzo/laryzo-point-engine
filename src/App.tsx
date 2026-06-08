
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CustomerAuthProvider, useCustomerAuth } from "@/hooks/useCustomerAuth";
import { MerchantAuthProvider, useMerchantAuth } from "@/hooks/useMerchantAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CustomerProtectedRoute } from "@/components/CustomerProtectedRoute";
import { MerchantProtectedRoute } from "@/components/MerchantProtectedRoute";
import { Loader2 } from "lucide-react";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CustomerLogin = lazy(() => import("./pages/CustomerLogin"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const CustomerShop = lazy(() => import("./pages/CustomerShop"));
const CustomerOrders = lazy(() => import("./pages/CustomerOrders"));
const CustomerOrderManual = lazy(() => import("./pages/CustomerOrderManual"));
const CustomerPointHistory = lazy(() => import("./pages/CustomerPointHistory"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const CustomerWallet = lazy(() => import("./pages/CustomerWallet"));
const CustomerTopupForm = lazy(() => import("./pages/CustomerTopupForm"));
const CustomerTopupTransfer = lazy(() => import("./pages/CustomerTopupTransfer"));
const MerchantLogin = lazy(() => import("./pages/MerchantLogin"));
const MerchantDashboard = lazy(() => import("./pages/MerchantDashboard"));
const MerchantRegister = lazy(() => import("./pages/MerchantRegister"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Memuat...</p>
    </div>
  </div>
);

const AdminRoutes = () => {
  const { admin } = useAuth();

  return (
    <Routes>
      <Route path="/" element={admin ? <Navigate to="/dashboard" replace /> : <Index />} />
      <Route path="/login" element={admin ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const CustomerPortalRoutes = () => {
  const { customer } = useCustomerAuth();

  return (
    <Routes>
      <Route path="login" element={customer ? <Navigate to="/portal" replace /> : <CustomerLogin />} />
      <Route path="/" element={
        <CustomerProtectedRoute>
          <CustomerDashboard />
        </CustomerProtectedRoute>
      } />
      <Route path="shop" element={
        <CustomerProtectedRoute>
          <CustomerShop />
        </CustomerProtectedRoute>
      } />
      <Route path="orders" element={
        <CustomerProtectedRoute>
          <CustomerOrders />
        </CustomerProtectedRoute>
      } />
      <Route path="orders/:orderId/manual" element={
        <CustomerProtectedRoute>
          <CustomerOrderManual />
        </CustomerProtectedRoute>
      } />
      <Route path="points" element={
        <CustomerProtectedRoute>
          <CustomerPointHistory />
        </CustomerProtectedRoute>
      } />
      <Route path="profile" element={
        <CustomerProtectedRoute>
          <CustomerProfile />
        </CustomerProtectedRoute>
      } />
      <Route path="wallet" element={
        <CustomerProtectedRoute>
          <CustomerWallet />
        </CustomerProtectedRoute>
      } />
      <Route path="wallet/topup" element={
        <CustomerProtectedRoute>
          <CustomerTopupForm />
        </CustomerProtectedRoute>
      } />
      <Route path="wallet/transfer/:id" element={
        <CustomerProtectedRoute>
          <CustomerTopupTransfer />
        </CustomerProtectedRoute>
      } />
    </Routes>
  );
};

const MerchantRoutes = () => {
  const { merchant } = useMerchantAuth();

  return (
    <Routes>
      <Route path="login" element={merchant ? <Navigate to="/mitra" replace /> : <MerchantLogin />} />
      <Route path="register" element={merchant ? <Navigate to="/mitra" replace /> : <MerchantRegister />} />
      <Route path="/" element={
        <MerchantProtectedRoute>
          <MerchantDashboard />
        </MerchantProtectedRoute>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Admin Routes */}
            <Route path="/*" element={
              <AuthProvider>
                <AdminRoutes />
              </AuthProvider>
            } />
            {/* Customer Portal Routes */}
            <Route path="/portal/*" element={
              <CustomerAuthProvider>
                <CustomerPortalRoutes />
              </CustomerAuthProvider>
            } />
            {/* Merchant/Mitra Routes */}
            <Route path="/mitra/*" element={
              <MerchantAuthProvider>
                <MerchantRoutes />
              </MerchantAuthProvider>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
