import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import { TenantProvider } from "./context/TenantContext";
import { LanguageProvider } from "./context/LanguageContext";
import { CopilotProvider } from "./context/CopilotContext";
import { NotificationProvider } from "./context/NotificationContext";
import { useAuth } from "./context/AuthContext";
import { HelmetProvider } from 'react-helmet-async';
import { useAnalytics } from './hooks/useAnalytics';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Layout from "./components/Layout";
import BiometricLock from "./components/BiometricLock";
import CookieBanner from "./components/CookieBanner";
import ErrorBoundary from "./components/ErrorBoundary";

// Eagerly loaded pages (small, frequently accessed or needed at startup)
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import DemoDashboard from "./pages/DemoDashboard";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import Help from "./pages/Help";
import Planning from "./pages/Planning";
import Warehouse from "./pages/Warehouse";
import SupportAI from "./pages/SupportAI";
import PublicCatalog from "./pages/PublicCatalog";
import DeliveryApp from "./pages/DeliveryApp";
import DriverApplication from "./pages/DriverApplication";
import FranchiseApplication from "./pages/FranchiseApplication";
const Assets = lazy(() => import("./pages/Assets"));
const Marketing = lazy(() => import("./pages/Marketing"));

// 🚀 Lazy-loaded heavy pages (code splitting — reduces initial bundle ~40%)
const Finances = lazy(() => import("./pages/Finances"));
const Automations = lazy(() => import("./pages/Automations"));
const HR = lazy(() => import("./pages/HR"));
const Drivers = lazy(() => import("./pages/Drivers"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Returns = lazy(() => import("./pages/Returns"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FranchiseDashboard = lazy(() => import("./pages/FranchiseDashboard"));

// Simple page-level loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
  </div>
);

// Smart landing: redirect authenticated users to dashboard
const SmartLanding = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
};

// Navigation analytics tracker
const AnalyticsTracker = () => {
  useAnalytics();
  return null;
};

function App() {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <AuthContextWrapper>
          <TenantProvider>
            <CopilotProvider>
              <NotificationProvider>
                <BrowserRouter>
                  <AnalyticsTracker />
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      className: '',
                      style: {
                        background: '#333',
                        color: '#fff',
                      },
                      success: {
                        style: {
                          background: 'white',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          padding: '16px',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          fontWeight: 500,
                        },
                        iconTheme: { primary: '#22c55e', secondary: '#fff' },
                        duration: 4000,
                      },
                      error: {
                        style: {
                          background: 'white',
                          color: '#b91c1c',
                          border: '1px solid #fecaca',
                          padding: '16px',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          fontWeight: 600,
                        },
                        iconTheme: { primary: '#ef4444', secondary: '#fff' },
                        duration: 5000,
                      },
                    }}
                  />
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<SmartLanding />} />

                        {/* Public Routes */}
                        <Route path="/catalog/:storeId" element={<PublicCatalog />} />
                        <Route path="/delivery/:token" element={<DeliveryApp />} />
                        <Route path="/apply/driver/:storeId" element={<DriverApplication />} />
                        <Route path="/apply/franchise/:storeId" element={<FranchiseApplication />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/demo" element={<DemoDashboard />} />

                        {/* Admin (lazy) */}
                        <Route path="/admin" element={
                          <RoleProtectedRoute allowedRoles={['super_admin']}>
                            <BiometricLock>
                              <AdminDashboard />
                            </BiometricLock>
                          </RoleProtectedRoute>
                        } />

                        {/* Franchise admin (lazy) */}
                        <Route path="/franchise" element={
                          <RoleProtectedRoute allowedRoles={['super_admin', 'franchise_admin']}>
                            <BiometricLock>
                              <FranchiseDashboard />
                            </BiometricLock>
                          </RoleProtectedRoute>
                        } />

                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/onboarding" element={
                          <ProtectedRoute>
                            <Onboarding />
                          </ProtectedRoute>
                        } />

                        {/* Authenticated App Routes */}
                        <Route element={
                          <ProtectedRoute>
                            <BiometricLock>
                              <Layout />
                            </BiometricLock>
                          </ProtectedRoute>
                        }>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/finances" element={<Finances />} />
                          <Route path="/products" element={<Products />} />
                          <Route path="/orders" element={<Orders />} />
                          <Route path="/customers" element={<Customers />} />
                          <Route path="/planning" element={<Planning />} />
                          <Route path="/team" element={<Team />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/help" element={<Help />} />
                          <Route path="/warehouse" element={<Warehouse />} />
                          <Route path="/support-ai" element={<SupportAI />} />
                          <Route path="/automations" element={<Automations />} />
                          <Route path="/drivers" element={<Drivers />} />
                          <Route path="/hr" element={<HR />} />
                          <Route path="/purchases" element={<Purchases />} />
                          <Route path="/returns" element={<Returns />} />
                          <Route path="/marketing" element={<Marketing />} />
                          <Route path="/assets" element={<Assets />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                  <CookieBanner />
                </BrowserRouter>
              </NotificationProvider>
            </CopilotProvider>
          </TenantProvider>
        </AuthContextWrapper>
      </LanguageProvider>
    </HelmetProvider>
  );
}

// Separate wrapper to avoid context usage before provider
const AuthContextWrapper = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

export default App;
