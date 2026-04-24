import { describe, it, expect } from 'vitest';
import { getPermissions, canAccess, ROLE_PERMISSIONS } from '../../src/utils/rolePermissions.js';

// ── 1. OWNER (Admin) ─────────────────────────────────────────────────────────
describe('Rôle owner (Admin) — accès complet', () => {

    it('1a. Peut accéder aux commandes, finances, settings, drivers, HR', () => {
        expect(canAccess('owner', 'orders')).toBe(true);
        expect(canAccess('owner', 'finances')).toBe(true);
        expect(canAccess('owner', 'settings')).toBe(true);
        expect(canAccess('owner', 'drivers')).toBe(true);
        expect(canAccess('owner', 'hr')).toBe(true);
    });

    it('1b. Ne voit pas l\'interface driver (réservée aux livreurs)', () => {
        expect(canAccess('owner', 'deliveryApp')).toBe(false);
    });

});

// ── 2. STAFF ──────────────────────────────────────────────────────────────────
describe('Rôle staff — accès limité', () => {

    it('2a. Peut accéder aux commandes, produits, clients', () => {
        expect(canAccess('staff', 'orders')).toBe(true);
        expect(canAccess('staff', 'products')).toBe(true);
        expect(canAccess('staff', 'customers')).toBe(true);
    });

    it('2b. NE PEUT PAS accéder aux Finances', () => {
        // Source: Finances.jsx:29 → if (store?.role === 'staff') redirect
        expect(canAccess('staff', 'finances')).toBe(false);
    });

    it('2c. NE PEUT PAS accéder aux Settings', () => {
        // Source: Settings.jsx:548 → if (store?.role === 'staff') redirect
        expect(canAccess('staff', 'settings')).toBe(false);
    });

    it('2d. NE PEUT PAS accéder à la gestion Team', () => {
        // Source: Sidebar.jsx:68 → role !== 'staff' check
        expect(canAccess('staff', 'team')).toBe(false);
    });

    it('2e. NE PEUT PAS accéder aux RH', () => {
        expect(canAccess('staff', 'hr')).toBe(false);
    });

});

// ── 3. DRIVER ─────────────────────────────────────────────────────────────────
describe('Rôle driver — interface livreur uniquement', () => {

    it('3a. NE voit PAS les commandes admin', () => {
        expect(canAccess('driver', 'orders')).toBe(false);
    });

    it('3b. NE voit PAS les finances', () => {
        expect(canAccess('driver', 'finances')).toBe(false);
    });

    it('3c. NE voit PAS le dashboard admin', () => {
        expect(canAccess('driver', 'dashboard')).toBe(false);
    });

    it('3d. PEUT accéder à l\'interface DeliveryApp (son espace)', () => {
        expect(canAccess('driver', 'deliveryApp')).toBe(true);
    });

    it('3e. Aucun accès aux modules admin', () => {
        const adminModules = ['products', 'customers', 'settings', 'team', 'hr', 'purchases', 'marketing'];
        adminModules.forEach(module => {
            expect(canAccess('driver', module), `driver should not access ${module}`).toBe(false);
        });
    });

});

// ── 4. RÔLE INCONNU ───────────────────────────────────────────────────────────
describe('Rôle inconnu — comportement sécurisé', () => {

    it('4a. getPermissions() lève une erreur explicite', () => {
        expect(() => getPermissions('supervillain')).toThrow(/Unknown role/i);
    });

    it('4b. canAccess() avec rôle null lève une erreur', () => {
        expect(() => canAccess(null, 'finances')).toThrow(/Unknown role/i);
    });

    it('4c. canAccess() avec rôle undefined lève une erreur', () => {
        expect(() => canAccess(undefined, 'orders')).toThrow(/Unknown role/i);
    });

    it('4d. Le message d\'erreur liste les rôles valides', () => {
        try {
            getPermissions('hacker');
        } catch (e) {
            expect(e.message).toContain('owner');
            expect(e.message).toContain('staff');
            expect(e.message).toContain('driver');
        }
    });

});

// ── 5. CHANGEMENT DE RÔLE ─────────────────────────────────────────────────────
describe('Changement de rôle — les permissions s\'updatant dynamiquement', () => {

    it('5a. Staff → Owner : les permissions changent immédiatement', () => {
        let role = 'staff';

        // En tant que staff : pas accès aux finances
        expect(canAccess(role, 'finances')).toBe(false);
        expect(canAccess(role, 'settings')).toBe(false);

        // Passage au rôle owner (simule un reload du store avec le nouveau rôle)
        role = 'owner';

        // Maintenant accès complet
        expect(canAccess(role, 'finances')).toBe(true);
        expect(canAccess(role, 'settings')).toBe(true);
        expect(canAccess(role, 'hr')).toBe(true);
    });

    it('5b. Owner → Staff : l\'accès aux finances est retiré', () => {
        let role = 'owner';
        expect(canAccess(role, 'finances')).toBe(true);

        role = 'staff';
        expect(canAccess(role, 'finances')).toBe(false);
    });

    it('5c. Owner → Driver : seul deliveryApp reste accessible', () => {
        let role = 'owner';
        expect(canAccess(role, 'dashboard')).toBe(true);

        role = 'driver';
        expect(canAccess(role, 'dashboard')).toBe(false);
        expect(canAccess(role, 'deliveryApp')).toBe(true);
    });

    it('5d. getPermissions() retourne un objet différent selon le rôle', () => {
        const staffPerms = getPermissions('staff');
        const ownerPerms = getPermissions('owner');

        expect(staffPerms.finances).toBe(false);
        expect(ownerPerms.finances).toBe(true);
        expect(staffPerms).not.toEqual(ownerPerms);
    });

});

// ── 6. COHÉRENCE DE LA TABLE DES PERMISSIONS ─────────────────────────────────
describe('Cohérence de ROLE_PERMISSIONS', () => {

    it('6a. Tous les rôles ont les mêmes features définies', () => {
        const roles = Object.keys(ROLE_PERMISSIONS);
        const featureSets = roles.map(r => Object.keys(ROLE_PERMISSIONS[r]).sort());
        // Toutes les listes de features doivent être identiques
        featureSets.forEach(features => {
            expect(features).toEqual(featureSets[0]);
        });
    });

    it('6b. driver est le seul rôle avec deliveryApp = true', () => {
        const rolesWithDeliveryApp = Object.keys(ROLE_PERMISSIONS)
            .filter(r => ROLE_PERMISSIONS[r].deliveryApp === true);
        expect(rolesWithDeliveryApp).toEqual(['driver']);
    });

    it('6c. driver est le seul rôle sans accès au dashboard', () => {
        expect(ROLE_PERMISSIONS.driver.dashboard).toBe(false);
        expect(ROLE_PERMISSIONS.owner.dashboard).toBe(true);
        expect(ROLE_PERMISSIONS.staff.dashboard).toBe(true);
        expect(ROLE_PERMISSIONS.manager.dashboard).toBe(true);
    });

});
