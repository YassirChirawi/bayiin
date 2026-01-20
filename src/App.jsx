import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Finances from "./pages/Finances";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { TenantProvider } from "./context/TenantContext";

import Landing from "./pages/Landing";
import DemoDashboard from "./pages/DemoDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import { HelmetProvider } from 'react-helmet-async';
import { useAnalytics } from './hooks/useAnalytics';

// Navigation Tracker Component
const AnalyticsTracker = () => {
  useAnalytics();
  return null;
};

function App() {
  return (
    <HelmetProvider>
      <AuthContextWrapper>
        <TenantProvider>
          <BrowserRouter>
            <AnalyticsTracker />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/demo" element={<DemoDashboard />} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/finances" element={<Finances />} />
                <Route path="/products" element={<Products />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TenantProvider>
      </AuthContextWrapper>
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
