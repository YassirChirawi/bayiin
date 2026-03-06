import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Finances from "./pages/Finances";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import Automations from "./pages/Automations"; // NEW
import Help from "./pages/Help"; // NEW
import NotFound from "./pages/NotFound"; // NEW
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute"; // NEW
import Layout from "./components/Layout";
import { TenantProvider } from "./context/TenantContext";
import BiometricLock from "./components/BiometricLock"; // NEW
import { useAuth } from "./context/AuthContext"; // NEW for Redirect

// New Component for Smart Redirect
const SmartLanding = () => {
  const { user, loading } = useAuth();
  if (loading) return null; // Or a spinner
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
};

import Landing from "./pages/Landing";
import DemoDashboard from "./pages/DemoDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PublicCatalog from "./pages/PublicCatalog"; // NEW
import Planning from "./pages/Planning"; // NEW
import FranchiseDashboard from "./pages/FranchiseDashboard"; // NEW
import DeliveryApp from "./pages/DeliveryApp"; // NEW
import Drivers from "./pages/Drivers"; // NEW
import DriverApplication from "./pages/DriverApplication"; // NEW

import { HelmetProvider } from 'react-helmet-async';
import { useAnalytics } from './hooks/useAnalytics';
import { Toaster } from 'react-hot-toast';

// Navigation Tracker Component
const AnalyticsTracker = () => {
  useAnalytics();
  return null;
};

import { LanguageProvider } from "./context/LanguageContext"; // NEW
import CookieBanner from "./components/CookieBanner"; // NEW
import { CopilotProvider } from "./context/CopilotContext"; // NEW
import { NotificationProvider } from "./context/NotificationContext"; // NEW
import SupportAI from "./pages/SupportAI"; // NEW
import ErrorBoundary from "./components/ErrorBoundary"; // NEW

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
                          color: '#15803d', // green-700
                          border: '1px solid #bbf7d0', // green-200
                          padding: '16px',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          fontWeight: 500,
                        },
                        iconTheme: {
                          primary: '#22c55e',
                          secondary: '#fff',
                        },
                        duration: 4000,
                      },
                      error: {
                        style: {
                          background: 'white',
                          color: '#b91c1c', // red-700
                          border: '1px solid #fecaca', // red-200
                          padding: '16px',
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Stronger shadow for errors
                          fontWeight: 600,
                        },
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#fff',
                        },
                        duration: 5000, // Stay longer
                      },
                    }}
                  />
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<SmartLanding />} /> {/* Modified */}
                      {/* Public Routes */}
                      <Route path="/catalog/:storeId" element={<PublicCatalog />} /> {/* NEW */}
                      <Route path="/delivery/:token" element={<DeliveryApp />} /> {/* NEW — no auth */}
                      <Route path="/apply/driver/:storeId" element={<DriverApplication />} /> {/* NEW — public */}

                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/demo" element={<DemoDashboard />} />
                      <Route path="/admin" element={
                        <RoleProtectedRoute allowedRoles={['super_admin']}>
                          <BiometricLock>
                            <AdminDashboard />
                          </BiometricLock>
                        </RoleProtectedRoute>
                      } />
                      <Route path="/franchise" element={
                        <RoleProtectedRoute allowedRoles={['super_admin', 'franchise_admin']}>
                          <BiometricLock>
                            <FranchiseDashboard />
                          </BiometricLock>
                        </RoleProtectedRoute>
                      } /> {/* NEW */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/onboarding" element={
                        <ProtectedRoute>
                          <Onboarding />
                        </ProtectedRoute>
                      } />
                      <Route element={
                        <ProtectedRoute>
                          <BiometricLock> {/* Protected by Lock */}
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
                        <Route path="/support-ai" element={<SupportAI />} /> {/* NEW */}
                        <Route path="/automations" element={<Automations />} /> {/* NEW */}
                        <Route path="/drivers" element={<Drivers />} /> {/* NEW */}
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
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
  )
}

export default App;
