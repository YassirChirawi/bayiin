/**
 * rolePermissions.js
 * Single source of truth for role-based access control in BayIIn.
 *
 * Roles hierarchy:
 *  - owner    → full access (owns the store)
 *  - manager  → same as owner within a store (no system-level access)
 *  - staff    → orders + customers + products only, no finances/settings
 *  - driver   → delivery app only, no dashboard access
 *
 * This module is intentionally dependency-free so it can be unit-tested.
 */

/**
 * Permission map per role.
 * Each key is a feature; value is true if the role can access it.
 */
export const ROLE_PERMISSIONS = {
    owner: {
        dashboard:  true,
        orders:     true,
        products:   true,
        customers:  true,
        finances:   true,
        settings:   true,
        team:       true,
        drivers:    true,
        hr:         true,
        purchases:  true,
        returns:    true,
        marketing:  true,
        warehouse:  true,
        automations: true,
        planning:   true,
        assets:     true,
        // Driver-only interface
        deliveryApp: false,
    },
    manager: {
        dashboard:  true,
        orders:     true,
        products:   true,
        customers:  true,
        finances:   true,
        settings:   true,
        team:       true,
        drivers:    true,
        hr:         true,
        purchases:  true,
        returns:    true,
        marketing:  true,
        warehouse:  true,
        automations: true,
        planning:   true,
        assets:     true,
        deliveryApp: false,
    },
    staff: {
        dashboard:  true,
        orders:     true,
        products:   true,
        customers:  true,
        finances:   false,   // ← Blocked (confirmed in Finances.jsx:29)
        settings:   false,   // ← Blocked (confirmed in Settings.jsx:548)
        team:       false,   // ← Blocked (confirmed in Sidebar.jsx:68)
        drivers:    true,
        hr:         false,
        purchases:  true,
        returns:    true,
        marketing:  true,
        warehouse:  true,
        automations: true,
        planning:   true,
        assets:     true,
        deliveryApp: false,
    },
    driver: {
        dashboard:  false,
        orders:     false,   // no admin order view
        products:   false,
        customers:  false,
        finances:   false,
        settings:   false,
        team:       false,
        drivers:    false,
        hr:         false,
        purchases:  false,
        returns:    false,
        marketing:  false,
        warehouse:  false,
        automations: false,
        planning:   false,
        assets:     false,
        deliveryApp: true,   // ← Only access
    },
};

/**
 * Get the full permission set for a given role.
 *
 * @param {string} role - 'owner' | 'manager' | 'staff' | 'driver'
 * @returns {{ [feature: string]: boolean }}
 * @throws {Error} if the role is not recognized
 */
export const getPermissions = (role) => {
    if (!role || !ROLE_PERMISSIONS[role]) {
        throw new Error(`Unknown role: "${role}". Allowed: ${Object.keys(ROLE_PERMISSIONS).join(', ')}`);
    }
    return ROLE_PERMISSIONS[role];
};

/**
 * Check if a specific role can access a specific feature.
 *
 * @param {string} role    - Role name
 * @param {string} feature - Feature key (e.g. 'finances')
 * @returns {boolean}
 */
export const canAccess = (role, feature) => {
    const perms = getPermissions(role);
    return perms[feature] === true;
};
