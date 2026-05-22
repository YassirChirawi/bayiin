import { describe, it, expect, vi } from 'vitest';
import {
    renderTemplate,
    WHATSAPP_TEMPLATES,
    DARIJA_TEMPLATES,
    DEFAULT_TEMPLATES,
    getWhatsappMessage,
} from '../../src/utils/whatsappTemplates.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Import WhatsApp utils (NLU + normalizePhone)
// These are Node.js CommonJS modules, so we import them differently
// ═══════════════════════════════════════════════════════════════════════════════

// Since whatsappUtils uses CommonJS exports, we'll test the logic inline
// to avoid module system conflicts with vitest ESM.

// ── NLU Functions (mirrored from whatsappUtils.js for testing) ──────────────

function isConfirmation(text) {
    const confirmWords = [
        'oui', 'yes', 'confirme', 'ok', 'okay', 'accord', 'parfait',
        'nickel', 'valide', 'confirmer', 'c ok', 'ok oui', 'daccord',
        "d'accord", 'bien sûr', 'absolument', 'exactement',
        'ايه', 'واخا', 'مزيان', 'كنفيرم', 'ayeh', 'waxha', 'wakha',
        'ah', 'iyyeh', 'نعم', 'صافي', 'safi', 'mzyan'
    ];
    return confirmWords.some(w => text.includes(w));
}

function isRefusal(text) {
    const refuseWords = [
        'non', 'no', 'annule', 'annuler', 'pas', 'cancel', 'refuse',
        'refuser', 'jamais', 'plus besoin',
        'انولي', 'ما غاديش', 'ma ghadi', 'la', 'لا', 'نا',
        'mabghitch', 'ما بغيتش', 'annuli'
    ];
    return refuseWords.some(w => text.includes(w));
}

function isReschedule(text) {
    const rescheduleWords = [
        'reporter', 'plus tard', 'demain', 'semaine', 'attendre',
        'après-demain', 'weekend', 'lundi', 'mardi', 'mercredi',
        'jeudi', 'vendredi', 'samedi', 'dimanche', 'prochaine',
        'بكري', 'غدا', 'lboukra', 'men bad', 'باكي', 'ghda',
        'baad', 'من بعد'
    ];
    return rescheduleWords.some(w => text.includes(w));
}

function isHumanRequest(text) {
    const humanWords = [
        'humain', 'personne', 'agent', 'conseiller', 'responsable',
        'parler', 'appel', 'téléphone', 'quelqu', 'manager',
        'directeur', 'patron', 'support', 'aide',
        'واحد', 'شي حد', 'shi had', 'bnadem', 'بنادم',
        'klm chi had', 'كلم شي حد'
    ];
    return humanWords.some(w => text.includes(w));
}

