import { describe, it, expect } from 'vitest';

const { 
    getUpcomingEvents, 
    getSeasonalFactor,
    MOROCCAN_CALENDAR_2026,
    MOROCCAN_SEASONALITY
} = require('../../functions/copilot/financialEngine');

describe('Moroccan Seasonality (Évolution 3)', () => {
    
    describe('getUpcomingEvents', () => {
        it('detects Ramadan when 10 days before start', () => {
            const events = getUpcomingEvents('2026-02-08', 30);
            const ramadan = events.find(e => e.event === 'ramadan');
            expect(ramadan).toBeDefined();
            expect(ramadan.daysUntil).toBe(10);
            expect(ramadan.isActive).toBe(false);
        });

        it('detects Ramadan as active during the event', () => {
            const events = getUpcomingEvents('2026-03-01', 30);
            const ramadan = events.find(e => e.event === 'ramadan');
            expect(ramadan).toBeDefined();
            expect(ramadan.isActive).toBe(true);
        });

        it('returns empty when no events in range', () => {
            const events = getUpcomingEvents('2026-07-15', 30);
            expect(events.length).toBe(0);
        });

        it('detects Black Friday approaching', () => {
            const events = getUpcomingEvents('2026-11-10', 30);
            const bf = events.find(e => e.event === 'blackFriday');
            expect(bf).toBeDefined();
            expect(bf.daysUntil).toBe(10);
        });

        it('detects multiple events when close together (Aïd al-Fitr after Ramadan)', () => {
            const events = getUpcomingEvents('2026-03-15', 15);
            expect(events.length).toBeGreaterThanOrEqual(1);
            // Both ramadan end and aidAlFitr should be detectable
        });
    });

    describe('getSeasonalFactor', () => {
        it('returns factor > 1 for matching category before event', () => {
            const result = getSeasonalFactor('vetements', '2026-02-10');
            expect(result.factor).toBeGreaterThan(1.0);
            expect(result.event).not.toBeNull();
            expect(result.event.label).toBe('Ramadan');
        });

        it('returns factor = 1.0 for non-matching category', () => {
            const result = getSeasonalFactor('electronique', '2026-02-10');
            // Electronique is not in Ramadan categories
            expect(result.factor).toBe(1.0);
        });

        it('returns full factor during the event', () => {
            const result = getSeasonalFactor('vetements', '2026-03-01');
            expect(result.factor).toBe(MOROCCAN_SEASONALITY.ramadan.factor);
        });

        it('returns factor 1.0 when no event within 30 days', () => {
            const result = getSeasonalFactor('vetements', '2026-07-15');
            expect(result.factor).toBe(1.0);
            expect(result.event).toBeNull();
        });

        it('returns factor 2.1 for all categories during Black Friday', () => {
            const result = getSeasonalFactor('random_category', '2026-11-25');
            // Black Friday applies to 'all' categories
            expect(result.factor).toBe(MOROCCAN_SEASONALITY.blackFriday.factor);
        });

        it('applies progressive ramp-up (lower factor when further away)', () => {
            const far = getSeasonalFactor('vetements', '2026-02-01'); // 17 days before Ramadan
            const close = getSeasonalFactor('vetements', '2026-02-15'); // 3 days before Ramadan
            expect(close.factor).toBeGreaterThan(far.factor);
        });

        it('handles empty/null category gracefully', () => {
            const result = getSeasonalFactor(null, '2026-11-25');
            // Black Friday has 'all' so should still match
            expect(result.factor).toBeGreaterThan(1.0);
        });
    });

    describe('Calendar data integrity', () => {
        it('all events have valid date ranges', () => {
            for (const [key, event] of Object.entries(MOROCCAN_CALENDAR_2026)) {
                const start = new Date(event.start);
                const end = new Date(event.end);
                expect(start.getTime()).toBeLessThanOrEqual(end.getTime());
                expect(event.label).toBeTruthy();
            }
        });

        it('all seasonality events have matching calendar entries', () => {
            for (const key of Object.keys(MOROCCAN_SEASONALITY)) {
                expect(MOROCCAN_CALENDAR_2026[key]).toBeDefined();
            }
        });

        it('all factors are between 1.0 and 3.0', () => {
            for (const [, event] of Object.entries(MOROCCAN_SEASONALITY)) {
                expect(event.factor).toBeGreaterThanOrEqual(1.0);
                expect(event.factor).toBeLessThanOrEqual(3.0);
            }
        });
    });
});
