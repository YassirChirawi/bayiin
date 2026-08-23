import { describe, it, expect } from 'vitest';
import { isValidTransition, canMarkPaid, PAYMENT_BLOCKED_STATUSES, getAvailableTransitions } from '../../src/utils/orderStateMachine';
import { ORDER_STATUS } from '../../src/utils/constants';

describe('isValidTransition', () => {
    it('création (from null) toujours valide', () => {
        expect(isValidTransition(null, ORDER_STATUS.RECEIVED)).toBe(true);
    });
    it('idempotent (même statut)', () => {
        expect(isValidTransition(ORDER_STATUS.SHIPPING, ORDER_STATUS.SHIPPING)).toBe(true);
    });
    it('transitions valides connues', () => {
        expect(isValidTransition(ORDER_STATUS.RECEIVED, ORDER_STATUS.CONFIRMED)).toBe(true);
        expect(isValidTransition(ORDER_STATUS.SHIPPING, ORDER_STATUS.DELIVERED)).toBe(true);
        expect(isValidTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURNED)).toBe(true);
    });
    it('transitions invalides rejetées', () => {
        expect(isValidTransition(ORDER_STATUS.DELIVERED, ORDER_STATUS.NO_ANSWER)).toBe(false);
        expect(isValidTransition(ORDER_STATUS.RETURNED, ORDER_STATUS.SHIPPING)).toBe(false);
        expect(isValidTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED)).toBe(false);
    });
});

describe('canMarkPaid — intégrité de paiement', () => {
    it('statuts encaissables → true', () => {
        for (const s of [ORDER_STATUS.RECEIVED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKING,
            ORDER_STATUS.RAMASSAGE, ORDER_STATUS.SHIPPING, ORDER_STATUS.DELIVERED, ORDER_STATUS.POSTPONED]) {
            expect(canMarkPaid({ status: s })).toBe(true);
        }
    });
    it('statuts non encaissables → false', () => {
        for (const s of [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.RETURN_IN_PROGRESS,
            ORDER_STATUS.NO_ANSWER, ORDER_STATUS.PENDING_CATALOG]) {
            expect(canMarkPaid({ status: s })).toBe(false);
        }
    });
    it('commande absente → false', () => {
        expect(canMarkPaid(null)).toBe(false);
        expect(canMarkPaid(undefined)).toBe(false);
    });
    it('PAYMENT_BLOCKED_STATUSES contient bien les 5 statuts non encaissables', () => {
        expect(PAYMENT_BLOCKED_STATUSES).toEqual(expect.arrayContaining([
            'annulé', 'retour', 'retour en cours', 'pas de réponse', 'pending_catalog',
        ]));
        // et n'inclut PAS les statuts actifs
        expect(PAYMENT_BLOCKED_STATUSES).not.toContain('livré');
        expect(PAYMENT_BLOCKED_STATUSES).not.toContain('reçu');
    });
});

describe('getAvailableTransitions', () => {
    it('renvoie les transitions déclarées', () => {
        expect(getAvailableTransitions(ORDER_STATUS.RECEIVED)).toContain(ORDER_STATUS.CANCELLED);
    });
    it('statut terminal retour → aucune transition', () => {
        expect(getAvailableTransitions(ORDER_STATUS.RETURNED)).toEqual([]);
    });
});
