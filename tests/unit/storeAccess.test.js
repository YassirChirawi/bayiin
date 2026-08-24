import { describe, it, expect } from 'vitest';
import { getStoreAccess, TRIAL_DAYS } from '../../src/utils/storeAccess';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

describe('getStoreAccess', () => {
    it('returns inactive/unknown for null store', () => {
        const a = getStoreAccess(null);
        expect(a.active).toBe(false);
        expect(a.status).toBe('unknown');
    });

    it('suspended blocks everything — even a paid plan', () => {
        const a = getStoreAccess({ plan: 'pro', subscriptionStatus: 'active', suspended: true });
        expect(a.active).toBe(false);
        expect(a.status).toBe('suspended');
    });

    it('testerMode grants full access', () => {
        const a = getStoreAccess({ plan: 'free', testerMode: true, createdAt: daysAgo(400) });
        expect(a.active).toBe(true);
        expect(a.status).toBe('tester');
    });

    it('paid plan is active; canceled/expired is blocked', () => {
        expect(getStoreAccess({ plan: 'pro' }).active).toBe(true);
        expect(getStoreAccess({ plan: 'unlimited', subscriptionStatus: 'canceled' }).active).toBe(false);
        expect(getStoreAccess({ plan: 'pro', subscriptionStatus: 'expired' }).status).toBe('expired');
    });

    it('past_due honors a 7-day grace window from currentPeriodEnd', () => {
        const inGrace = Math.floor(Date.now() / 1000) - 2 * 86400; // ended 2d ago, within 7d grace
        const outGrace = Math.floor(Date.now() / 1000) - 10 * 86400; // ended 10d ago, past grace
        expect(getStoreAccess({ plan: 'pro', subscriptionStatus: 'past_due', currentPeriodEnd: inGrace }).active).toBe(true);
        expect(getStoreAccess({ plan: 'pro', subscriptionStatus: 'past_due', currentPeriodEnd: outGrace }).active).toBe(false);
    });

    it('active_promo grants full access on a free plan', () => {
        const a = getStoreAccess({ plan: 'free', subscriptionStatus: 'active_promo', createdAt: daysAgo(400) });
        expect(a.active).toBe(true);
        expect(a.status).toBe('promo');
    });

    it('free plan is active within the trial window and blocked after', () => {
        const fresh = getStoreAccess({ plan: 'free', createdAt: daysAgo(5) });
        expect(fresh.active).toBe(true);
        expect(fresh.status).toBe('trial');
        expect(fresh.daysLeft).toBe(TRIAL_DAYS - 5);

        const old = getStoreAccess({ plan: 'free', createdAt: daysAgo(TRIAL_DAYS + 3) });
        expect(old.active).toBe(false);
        expect(old.status).toBe('expired');
    });

    it('trialEndsAt overrides the createdAt+30 computation (support extension)', () => {
        // Created 40d ago (trial normally over) but support extended 10d into the future.
        const a = getStoreAccess({ plan: 'free', createdAt: daysAgo(40), trialEndsAt: daysAhead(10).toISOString() });
        expect(a.active).toBe(true);
        expect(a.status).toBe('trial');
    });

    it('missing createdAt does not block (safety)', () => {
        expect(getStoreAccess({ plan: 'free' }).active).toBe(true);
    });
});
