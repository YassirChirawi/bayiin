import { describe, it, expect } from 'vitest';
import { computeSubscriptionFinance } from '../../src/utils/subscriptionFinance';
import { planPrice } from '../../src/config/pricing';

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

describe('computeSubscriptionFinance', () => {
    it('sums MRR only from actively paying stores, by plan', () => {
        const stores = [
            { plan: 'pro' },                                  // paid → 99
            { plan: 'pro' },                                  // paid → 99
            { plan: 'unlimited' },                            // paid → 199
            { plan: 'pro', subscriptionStatus: 'canceled' },  // expired → 0
            { plan: 'free', createdAt: daysAgo(2) },          // trial → 0
        ];
        const f = computeSubscriptionFinance(stores);
        expect(f.mrr).toBe(planPrice('pro') * 2 + planPrice('unlimited'));
        expect(f.activePaying).toBe(3);
        expect(f.arr).toBe(f.mrr * 12);
        expect(f.byPlan.pro.count).toBe(2);
        expect(f.byPlan.unlimited.count).toBe(1);
    });

    it('classifies trials, promo, testers, expired, suspended without counting revenue', () => {
        const stores = [
            { plan: 'free', createdAt: daysAgo(2) },                       // trial
            { plan: 'free', createdAt: daysAgo(28) },                      // trial, expiring ≤7d
            { plan: 'free', subscriptionStatus: 'active_promo' },          // promo
            { plan: 'free', testerMode: true },                           // tester
            { plan: 'free', createdAt: daysAgo(40) },                      // expired
            { plan: 'pro', suspended: true },                             // suspended
        ];
        const f = computeSubscriptionFinance(stores);
        expect(f.mrr).toBe(0);
        expect(f.trials).toBe(2);
        expect(f.trialsExpiring7d).toBe(1);
        expect(f.promoCount).toBe(1);
        expect(f.testers).toBe(1);
        expect(f.expired).toBe(1);
        expect(f.suspended).toBe(1);
    });

    it('forecast adds the converted fraction of the trial pipeline', () => {
        const stores = [
            { plan: 'pro' },                          // mrr 99
            { plan: 'free', createdAt: daysAgo(1) },  // trial
            { plan: 'free', createdAt: daysAgo(1) },  // trial
        ];
        const f = computeSubscriptionFinance(stores, { conversionRate: 0.5 });
        expect(f.trials).toBe(2);
        expect(f.trialPipelineValue).toBe(2 * planPrice('pro'));
        // 99 + (2*99)*0.5 = 99 + 99 = 198
        expect(f.forecastMrr).toBe(planPrice('pro') + Math.round(2 * planPrice('pro') * 0.5));
    });

    it('handles an empty portfolio safely', () => {
        const f = computeSubscriptionFinance([]);
        expect(f.mrr).toBe(0);
        expect(f.arpu).toBe(0);
        expect(f.forecastMrr).toBe(0);
    });
});
