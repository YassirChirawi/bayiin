import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from "react-router-dom";
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
import { PWAProvider } from "./context/PWAContext";
import ReloadPrompt from "./components/ReloadPrompt";
import { ShopifyAppBridgeProvider } from "./context/ShopifyAppBridgeContext";
import { CartProvider } from "./context/CartContext";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import FeatureProtectedRoute from "./components/FeatureProtectedRoute";
import Layout from "./components/Layout";
import BiometricLock from "./components/BiometricLock";
import CookieBanner from "./components/CookieBanner";
import ErrorBoundary from "./components/ErrorBoundary";

// Eagerly loaded pages (essential for initial render)
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// 🚀 Lazy-loaded pages (code splitting — reduces initial bundle by ~80%)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Orders = lazy(() => import("./pages/Orders"));
const Customers = lazy(() => import("./pages/Customers"));
const Settings = lazy(() => import("./pages/Settings"));
const Team = lazy(() => import("./pages/Team"));
const Help = lazy(() => import("./pages/Help"));
const Planning = lazy(() => import("./pages/Planning"));
const Warehouse = lazy(() => import("./pages/Warehouse"));
const PublicCatalog = lazy(() => import("./pages/PublicCatalog"));
const DeliveryApp = lazy(() => import("./pages/DeliveryApp"));
const DriverApplication = lazy(() => import("./pages/DriverApplication"));
const FranchiseApplication = lazy(() => import("./pages/FranchiseApplication"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const DemoDashboard = lazy(() => import("./pages/DemoDashboard"));
const Assets = lazy(() => import("./pages/Assets"));
const Marketing = lazy(() => import("./pages/Marketing"));
const SupportAI = lazy(() => import("./pages/SupportAI"));
const Notifications = lazy(() => import("./pages/Notifications"));
const YouCanAuthRoute = lazy(() => import("./pages/YouCanAuthRoute"));
const StoreCustomizer = lazy(() => import("./pages/HybridStoreBuilder"));

// 🚀 Lazy-loaded heavy pages (code splitting — reduces initial bundle ~40%)
const Finances = lazy(() => import("./pages/Finances"));
const Automations = lazy(() => import("./pages/Automations"));
const HR = lazy(() => import("./pages/HR"));
const Drivers = lazy(() => import("./pages/Drivers"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Returns = lazy(() => import("./pages/Returns"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FranchiseDashboard = lazy(() => import("./pages/FranchiseDashboard"));
const QA = lazy(() => import("./pages/QA"));

// Simple page-level loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
  </div>
);

// Smart landing: redirect authenticated users to dashboard
const SmartLanding = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Seamless YouCan Embedded App Authentication
  if (searchParams.get('session') && searchParams.get('hmac')) {
    return <Navigate to={`/auth/youcan${location.search}`} replace />;
  }

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
      <ErrorBoundary>
        <PWAProvider>
          <LanguageProvider>
            <ShopifyAppBridgeProvider>
              <AuthContextWrapper>
              <TenantProvider>
                <CopilotProvider>
                  <CartProvider>
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
                          <Route path="/auth/youcan" element={<YouCanAuthRoute />} />

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
                          <Route path="/customizer" element={
                            <ProtectedRoute>
                                <StoreCustomizer />
                            </ProtectedRoute>
                          } />

                          <Route element={
                            <ProtectedRoute>
                              <BiometricLock>
                                <Layout />
                              </BiometricLock>
                            </ProtectedRoute>
                          }>
                            <Route path="/dashboard" element={<FeatureProtectedRoute feature="dashboard"><Dashboard /></FeatureProtectedRoute>} />
                            <Route path="/finances" element={<FeatureProtectedRoute feature="finances"><Finances /></FeatureProtectedRoute>} />
                            <Route path="/products" element={<FeatureProtectedRoute feature="products"><Products /></FeatureProtectedRoute>} />
                            <Route path="/orders" element={<FeatureProtectedRoute feature="orders"><Orders /></FeatureProtectedRoute>} />
                            <Route path="/customers" element={<FeatureProtectedRoute feature="customers"><Customers /></FeatureProtectedRoute>} />
                            <Route path="/planning" element={<FeatureProtectedRoute feature="planning"><Planning /></FeatureProtectedRoute>} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/team" element={<FeatureProtectedRoute feature="team"><Team /></FeatureProtectedRoute>} />
                            <Route path="/settings" element={<FeatureProtectedRoute feature="settings"><Settings /></FeatureProtectedRoute>} />
                            <Route path="/help" element={<Help />} />
                            <Route path="/warehouse" element={<FeatureProtectedRoute feature="warehouse"><Warehouse /></FeatureProtectedRoute>} />
                            <Route path="/support-ai" element={<SupportAI />} />
                            <Route path="/automations" element={<FeatureProtectedRoute feature="automations"><Automations /></FeatureProtectedRoute>} />
                            <Route path="/drivers" element={<FeatureProtectedRoute feature="drivers"><Drivers /></FeatureProtectedRoute>} />
                            <Route path="/hr" element={<FeatureProtectedRoute feature="hr"><HR /></FeatureProtectedRoute>} />
                            <Route path="/purchases" element={<FeatureProtectedRoute feature="purchases"><Purchases /></FeatureProtectedRoute>} />
                            <Route path="/returns" element={<FeatureProtectedRoute feature="returns"><Returns /></FeatureProtectedRoute>} />
                            <Route path="/marketing" element={<FeatureProtectedRoute feature="marketing"><Marketing /></FeatureProtectedRoute>} />
                            <Route path="/assets" element={<FeatureProtectedRoute feature="assets"><Assets /></FeatureProtectedRoute>} />
                            <Route path="/qa" element={<QA />} />
                          </Route>

                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                      <CookieBanner />
                      <ReloadPrompt />
                    </BrowserRouter>
                    </NotificationProvider>
                  </CartProvider>
                </CopilotProvider>
              </TenantProvider>
            </AuthContextWrapper>
          </ShopifyAppBridgeProvider>
        </LanguageProvider>
        </PWAProvider>
      </ErrorBoundary>
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
