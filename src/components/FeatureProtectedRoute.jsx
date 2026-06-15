import { Navigate } from "react-router-dom";
import { useTenant } from "../context/TenantContext";
import { canAccess } from "../utils/rolePermissions";

/**
 * FeatureProtectedRoute
 * 
 * Guards routes based on feature-level permissions from rolePermissions.js.
 * Works inside the Layout (after ProtectedRoute + BiometricLock).
 * 
 * Usage:
 *   <Route path="/finances" element={
 *     <FeatureProtectedRoute feature="finances">
 *       <Finances />
 *     </FeatureProtectedRoute>
 *   } />
 * 
 * @param {string} feature - Feature key from rolePermissions.js (e.g. 'finances', 'settings', 'team', 'hr')
 * @param {React.ReactNode} children - The page component to render if access is granted
 * @param {string} [fallback="/dashboard"] - Where to redirect if access is denied
 */
export default function FeatureProtectedRoute({ feature, children, fallback = "/dashboard" }) {
    const { store } = useTenant();
    
    // Determine user role from the store context
    const role = store?.role || 'owner'; // Default to 'owner' for store owners
    
    try {
        if (!canAccess(role, feature)) {
            return <Navigate to={fallback} replace />;
        }
    } catch (e) {
        // Unknown role — allow access (fail-open for unknown roles like super_admin)
        // super_admin and franchise_admin are handled by RoleProtectedRoute, not here
    }
    
    return children;
}