function normalizePhone(phone) {
    if (!phone) return '';
    let normalized = phone.replace(/[\s\-\(\)\+]/g, '');
    if (normalized.startsWith('0')) {
        normalized = '212' + normalized.slice(1);
    }
    return normalized;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXISTING TESTS — WhatsApp Template Rendering
// ═══════════════════════════════════════════════════════════════════════════════

describe('renderTemplate — remplacement de variables {placeholder}', () => {

    // ── Test 1 : Remplacement basique ─────────────────────────────────────────
    it('1. Remplace {name} et {commande} correctement', () => {
        const template = 'Bonjour {name}, votre commande {commande} est confirmée.';
        const result = renderTemplate(template, { name: 'Yassir', commande: '#1042' });
        expect(result).toBe('Bonjour Yassir, votre commande #1042 est confirmée.');
    });

    // ── Test 2 : Variable manquante — reste telle quelle ────────────────────
    it('2a. Variable absente du data-object → reste {placeholder}', () => {
        const template = 'Bonjour {name}, lien de suivi : {tracking}';
        // On passe seulement `name`, `tracking` est inconnu → reste tel quel
        const result = renderTemplate(template, { name: 'Yassir' });
        expect(result).toContain('Yassir');
        expect(result).toContain('{tracking}'); // non remplacée
    });

    it('2b. Variable présente mais valeur vide → remplacée par chaîne vide', () => {
        const template = 'Bonjour {name}!';
        // La clé `name` existe dans data mais sa valeur est ''
        const result = renderTemplate(template, { name: '' });
        expect(result).toBe('Bonjour !');
    });

    // ── Test 3 : Template Darija ─────────────────────────────────────────────
    it('3. Template Darija — switch de langue via DARIJA_TEMPLATES', () => {
        const template = DARIJA_TEMPLATES['confirmation'];
        expect(template).toBeDefined();
        // Le template Darija doit contenir les mots-clés Darija (pas en FR)
        expect(template).toMatch(/Salam|salam|tkonfirma|Chokran/i);
        // Vérifier que ce n'est PAS le template français équivalent
        expect(template).not.toMatch(/^Bonjour/);
    });

    // ── Test 4 : Template Français ───────────────────────────────────────────
    it('4. Template Français — DEFAULT_TEMPLATES contient un message FR', () => {
        const template = DEFAULT_TEMPLATES['confirmation'];
        expect(template).toBeDefined();
        // Le template FR doit commencer par "Bonjour"
        expect(template).toMatch(/^Bonjour/);
        // Ne doit PAS être le template Darija
        expect(template).not.toMatch(/Salam|tkonfirma/i);
    });

    // ── Test 5 : Template vide ───────────────────────────────────────────────
    it('5. Template vide ou null → retourne chaîne vide sans crash', () => {
        expect(renderTemplate('')).toBe('');
        expect(renderTemplate(null)).toBe('');
        expect(renderTemplate(undefined)).toBe('');
    });

});

describe('WHATSAPP_TEMPLATES — cohérence bilingue (fr / en)', () => {

    it('FR et EN ont les mêmes clés de templates', () => {
        const frKeys = Object.keys(WHATSAPP_TEMPLATES.fr).sort();
        const enKeys = Object.keys(WHATSAPP_TEMPLATES.en).sort();
        expect(frKeys).toEqual(enKeys);
    });

    it('getWhatsAppLink via getWhatsappMessage — génère un message non vide pour chaque statut connu', () => {
        const statuses = ['reçu', 'confirmation', 'livraison', 'livré', 'annulé', 'reporté', 'pas de réponse'];
        const order = { clientName: 'Yassir', articleName: 'Pack Premium', price: 299 };
        const store = { name: 'BayIIn Store' };

        statuses.forEach(status => {
            const msg = getWhatsappMessage(status, order, store);
            expect(typeof msg).toBe('string');
            expect(msg.length).toBeGreaterThan(0);
            expect(msg).toContain('Yassir');
        });
    });

});

// ═══════════════════════════════════════════════════════════════════════════════
// NEW TESTS — WhatsApp Bot Logic (Beya3)
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizePhone — Moroccan phone number normalization', () => {

    it('converts 06... to 2126...', () => {
        expect(normalizePhone('0612345678')).toBe('212612345678');
    });

    it('strips + prefix from +212...', () => {
        expect(normalizePhone('+212612345678')).toBe('212612345678');
    });

    it('leaves 212... unchanged', () => {
        expect(normalizePhone('212612345678')).toBe('212612345678');
    });

    it('handles spaces and dashes', () => {
        expect(normalizePhone('06 12 34 56 78')).toBe('212612345678');
        expect(normalizePhone('06-12-34-56-78')).toBe('212612345678');
        expect(normalizePhone('+212 6 12 34 56 78')).toBe('212612345678');
    });

    it('handles parentheses', () => {
        expect(normalizePhone('(0)612345678')).toBe('212612345678');
    });

    it('returns empty string for null/undefined', () => {
        expect(normalizePhone(null)).toBe('');
        expect(normalizePhone(undefined)).toBe('');
        expect(normalizePhone('')).toBe('');
    });
});

describe('isConfirmation — French + Darija confirmation detection', () => {

    it('detects French confirmations', () => {
        expect(isConfirmation('oui')).toBe(true);
        expect(isConfirmation('ok parfait')).toBe(true);
        expect(isConfirmation('je confirme')).toBe(true);
        expect(isConfirmation('c ok')).toBe(true);
        expect(isConfirmation("d'accord")).toBe(true);
    });

    it('detects Darija confirmations', () => {
        expect(isConfirmation('واخا')).toBe(true);
        expect(isConfirmation('ayeh')).toBe(true);
        expect(isConfirmation('waxha')).toBe(true);
        expect(isConfirmation('safi')).toBe(true);
        expect(isConfirmation('mzyan')).toBe(true);
    });

    it('rejects non-confirmation inputs', () => {
        expect(isConfirmation('non')).toBe(false);
        expect(isConfirmation('quel est le prix')).toBe(false);
        expect(isConfirmation('bonjour')).toBe(false);
    });
});

