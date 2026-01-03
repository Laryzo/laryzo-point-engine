
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CustomerAuthProvider, useCustomerAuth } from "@/hooks/useCustomerAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CustomerProtectedRoute } from "@/components/CustomerProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerShop from "./pages/CustomerShop";
import CustomerOrders from "./pages/CustomerOrders";
import CustomerPointHistory from "./pages/CustomerPointHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

const CustomerRoutes = () => {
  const { customer } = useCustomerAuth();

  return (
    <Routes>
      <Route path="/portal/login" element={customer ? <Navigate to="/portal" replace /> : <CustomerLogin />} />
      <Route path="/portal" element={
        <CustomerProtectedRoute>
          <CustomerDashboard />
        </CustomerProtectedRoute>
      } />
      <Route path="/portal/shop" element={
        <CustomerProtectedRoute>
          <CustomerShop />
        </CustomerProtectedRoute>
      } />
      <Route path="/portal/orders" element={
        <CustomerProtectedRoute>
          <CustomerOrders />
        </CustomerProtectedRoute>
      } />
      <Route path="/portal/points" element={
        <CustomerProtectedRoute>
          <CustomerPointHistory />
        </CustomerProtectedRoute>
      } />
    </Routes>
  );
};

const AppRoutes = () => {
  return (
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
          <CustomerRoutes />
        </CustomerAuthProvider>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
