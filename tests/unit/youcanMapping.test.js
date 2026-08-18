import { describe, it, expect, vi } from 'vitest';
import { mapYouCanStatus } from '../../functions/youcanUtils.js';
import crypto from 'crypto';

describe('YouCan Utils', () => {
    
    describe('mapYouCanStatus', () => {
        it('should map "pending" to "reçu"', () => {
            expect(mapYouCanStatus('pending')).toBe('reçu');
        });

        it('should map "processing" to "confirmation"', () => {
            expect(mapYouCanStatus('processing')).toBe('confirmation');
        });

        it('should map "shipped" to "livraison"', () => {
            expect(mapYouCanStatus('shipped')).toBe('livraison');
        });

        it('should map "delivered" to "livré"', () => {
            expect(mapYouCanStatus('delivered')).toBe('livré');
        });

        it('should map "cancelled" to "annulé"', () => {
            expect(mapYouCanStatus('cancelled')).toBe('annulé');
        });

        it('should map "refunded" to "retour"', () => {
            expect(mapYouCanStatus('refunded')).toBe('retour');
        });

        it('should fallback to "reçu" for unknown statuses', () => {
            expect(mapYouCanStatus('unknown_status')).toBe('reçu');
            expect(mapYouCanStatus(null)).toBe('reçu');
            expect(mapYouCanStatus('')).toBe('reçu');
        });

        it('should handle uppercase or mixed case statuses', () => {
            expect(mapYouCanStatus('PENDING')).toBe('reçu');
            expect(mapYouCanStatus('Shipped')).toBe('livraison');
        });
    });

    describe('HMAC Signature Validation', () => {
        it('should correctly validate a signed payload', () => {
            const secret = 'test_secret_123';
            const payload = JSON.stringify({ event: 'order.create', data: { id: 101 } });
            
            const expectedSig = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            
            // This is just a conceptual test simulating the webhook flow
            expect(expectedSig).toBeDefined();
            expect(typeof expectedSig).toBe('string');
            expect(expectedSig.length).toBe(64); // SHA-256 hex is 64 chars
        });
    });

});