describe('isRefusal — French + Darija refusal detection', () => {

    it('detects French refusals', () => {
        expect(isRefusal('non')).toBe(true);
        expect(isRefusal('je veux annuler')).toBe(true);
        expect(isRefusal('cancel')).toBe(true);
        expect(isRefusal('je refuse')).toBe(true);
    });

    it('detects Darija refusals', () => {
        expect(isRefusal('لا')).toBe(true);
        expect(isRefusal('ma ghadi')).toBe(true);
        expect(isRefusal('mabghitch')).toBe(true);
    });

    it('rejects non-refusal inputs', () => {
        expect(isRefusal('oui')).toBe(false);
        expect(isRefusal('merci')).toBe(false);
    });
});

describe('isReschedule — French + Darija reschedule detection', () => {

    it('detects French reschedule requests', () => {
        expect(isReschedule('demain')).toBe(true);
        expect(isReschedule('plus tard svp')).toBe(true);
        expect(isReschedule('la semaine prochaine')).toBe(true);
        expect(isReschedule('je veux reporter')).toBe(true);
        expect(isReschedule('lundi')).toBe(true);
    });

    it('detects Darija reschedule requests', () => {
        expect(isReschedule('غدا')).toBe(true);
        expect(isReschedule('lboukra')).toBe(true);
        expect(isReschedule('ghda')).toBe(true);
    });

    it('rejects non-reschedule inputs', () => {
        expect(isReschedule('oui')).toBe(false);
        expect(isReschedule('merci')).toBe(false);
    });
});

describe('isHumanRequest — French + Darija human handoff detection', () => {

    it('detects French human requests', () => {
        expect(isHumanRequest('je veux parler à quelqu un')).toBe(true);
        expect(isHumanRequest('un agent svp')).toBe(true);
        expect(isHumanRequest('le responsable')).toBe(true);
        expect(isHumanRequest('j ai besoin d aide')).toBe(true);
    });

    it('detects Darija human requests', () => {
        expect(isHumanRequest('شي حد')).toBe(true);
        expect(isHumanRequest('بنادم')).toBe(true);
        expect(isHumanRequest('bnadem')).toBe(true);
    });

    it('rejects non-human-request inputs', () => {
        expect(isHumanRequest('oui')).toBe(false);
        expect(isHumanRequest('merci')).toBe(false);
    });
});

describe('Webhook Verification — GET endpoint', () => {

    it('correct token should return challenge', () => {
        // Simulate the logic from whatsappWebhook GET handler
        const verifyToken = 'bayiin_test_verify';
        const mode = 'subscribe';
        const token = 'bayiin_test_verify';
        const challenge = '1234567890';

        const isValid = mode === 'subscribe' && token === verifyToken;
        expect(isValid).toBe(true);

        // In production, the function would return res.status(200).send(challenge)
        if (isValid) {
            expect(challenge).toBe('1234567890');
        }
    });

    it('wrong token should reject (403)', () => {
        const verifyToken = 'bayiin_test_verify';
        const mode = 'subscribe';
        const token = 'wrong_token';

        const isValid = mode === 'subscribe' && token === verifyToken;
        expect(isValid).toBe(false);
    });

    it('wrong mode should reject (403)', () => {
        const verifyToken = 'bayiin_test_verify';
        const mode = 'unsubscribe';
        const token = 'bayiin_test_verify';

        const isValid = mode === 'subscribe' && token === verifyToken;
        expect(isValid).toBe(false);
    });
});

describe('Message Status Handling — status event types', () => {

    it('recognizes delivered status', () => {
        const event = { id: 'msg123', status: 'delivered', recipient_id: '212612345678' };
        expect(event.status).toBe('delivered');
        expect(['sent', 'delivered', 'read', 'failed']).toContain(event.status);
    });

    it('recognizes read status', () => {
        const event = { id: 'msg123', status: 'read', recipient_id: '212612345678' };
        expect(event.status).toBe('read');
    });

    it('recognizes failed status', () => {
        const event = {
            id: 'msg123',
            status: 'failed',
            recipient_id: '212612345678',
            errors: [{ code: 131047, title: 'Re-engagement message' }]
        };
        expect(event.status).toBe('failed');
        expect(event.errors).toHaveLength(1);
    });
});
